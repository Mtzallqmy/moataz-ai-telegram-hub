import json
from urllib.parse import urlsplit, urlunsplit
import httpx
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from .db import Provider, SessionLocal
from .security import decrypt, validate_provider_target

PROVIDER_PRESETS = {
    "openai": {"name": "OpenAI", "base_url": "https://api.openai.com", "model": "gpt-4o-mini"},
    "openrouter": {"name": "OpenRouter", "base_url": "https://openrouter.ai/api", "model": "openai/gpt-4o-mini"},
    "groq": {"name": "Groq", "base_url": "https://api.groq.com/openai", "model": "llama-3.3-70b-versatile"},
    "together": {"name": "Together AI", "base_url": "https://api.together.xyz", "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo"},
    "deepseek": {"name": "DeepSeek", "base_url": "https://api.deepseek.com", "model": "deepseek-chat"},
    "mistral": {"name": "Mistral AI", "base_url": "https://api.mistral.ai", "model": "mistral-small-latest"},
    "cerebras": {"name": "Cerebras", "base_url": "https://api.cerebras.ai", "model": "llama-3.3-70b"},
    "xai": {"name": "xAI", "base_url": "https://api.x.ai", "model": "grok-3-mini"},
    "anthropic": {"name": "Anthropic", "base_url": "https://api.anthropic.com", "model": "claude-3-5-haiku-latest"},
    "gemini": {"name": "Google Gemini", "base_url": "https://generativelanguage.googleapis.com", "model": "gemini-2.0-flash"},
    "custom": {"name": "مزود مخصص", "base_url": "", "model": ""},
}

PASSTHROUGH_FIELDS = {
    "temperature", "top_p", "max_tokens", "max_completion_tokens", "stop",
    "frequency_penalty", "presence_penalty", "seed", "tools", "tool_choice",
    "response_format", "reasoning_effort", "parallel_tool_calls", "user",
}

def _generation_options(options: dict | None) -> dict:
    return {k:v for k,v in (options or {}).items() if k in PASSTHROUGH_FIELDS and v is not None}

def _anthropic_payload(messages: list[dict], model: str, options: dict | None = None, stream: bool = False) -> dict:
    opts=_generation_options(options)
    system="\n".join(str(m.get("content","")) for m in messages if m.get("role")=="system")
    converted=[{"role":m.get("role") if m.get("role") in {"user","assistant"} else "user","content":m.get("content","")} for m in messages if m.get("role")!="system"]
    payload={"model":model,"max_tokens":opts.get("max_tokens") or opts.get("max_completion_tokens") or 4096,"messages":converted,"stream":stream}
    if system: payload["system"]=system
    for key in ("temperature","top_p","stop"):
        if key in opts: payload["stop_sequences" if key=="stop" else key]=opts[key] if isinstance(opts[key],list) or key!="stop" else [opts[key]]
    tools=[]
    for tool in opts.get("tools",[]):
        fn=tool.get("function",{}) if tool.get("type")=="function" else tool
        if fn.get("name"): tools.append({"name":fn["name"],"description":fn.get("description",""),"input_schema":fn.get("parameters",{"type":"object","properties":{}})})
    if tools: payload["tools"]=tools
    return payload

def _gemini_payload(messages: list[dict], options: dict | None = None) -> dict:
    opts=_generation_options(options)
    payload={"contents":[{"role":"model" if m.get("role")=="assistant" else "user","parts":[{"text":str(m.get("content",""))}]} for m in messages if m.get("role")!="system"]}
    systems=[str(m.get("content","")) for m in messages if m.get("role")=="system"]
    if systems: payload["systemInstruction"]={"parts":[{"text":"\n".join(systems)}]}
    config={}
    mapping={"temperature":"temperature","top_p":"topP","max_tokens":"maxOutputTokens","max_completion_tokens":"maxOutputTokens","stop":"stopSequences"}
    for source,target in mapping.items():
        if source in opts: config[target]=opts[source] if source!="stop" or isinstance(opts[source],list) else [opts[source]]
    if config: payload["generationConfig"]=config
    return payload

