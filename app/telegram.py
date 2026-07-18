import html
import httpx
from .ai import chat
from .config import settings

API = "https://api.telegram.org/bot"
async def tg(method: str, data: dict):
    if not settings.telegram_bot_token: return {"ok": False, "description": "Bot token missing"}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{API}{settings.telegram_bot_token}/{method}", json=data)
        return r.json()

def keyboard():
    return {"inline_keyboard": [[{"text":"💬 محادثة جديدة","callback_data":"new"},{"text":"🧠 المزودات","callback_data":"providers"}], [{"text":"🌐 فتح لوحة التحكم","url":settings.app_url}]]}

async def handle_update(update: dict):
    message = update.get("message") or update.get("callback_query", {}).get("message")
    if not message: return
    chat_id = message["chat"]["id"]
    user_id = (update.get("message", {}).get("from") or update.get("callback_query", {}).get("from") or {}).get("id")
    if settings.allowed_users and user_id not in settings.allowed_users:
        await tg("sendMessage", {"chat_id":chat_id,"text":"⛔ هذا البوت خاص وغير مصرح لك باستخدامه."}); return
    callback = update.get("callback_query")
    if callback:
        await tg("answerCallbackQuery", {"callback_query_id":callback["id"]})
        text = "أرسل رسالتك الآن وسأجيب عبر المزود الافتراضي." if callback["data"] == "new" else "يمكن إدارة المزودات واختبارها من لوحة الويب."
        await tg("sendMessage", {"chat_id":chat_id,"text":text,"reply_markup":keyboard()}); return
    text = message.get("text", "")
    if text.startswith("/start") or text.startswith("/help"):
        await tg("sendMessage", {"chat_id":chat_id,"text":"مرحباً بك في Moataz AI Hub ✨\n\nأرسل أي سؤال أو استخدم الأزرار.","reply_markup":keyboard()}); return
    if not text: await tg("sendMessage", {"chat_id":chat_id,"text":"حالياً أعالج الرسائل النصية. استخدم لوحة الويب لإدارة الملفات."}); return
    await tg("sendChatAction", {"chat_id":chat_id,"action":"typing"})
    try:
        result, provider = await chat([{"role":"user","content":text}])
        answer = result["choices"][0]["message"]["content"]
        await tg("sendMessage", {"chat_id":chat_id,"text":answer[:4096],"reply_markup":keyboard()})
    except Exception as exc:
        await tg("sendMessage", {"chat_id":chat_id,"text":f"⚠️ تعذر تنفيذ الطلب: {html.escape(str(exc))}"})

