import base64, hashlib, hmac
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
def check_password(value: str) -> bool:
    return hmac.compare_digest(value.encode(), settings.admin_password.encode())
