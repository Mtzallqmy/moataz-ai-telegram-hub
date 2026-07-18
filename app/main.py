from pathlib import Path
import mimetypes, secrets
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy import select
from starlette.middleware.sessions import SessionMiddleware
from .ai import chat, test_provider
from .config import settings
from .db import AuditLog, Provider, SessionLocal
from .security import check_password, decrypt, encrypt, require_admin
from .telegram import handle_update, tg

app = FastAPI(title=settings.app_name, version="1.0.0", docs_url="/api/docs", redoc_url=None)
app.add_middleware(SessionMiddleware, secret_key=settings.session_secret, same_site="lax", https_only=settings.app_url.startswith("https"))
BASE = Path(__file__).parent
app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")
templates = Jinja2Templates(directory=BASE / "templates")

def log(level, source, message):
    with SessionLocal() as db: db.add(AuditLog(level=level, source=source, message=message[:2000])); db.commit()

@app.get("/health")
def health(): return {"status":"ok","service":settings.app_name}

@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request):
    if not request.session.get("admin"): return RedirectResponse("/login")
    with SessionLocal() as db:
        providers = db.scalars(select(Provider).order_by(Provider.id.desc())).all()
        logs = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(20)).all()
    return templates.TemplateResponse(request, "dashboard.html", {"providers":providers,"logs":logs,"app_name":settings.app_name,"app_url":settings.app_url})

@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request): return templates.TemplateResponse(request, "login.html", {"error":None,"app_name":settings.app_name})

@app.post("/login", response_class=HTMLResponse)
def login(request: Request, username: str=Form(...), password: str=Form(...)):
    if secrets.compare_digest(username, settings.admin_username) and check_password(password):
        request.session["admin"] = True; return RedirectResponse("/", 303)
    return templates.TemplateResponse(request, "login.html", {"error":"بيانات الدخول غير صحيحة","app_name":settings.app_name}, status_code=401)

@app.post("/logout")
def logout(request: Request): request.session.clear(); return RedirectResponse("/login", 303)

@app.get("/api/providers")
def providers(request: Request):
    require_admin(request)
    with SessionLocal() as db: return [{"id":p.id,"name":p.name,"base_url":p.base_url,"default_model":p.default_model,"enabled":p.enabled,"masked_key":"••••"+decrypt(p.api_key_encrypted)[-4:]} for p in db.scalars(select(Provider)).all()]

@app.post("/api/providers")
def save_provider(request: Request, name: str=Form(...), base_url: str=Form(...), api_key: str=Form(...), default_model: str=Form("")):
    require_admin(request)
    with SessionLocal() as db:
        p = db.scalar(select(Provider).where(Provider.name==name))
        if p: p.base_url=base_url; p.default_model=default_model; p.api_key_encrypted=encrypt(api_key) if api_key else p.api_key_encrypted
        else: db.add(Provider(name=name,base_url=base_url,api_key_encrypted=encrypt(api_key),default_model=default_model))
        db.commit()
    log("INFO","providers",f"تم حفظ المزود {name}"); return RedirectResponse("/#providers",303)

@app.delete("/api/providers/{provider_id}")
def delete_provider(provider_id: int, request: Request):
    require_admin(request)
    with SessionLocal() as db:
        p=db.get(Provider,provider_id)
        if not p: raise HTTPException(404,"المزود غير موجود")
        db.delete(p); db.commit()
    return {"ok":True}

class ProviderTest(BaseModel): base_url: str; api_key: str
@app.post("/api/providers/test")
async def provider_test(body: ProviderTest, request: Request): require_admin(request); return await test_provider(body.base_url, body.api_key)

class ChatBody(BaseModel): message: str; provider: str|None=None; model: str|None=None
@app.post("/api/chat")
async def web_chat(body: ChatBody, request: Request):
    require_admin(request); data, provider=await chat([{"role":"user","content":body.message}],body.provider,body.model); return {"answer":data["choices"][0]["message"]["content"],"provider":provider,"usage":data.get("usage")}

@app.post("/v1/chat/completions")
async def compatible_chat(request: Request):
    auth=request.headers.get("authorization","")
    if auth != f"Bearer {settings.session_secret}": raise HTTPException(401,"Invalid API key")
    body=await request.json(); data,_=await chat(body.get("messages",[]),body.get("provider"),body.get("model")); return data

@app.post("/api/files")
async def upload_file(request: Request, file: UploadFile=File(...)):
    require_admin(request); content=await file.read(settings.max_upload_mb*1024*1024+1)
    if len(content)>settings.max_upload_mb*1024*1024: raise HTTPException(413,"الملف أكبر من الحد المسموح")
    safe=Path(file.filename or "file").name
    target=(Path(settings.workspace_dir)/safe).resolve(); root=Path(settings.workspace_dir).resolve()
    if root not in target.parents: raise HTTPException(400,"اسم ملف غير صالح")
    target.write_bytes(content); log("INFO","files",f"تم رفع {safe}"); return {"ok":True,"name":safe,"size":len(content)}

@app.get("/api/files")
def list_files(request: Request): require_admin(request); return [{"name":p.name,"size":p.stat().st_size} for p in Path(settings.workspace_dir).iterdir() if p.is_file()]

@app.get("/api/files/{name}")
def download_file(name: str, request: Request): require_admin(request); p=Path(settings.workspace_dir)/Path(name).name; return FileResponse(p) if p.is_file() else JSONResponse({"detail":"غير موجود"},404)

@app.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    if request.headers.get("X-Telegram-Bot-Api-Secret-Token") != settings.telegram_webhook_secret: raise HTTPException(403,"Forbidden")
    await handle_update(await request.json()); return {"ok":True}

@app.post("/api/telegram/setup")
async def setup_telegram(request: Request):
    require_admin(request); url=f"{settings.app_url.rstrip('/')}/telegram/webhook"
    result=await tg("setWebhook",{"url":url,"secret_token":settings.telegram_webhook_secret,"allowed_updates":["message","callback_query"]})
    await tg("setMyCommands",{"commands":[{"command":"start","description":"بدء البوت"},{"command":"help","description":"المساعدة"}]})
    log("INFO","telegram",str(result)); return result
