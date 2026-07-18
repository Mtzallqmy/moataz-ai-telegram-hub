# Moataz AI Telegram Hub

منصة مستقلة تجمع لوحة ويب عربية، بوت Telegram يعمل بـ Webhook، مزودات ذكاء اصطناعي متعددة، وواجهة API متوافقة مع OpenAI.

## الوظائف

- لوحة إدارة محمية بجلسة دخول وواجهة RTL متجاوبة.
- حفظ مفاتيح المزودات مشفّرة بـ Fernet.
- دعم أي مزود يقدم OpenAI-compatible `/v1/chat/completions` و`/v1/models`.
- بوت Telegram خاص مع قائمة سماح اختيارية وأزرار وأوامر.
- endpoint موحد: `POST /v1/chat/completions`.
- رفع وتنزيل ملفات ضمن مجلد معزول، وتنظيف أسماء الملفات وحد للحجم.
- سجلات تشخيص، فحص صحة، ووثائق API على `/api/docs`.
- PostgreSQL على Railway وSQLite للتطوير المحلي.

## التشغيل محلياً

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
uvicorn app.main:app --reload
```

ضع نتيجة الأمر السابق في `ENCRYPTION_KEY`، وغيّر كلمات المرور والأسرار قبل التشغيل.

## النشر على Railway

1. أنشئ مشروعاً جديداً من مستودع GitHub.
2. أضف خدمة PostgreSQL؛ سيُضاف `DATABASE_URL` عادة تلقائياً.
3. أضف متغيرات `.env.example`. اجعل `APP_URL` نطاق Railway العام دون `/` أخيرة.
4. أنشئ `SESSION_SECRET` و`TELEGRAM_WEBHOOK_SECRET` كسلاسل عشوائية طويلة، و`ENCRYPTION_KEY` بالأمر أعلاه.
5. ضع `TELEGRAM_BOT_TOKEN` من BotFather، ومعرفات المستخدمين في `ALLOWED_TELEGRAM_USERS` مفصولة بفاصلة.
6. بعد النشر افتح اللوحة واضغط «تفعيل Webhook» مرة واحدة.

Railway يكتشف `Dockerfile` و`railway.json` تلقائياً ويتحقق من `/health`.

## أمثلة Base URL

- OpenAI: `https://api.openai.com`
- OpenRouter: `https://openrouter.ai/api`
- Groq: `https://api.groq.com/openai`

تُضاف `/v1` تلقائياً إذا لم تكن موجودة. أدخل اسم النموذج كما يعيده المزود تماماً.

## استخدام API الموحد

```bash
curl https://YOUR-DOMAIN/v1/chat/completions \
  -H "Authorization: Bearer YOUR_SESSION_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"model":"MODEL_NAME","messages":[{"role":"user","content":"مرحبا"}]}'
```

## الأمان

- لا ترفع `.env` إلى GitHub.
- غيّر كلمة مرور المشرف وكل القيم الافتراضية قبل أول نشر.
- اضبط `ALLOWED_TELEGRAM_USERS` حتى لا يصبح البوت عاماً.
- استخدم PostgreSQL وRailway Volume لـ`WORKSPACE_DIR` للاحتفاظ بالملفات.
- تحرير الملفات النصية عن بعد غير مفعّل افتراضياً لتجنب منفذ تنفيذ عشوائي؛ الرفع والتنزيل محصوران في مساحة العمل.

## البنية

```text
app/
  main.py       HTTP, dashboard, API and files
  telegram.py   webhook and Telegram UX
  ai.py         provider adapter
  db.py         persistence models
  security.py   sessions and encryption
  templates/    web UI
  static/       styles and interactions
```