def _select_provider(db, provider_name: str | None = None, model: str | None = None):
    base=select(Provider).where(Provider.enabled.is_(True))
    if provider_name: return db.scalar(base.where(Provider.name==provider_name).order_by(Provider.id))
    if model:
        matched=db.scalar(base.where(Provider.default_model==model).order_by(Provider.id))
        if matched: return matched
    return db.scalar(base.order_by(Provider.id))

def normalize_base(url: str) -> str:
    """Normalize a dashboard URL, base URL, or full endpoint to an API v1 root."""
    value = url.strip().rstrip("/")
    if not value.startswith(("http://", "https://")):
        raise ValueError("Base URL must start with http:// or https://")
    parts = urlsplit(value)
    path = parts.path.rstrip("/")
    for suffix in ("/chat/completions", "/models", "/responses", "/completions"):
        if path.endswith(suffix): path = path[:-len(suffix)].rstrip("/")
    segments = [x for x in path.split("/") if x]
    if "v1" in segments: segments = segments[:segments.index("v1") + 1]
    elif not segments or segments[-1] != "v1": segments.append("v1")
    return urlunsplit((parts.scheme, parts.netloc, "/" + "/".join(segments), "", "")).rstrip("/")

def _chat_endpoint(base_url: str) -> str:
    raw=base_url.strip().rstrip("/")
    path=urlsplit(raw).path.rstrip("/")
    if path.endswith("/chat/completions"): return raw
    return f"{normalize_base(raw)}/chat/completions"

def _endpoint_from_chat(base_url: str, endpoint: str) -> str:
    raw=base_url.strip().rstrip("/")
    parts=urlsplit(raw); path=parts.path.rstrip("/")
    if path.endswith("/chat/completions"):
        path=path[:-len("/chat/completions")]+"/"+endpoint.lstrip("/")
        return urlunsplit((parts.scheme,parts.netloc,path,"","")).rstrip("/")
    return f"{normalize_base(raw)}/{endpoint.lstrip('/')}"

def _auth_headers(base_url: str, api_key: str) -> dict:
    host=urlsplit(base_url).netloc.lower()
    if host.endswith(".openai.azure.com") or "azure-api.net" in host:
        return {"api-key":api_key,"Content-Type":"application/json","Accept":"application/json"}
    return {"Authorization":f"Bearer {api_key}","Content-Type":"application/json","Accept":"application/json"}

def _model_endpoints(base_url: str) -> list[str]:
    raw = base_url.strip().rstrip("/")
    parts=urlsplit(raw); path=parts.path.rstrip("/")
    if path.endswith("/models"): primary=raw
    elif path.endswith("/chat/completions"):
        primary=urlunsplit((parts.scheme,parts.netloc,path[:-len("/chat/completions")]+"/models","","")).rstrip("/")
    else: primary = f"{normalize_base(raw)}/models"
    candidates = [primary]
    parts = urlsplit(raw)
    direct = urlunsplit((parts.scheme, parts.netloc, parts.path.rstrip("/") + "/models", "", ""))
    root_v1 = urlunsplit((parts.scheme, parts.netloc, "/v1/models", "", ""))
    for item in (direct, root_v1):
        if item not in candidates: candidates.append(item)
    return candidates

def _parse_models(payload) -> list[str]:
    """Parse common OpenAI-compatible, Gemini and vendor-specific model lists."""
    found: list[str] = []
    def add(value):
        if isinstance(value, str) and value.strip(): found.append(value.strip().removeprefix("models/"))
        elif isinstance(value, dict):
            for key in ("id", "model", "name", "slug", "model_id"):
                if isinstance(value.get(key), str): add(value[key]); break
    def walk(node, depth=0):
        if depth > 4: return
        if isinstance(node, list):
            for item in node: add(item)
        elif isinstance(node, dict):
            for key in ("data", "models", "items", "results", "result"):
                if key in node: walk(node[key], depth + 1)
    walk(payload)
    return list(dict.fromkeys(x for x in found if x))[:300]

