import json, time
import httpx
from fastapi import HTTPException
from sqlalchemy import select
from .db import Provider, SessionLocal
from .security import decrypt

def normalize_base(url: str) -> str:
    url = url.rstrip("/")
    return url if url.endswith("/v1") else url + "/v1"

async def chat(messages: list[dict], provider_name: str | None = None, model: str | None = None, stream: bool = False):
    with SessionLocal() as db:
        q = select(Provider).where(Provider.enabled.is_(True))
        if provider_name: q = q.where(Provider.name == provider_name)
        provider = db.scalar(q.order_by(Provider.id))
        if not provider: raise HTTPException(503, "لا يوجد مزود مفعّل")
        key, base, chosen = decrypt(provider.api_key_encrypted), normalize_base(provider.base_url), model or provider.default_model
    if not chosen: raise HTTPException(422, "حدد النموذج الافتراضي للمزود")
    payload = {"model": chosen, "messages": messages, "stream": False}
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            res = await client.post(f"{base}/chat/completions", headers={"Authorization": f"Bearer {key}", "Content-Type":"application/json"}, json=payload)
        if res.status_code >= 400:
            detail = res.text[:600]
            raise HTTPException(502, f"فشل المزود ({res.status_code}): {detail}")
        return res.json(), provider.name
    except httpx.TimeoutException: raise HTTPException(504, "انتهت مهلة اتصال المزود")
    except httpx.RequestError as exc: raise HTTPException(502, f"تعذر الاتصال بالمزود: {exc}")

async def test_provider(base_url: str, api_key: str):
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{normalize_base(base_url)}/models", headers={"Authorization": f"Bearer {api_key}"})
    return {"ok": r.is_success, "status": r.status_code, "detail": r.text[:400] if not r.is_success else "تم الاتصال بنجاح", "models": [x.get("id") for x in r.json().get("data", [])][:30] if r.is_success else []}

