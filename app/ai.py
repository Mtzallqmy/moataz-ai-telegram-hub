import httpx
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from .db import Provider, SessionLocal
from .security import decrypt

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

def normalize_base(url: str) -> str:
    url = url.rstrip("/")
    return url if url.endswith("/v1") else url + "/v1"

async def chat(messages: list[dict], provider_name: str | None = None, model: str | None = None, stream: bool = False):
    with SessionLocal() as db:
        q = select(Provider).where(Provider.enabled.is_(True))
        if provider_name: q = q.where(Provider.name == provider_name)
        provider = db.scalar(q.order_by(Provider.id))
        if not provider: raise HTTPException(503, "لا يوجد مزود مفعّل")
        key, raw_base, chosen = decrypt(provider.api_key_encrypted), provider.base_url.rstrip("/"), model or provider.default_model
    if not chosen: raise HTTPException(422, "حدد النموذج الافتراضي للمزود")
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            if "anthropic.com" in raw_base:
                system = "\n".join(str(m.get("content", "")) for m in messages if m.get("role") == "system")
                converted = [{"role": m.get("role", "user") if m.get("role") in {"user","assistant"} else "user", "content": m.get("content", "")} for m in messages if m.get("role") != "system"]
                payload = {"model":chosen,"max_tokens":4096,"messages":converted}
                if system: payload["system"] = system
                res = await client.post(f"{raw_base}/v1/messages", headers={"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"}, json=payload)
            elif "generativelanguage.googleapis.com" in raw_base:
                contents = [{"role":"model" if m.get("role")=="assistant" else "user","parts":[{"text":str(m.get("content",""))}]} for m in messages if m.get("role") != "system"]
                payload = {"contents":contents}
                systems = [str(m.get("content","")) for m in messages if m.get("role") == "system"]
                if systems: payload["systemInstruction"] = {"parts":[{"text":"\n".join(systems)}]}
                res = await client.post(f"{raw_base}/v1beta/models/{chosen}:generateContent", params={"key":key}, json=payload)
            else:
                payload = {"model": chosen, "messages": messages, "stream": False}
                res = await client.post(f"{normalize_base(raw_base)}/chat/completions", headers={"Authorization": f"Bearer {key}", "Content-Type":"application/json"}, json=payload)
        if res.status_code >= 400:
            detail = res.text[:600]
            raise HTTPException(502, f"فشل المزود ({res.status_code}): {detail}")
        data = res.json()
        if "anthropic.com" in raw_base:
            text = "".join(x.get("text","") for x in data.get("content",[]) if x.get("type")=="text")
            data = {"id":data.get("id"),"object":"chat.completion","model":data.get("model",chosen),"choices":[{"index":0,"message":{"role":"assistant","content":text},"finish_reason":data.get("stop_reason")}],"usage":data.get("usage",{})}
        elif "generativelanguage.googleapis.com" in raw_base:
            candidates=data.get("candidates",[]); parts=candidates[0].get("content",{}).get("parts",[]) if candidates else []
            text="".join(x.get("text","") for x in parts)
            data={"id":"gemini-response","object":"chat.completion","model":chosen,"choices":[{"index":0,"message":{"role":"assistant","content":text},"finish_reason":candidates[0].get("finishReason") if candidates else None}],"usage":data.get("usageMetadata",{})}
        return data, provider.name
    except httpx.TimeoutException: raise HTTPException(504, "انتهت مهلة اتصال المزود")
    except httpx.RequestError as exc: raise HTTPException(502, f"تعذر الاتصال بالمزود: {exc}")

async def test_provider(base_url: str, api_key: str):
    started = __import__("time").perf_counter()
    try:
        raw_base = base_url.rstrip("/")
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            if "anthropic.com" in raw_base:
                r = await client.get(f"{raw_base}/v1/models", headers={"x-api-key":api_key,"anthropic-version":"2023-06-01"})
            elif "generativelanguage.googleapis.com" in raw_base:
                r = await client.get(f"{raw_base}/v1beta/models", params={"key":api_key})
            else:
                r = await client.get(f"{normalize_base(raw_base)}/models", headers={"Authorization": f"Bearer {api_key}"})
        latency = round((__import__("time").perf_counter() - started) * 1000)
        models = []
        if r.is_success:
            try:
                body=r.json()
                if "generativelanguage.googleapis.com" in raw_base: models=[x.get("name","").removeprefix("models/") for x in body.get("models",[]) if "generateContent" in x.get("supportedGenerationMethods",[])][:100]
                else: models = [x.get("id") for x in body.get("data", []) if x.get("id")][:100]
            except (ValueError, AttributeError): pass
        return {"ok": r.is_success, "status": r.status_code, "latency_ms": latency, "detail": "تم الاتصال وجلب النماذج" if r.is_success else r.text[:500], "models": models}
    except httpx.TimeoutException:
        return {"ok": False, "status": 504, "detail": "انتهت مهلة الاتصال بالمزود", "models": []}
    except httpx.RequestError as exc:
        return {"ok": False, "status": 502, "detail": f"تعذر الوصول إلى المزود: {exc}", "models": []}

async def stream_chat(messages: list[dict], provider_name: str | None = None, model: str | None = None):
    with SessionLocal() as db:
        q = select(Provider).where(Provider.enabled.is_(True))
        if provider_name: q = q.where(Provider.name == provider_name)
        provider = db.scalar(q.order_by(Provider.id))
        if not provider: raise HTTPException(503, "لا يوجد مزود مفعّل")
        key, base, chosen = decrypt(provider.api_key_encrypted), provider.base_url.rstrip("/"), model or provider.default_model
    if "anthropic.com" in base or "generativelanguage.googleapis.com" in base:
        data, _ = await chat(messages, provider_name, chosen)
        import json
        async def native_once():
            chunk={"id":data.get("id"),"object":"chat.completion.chunk","model":chosen,"choices":[{"index":0,"delta":{"role":"assistant","content":data["choices"][0]["message"]["content"]},"finish_reason":None}]}
            yield f"data: {json.dumps(chunk,ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(native_once(), media_type="text/event-stream")
    async def relay():
        payload={"model":chosen,"messages":messages,"stream":True}
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST",f"{normalize_base(base)}/chat/completions",headers={"Authorization":f"Bearer {key}","Content-Type":"application/json"},json=payload) as response:
                if response.status_code >= 400:
                    detail=(await response.aread()).decode(errors="replace")[:500]
                    yield f"data: {{\"error\":{{\"message\":{detail!r}}}}}\n\n"; return
                async for line in response.aiter_lines():
                    if line: yield line+"\n\n"
    return StreamingResponse(relay(),media_type="text/event-stream",headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})