async def _probe_inference(base_url: str, api_key: str, model: str) -> dict:
    if not model: return {"attempted":False,"ok":False,"detail":"لم يحدد نموذج لاختبار التوليد"}
    raw = base_url.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
            if "anthropic.com" in raw:
                r=await client.post(f"{raw}/v1/messages",headers={"x-api-key":api_key,"anthropic-version":"2023-06-01","content-type":"application/json"},json={"model":model,"max_tokens":1,"messages":[{"role":"user","content":"Reply OK"}]})
            elif "generativelanguage.googleapis.com" in raw:
                r=await client.post(f"{raw}/v1beta/models/{model}:generateContent",params={"key":api_key},json={"contents":[{"role":"user","parts":[{"text":"Reply OK"}]}],"generationConfig":{"maxOutputTokens":1}})
            else:
                r=await client.post(_chat_endpoint(raw),headers=_auth_headers(raw,api_key),json={"model":model,"messages":[{"role":"user","content":"Reply OK"}],"max_tokens":1,"stream":False})
        return {"attempted":True,"ok":r.is_success,"status":r.status_code,"detail":"نجح طلب توليد حقيقي" if r.is_success else r.text[:350]}
    except httpx.RequestError as exc: return {"attempted":True,"ok":False,"status":502,"detail":str(exc)}

async def chat(messages: list[dict], provider_name: str | None = None, model: str | None = None, stream: bool = False, options: dict | None = None):
    with SessionLocal() as db:
        provider = _select_provider(db,provider_name,model)
        if not provider: raise HTTPException(503, "لا يوجد مزود مفعّل")
        key, raw_base, chosen = decrypt(provider.api_key_encrypted), provider.base_url.rstrip("/"), model or provider.default_model
    if not chosen: raise HTTPException(422, "حدد النموذج الافتراضي للمزود")
    await validate_provider_target(raw_base)
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            if "anthropic.com" in raw_base:
                payload = _anthropic_payload(messages,chosen,options)
                res = await client.post(f"{raw_base}/v1/messages", headers={"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"}, json=payload)
            elif "generativelanguage.googleapis.com" in raw_base:
                payload = _gemini_payload(messages,options)
                res = await client.post(f"{raw_base}/v1beta/models/{chosen}:generateContent", params={"key":key}, json=payload)
            else:
                payload = {"model":chosen,"messages":messages,"stream":False,**_generation_options(options)}
                res = await client.post(_chat_endpoint(raw_base),headers=_auth_headers(raw_base,key),json=payload)
        if res.status_code >= 400:
            detail = res.text[:600]
            raise HTTPException(502, f"فشل المزود ({res.status_code}): {detail}")
        try: data = res.json()
        except ValueError: raise HTTPException(502,"المزود أعاد استجابة غير JSON")
        if "anthropic.com" in raw_base:
            text = "".join(x.get("text","") for x in data.get("content",[]) if x.get("type")=="text")
            data = {"id":data.get("id"),"object":"chat.completion","model":data.get("model",chosen),"choices":[{"index":0,"message":{"role":"assistant","content":text},"finish_reason":data.get("stop_reason")}],"usage":data.get("usage",{})}
        elif "generativelanguage.googleapis.com" in raw_base:
            candidates=data.get("candidates",[]); parts=candidates[0].get("content",{}).get("parts",[]) if candidates else []
            text="".join(x.get("text","") for x in parts)
            data={"id":"gemini-response","object":"chat.completion","model":chosen,"choices":[{"index":0,"message":{"role":"assistant","content":text},"finish_reason":candidates[0].get("finishReason") if candidates else None}],"usage":data.get("usageMetadata",{})}
        elif not isinstance(data.get("choices"),list) or not data.get("choices"):
            raise HTTPException(502,"استجابة المزود لا تتبع OpenAI-compatible: الحقل choices مفقود")
        return data, provider.name
    except httpx.TimeoutException: raise HTTPException(504, "انتهت مهلة اتصال المزود")
    except httpx.RequestError as exc: raise HTTPException(502, f"تعذر الاتصال بالمزود: {exc}")

