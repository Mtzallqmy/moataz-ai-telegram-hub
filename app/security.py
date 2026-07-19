import asyncio, base64, hashlib, hmac, ipaddress, socket
from urllib.parse import urlsplit
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException, Request
from .config import settings

def _derived(value: str) -> bytes:
    return base64.urlsafe_b64encode(hashlib.sha256(value.encode()).digest())

def _fernets() -> list[Fernet]:
    """Accept a real Fernet key or safely derive one from a strong secret.

    The session-secret fallback also keeps records readable when an installation
    initially ran without ENCRYPTION_KEY and adds one later.
    """
    raw = settings.encryption_key.strip() or settings.session_secret
    keys: list[bytes] = []
    try:
        Fernet(raw.encode())
        keys.append(raw.encode())
    except (ValueError, TypeError):
        keys.append(_derived(raw))
    fallback = _derived(settings.session_secret)
    if fallback not in keys: keys.append(fallback)
    return [Fernet(key) for key in keys]

def encrypt(value: str) -> str: return _fernets()[0].encrypt(value.encode()).decode()
def decrypt(value: str) -> str:
    for cipher in _fernets():
        try: return cipher.decrypt(value.encode()).decode()
        except (InvalidToken, ValueError): continue
    raise HTTPException(422, "تعذر فك مفتاح المزود لأن سر التشفير تغيّر؛ عدّل المزود وأدخل API Key من جديد")

def encryption_status() -> dict:
    raw = settings.encryption_key.strip()
    placeholder = raw in {"generate-with-python-command-in-readme", "change-me", ""}
    return {"ok": not placeholder, "detail": "مفتاح مستقل مضبوط" if not placeholder else "يعمل بالاشتقاق الآمن، لكن يُنصح بوضع سر عشوائي طويل في ENCRYPTION_KEY"}
def require_admin(request: Request):
    if not request.session.get("admin"):
        raise HTTPException(401, "يلزم تسجيل الدخول")
def ensure_csrf(request: Request) -> str:
    token=request.session.get("csrf_token")
    if not token:
        token=__import__("secrets").token_urlsafe(32);request.session["csrf_token"]=token
    return token
def require_admin_write(request: Request):
    require_admin(request)
    expected=request.session.get("csrf_token",""); supplied=request.headers.get("x-csrf-token","")
    if not expected or not supplied or not hmac.compare_digest(expected,supplied): raise HTTPException(403,"رمز حماية الطلب غير صالح؛ حدّث الصفحة وحاول مجدداً")
def validate_form_csrf(request: Request, token: str):
    require_admin(request); expected=request.session.get("csrf_token","")
    if not expected or not token or not hmac.compare_digest(expected,token): raise HTTPException(403,"رمز حماية النموذج غير صالح")
def check_password(value: str) -> bool:
    return hmac.compare_digest(value.encode(), settings.admin_password.encode())

async def validate_provider_target(url: str):
    parts=urlsplit(url.strip())
    schemes={"https","http"} if settings.allow_insecure_provider_urls else {"https"}
    if parts.scheme not in schemes: raise HTTPException(422,"Base URL يجب أن يستخدم HTTPS")
    if not parts.hostname: raise HTTPException(422,"Base URL لا يحتوي اسم نطاق صالحاً")
    if settings.allow_private_provider_urls: return
    try: addresses=await asyncio.to_thread(socket.getaddrinfo,parts.hostname,parts.port or 443,type=socket.SOCK_STREAM)
    except socket.gaierror as exc: raise HTTPException(422,f"تعذر حل نطاق المزود: {exc}")
    for item in addresses:
        ip=ipaddress.ip_address(item[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast: raise HTTPException(422,"عناوين الشبكات الخاصة أو المحلية محظورة لحماية الخادم")
