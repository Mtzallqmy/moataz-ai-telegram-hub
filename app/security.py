import base64, hashlib, hmac
from cryptography.fernet import Fernet
from fastapi import HTTPException, Request
from .config import settings

def _fernet() -> Fernet:
    if settings.encryption_key:
        key = settings.encryption_key.encode()
    else:
        key = base64.urlsafe_b64encode(hashlib.sha256(settings.session_secret.encode()).digest())
    return Fernet(key)

def encrypt(value: str) -> str: return _fernet().encrypt(value.encode()).decode()
def decrypt(value: str) -> str: return _fernet().decrypt(value.encode()).decode()
def require_admin(request: Request):
    if not request.session.get("admin"):
        raise HTTPException(401, "يلزم تسجيل الدخول")
def check_password(value: str) -> bool:
    return hmac.compare_digest(value.encode(), settings.admin_password.encode())