async def test_provider(base_url: str, api_key: str, default_model: str = ""):
    started = __import__("time").perf_counter()
    try:
        raw_base = base_url.rstrip("/")
        await validate_provider_target(raw_base)
        attempted=[]; r=None; best_response=None
        async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
            if "anthropic.com" in raw_base:
                endpoint=f"{raw_base}/v1/models"; attempted.append(endpoint)
                r = await client.get(endpoint, headers={"x-api-key":api_key,"anthropic-version":"2023-06-01"})
            elif "generativelanguage.googleapis.com" in raw_base:
                endpoint=f"{raw_base}/v1beta/models"; attempted.append(endpoint)
                r = await client.get(endpoint, params={"key":api_key})
            else:
                for endpoint in _model_endpoints(raw_base):
                    attempted.append(endpoint)
                    r = await client.get(endpoint,headers=_auth_headers(raw_base,api_key))
                    if r.is_success:
                        best_response = r
                        try:
                            if _parse_models(r.json()): break
                        except ValueError: pass
                    if r.status_code not in {404,405,200}: break
                if best_response is not None and (r is None or not r.is_success): r=best_response
        latency = round((__import__("time").perf_counter() - started) * 1000)
        models = []
        if r.is_success:
            try:
                body=r.json()
                if "generativelanguage.googleapis.com" in raw_base:
                    models=[x.get("name","").removeprefix("models/") for x in body.get("models",[]) if "generateContent" in x.get("supportedGenerationMethods",[])][:300]
                else: models = _parse_models(body)
            except (ValueError, AttributeError): pass
        inference={"attempted":False,"ok":False}
        if not models and default_model: inference=await _probe_inference(raw_base,api_key,default_model)
        ok=bool(models) or bool(inference.get("ok"))
        if models: detail=f"تم التحقق من المفتاح وجلب {len(models)} نموذجاً حقيقياً"
        elif inference.get("ok"): detail="المزود لا يعرض قائمة نماذج، لكن نجح اختبار توليد حقيقي بالنموذج الافتراضي"
        elif r.is_success: detail="استجاب endpoint النماذج، لكن الاستجابة لا تحتوي معرّفات نماذج قابلة للاستخدام"
        else: detail=r.text[:500]
        return {"ok":ok,"connection_ok":r.is_success,"status":r.status_code,"latency_ms":latency,"detail":detail,"models":models,"models_count":len(models),"attempted_endpoints":attempted,"inference":inference,"response_type":r.headers.get("content-type","")}
    except httpx.TimeoutException:
        return {"ok": False, "status": 504, "detail": "انتهت مهلة الاتصال بالمزود", "models": []}
    except ValueError as exc:
        return {"ok":False,"connection_ok":False,"status":422,"detail":str(exc),"models":[],"models_count":0,"attempted_endpoints":[],"inference":{"attempted":False,"ok":False}}
    except httpx.RequestError as exc:
        return {"ok": False, "status": 502, "detail": f"تعذر الوصول إلى المزود: {exc}", "models": []}

async def stream_chat(messages: list[dict], provider_name: str | None = None, model: str | None = None, options: dict | None = None):
    with SessionLocal() as db:
        provider = _select_provider(db,provider_name,model)
        if not provider: raise HTTPException(503, "لا يوجد مزود مفعّل")
        key, base, chosen = decrypt(provider.api_key_encrypted), provider.base_url.rstrip("/"), model or provider.default_model
    await validate_provider_target(base)
    def chunk(text="",finish=None,chunk_id="stream"):
        return "data: "+json.dumps({"id":chunk_id,"object":"chat.completion.chunk","model":chosen,"choices":[{"index":0,"delta":{"content":text} if text else {},"finish_reason":finish}]},ensure_ascii=False)+"\n\n"
    if "anthropic.com" in base:
        async def anthropic_relay():
            payload=_anthropic_payload(messages,chosen,options,stream=True)
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("POST",f"{base}/v1/messages",headers={"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"},json=payload) as response:
                    if response.status_code>=400:
                        detail=(await response.aread()).decode(errors="replace")[:500]; yield "data: "+json.dumps({"error":{"message":detail}},ensure_ascii=False)+"\n\n"; return
                    async for line in response.aiter_lines():
                        if not line.startswith("data: "): continue
                        try: event=json.loads(line[6:])
                        except ValueError: continue
                        if event.get("type")=="content_block_delta" and event.get("delta",{}).get("type")=="text_delta": yield chunk(event["delta"].get("text",""),chunk_id=event.get("message",{}).get("id","anthropic-stream"))
                        elif event.get("type")=="message_stop": yield chunk(finish="stop"); yield "data: [DONE]\n\n"
        return StreamingResponse(anthropic_relay(),media_type="text/event-stream",headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})
    if "generativelanguage.googleapis.com" in base:
        async def gemini_relay():
            payload=_gemini_payload(messages,options)
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("POST",f"{base}/v1beta/models/{chosen}:streamGenerateContent",params={"key":key,"alt":"sse"},json=payload) as response:
                    if response.status_code>=400:
                        detail=(await response.aread()).decode(errors="replace")[:500]; yield "data: "+json.dumps({"error":{"message":detail}},ensure_ascii=False)+"\n\n"; return
                    async for line in response.aiter_lines():
                        if not line.startswith("data: "): continue
                        try: event=json.loads(line[6:])
                        except ValueError: continue
                        candidates=event.get("candidates",[]); parts=candidates[0].get("content",{}).get("parts",[]) if candidates else []
                        text="".join(p.get("text","") for p in parts); finish=candidates[0].get("finishReason") if candidates else None
                        if text: yield chunk(text,chunk_id="gemini-stream")
                        if finish: yield chunk(finish=str(finish).lower(),chunk_id="gemini-stream")
                    yield "data: [DONE]\n\n"
        return StreamingResponse(gemini_relay(),media_type="text/event-stream",headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})
    async def relay():
        payload={"model":chosen,"messages":messages,"stream":True,**_generation_options(options)}
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST",_chat_endpoint(base),headers=_auth_headers(base,key),json=payload) as response:
                if response.status_code >= 400:
                    detail=(await response.aread()).decode(errors="replace")[:500]
                    yield "data: " + json.dumps({"error":{"message":detail}},ensure_ascii=False) + "\n\n"; return
                async for line in response.aiter_lines():
                    if line: yield line+"\n\n"
    return StreamingResponse(relay(),media_type="text/event-stream",headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})

async def proxy_openai(endpoint: str, body: dict, provider_name: str | None = None):
    with SessionLocal() as db:
        provider=_select_provider(db,provider_name,body.get("model"))
        if not provider: raise HTTPException(503,"لا يوجد مزود مفعّل")
        key,base=decrypt(provider.api_key_encrypted),provider.base_url.rstrip("/")
    await validate_provider_target(base)
    if "anthropic.com" in base or "generativelanguage.googleapis.com" in base: raise HTTPException(422,f"{endpoint} غير مدعوم أصلياً بواسطة هذا المزود")
    async with httpx.AsyncClient(timeout=90) as client:
        response=await client.post(_endpoint_from_chat(base,endpoint),headers=_auth_headers(base,key),json=body)
    if response.status_code>=400: raise HTTPException(502,f"فشل المزود ({response.status_code}): {response.text[:600]}")
    return response.json()
