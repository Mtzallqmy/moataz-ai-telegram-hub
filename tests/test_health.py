from fastapi.testclient import TestClient
from app.main import app
from app.security import decrypt, encrypt
from app.ai import _anthropic_payload, _chat_endpoint, _gemini_payload, _generation_options, _model_endpoints, _parse_models, normalize_base

def test_health():
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_login_page_renders():
    response = TestClient(app).get("/login")
    assert response.status_code == 200
    assert "تسجيل الدخول" in response.text

def test_dashboard_redirects_without_session():
    response = TestClient(app).get("/", follow_redirects=False)
    assert response.status_code in (302, 307)
    assert response.headers["location"] == "/login"

def test_dashboard_renders_production_controls_after_login():
    client=TestClient(app)
    response=client.post("/login",data={"username":"admin","password":"change-me"},follow_redirects=True)
    assert response.status_code == 200
    assert "دردشة متدفقة" in response.text
    assert "النماذج المكتشفة فعلياً" in response.text
    assert "معتز العلقمي" in response.text

def test_presets_require_authentication():
    response = TestClient(app).get("/api/provider-presets")
    assert response.status_code == 401

def test_provider_secrets_round_trip():
    encrypted = encrypt("sk-example")
    assert encrypted != "sk-example"
    assert decrypt(encrypted) == "sk-example"

def test_base_url_normalizes_full_endpoints():
    assert normalize_base("https://api.example.com/v1/chat/completions") == "https://api.example.com/v1"
    assert normalize_base("https://api.groq.com/openai/v1/models") == "https://api.groq.com/openai/v1"
    assert normalize_base("https://openrouter.ai/api") == "https://openrouter.ai/api/v1"
    assert _chat_endpoint("https://vendor.example/api/v1/chat/completions") == "https://vendor.example/api/v1/chat/completions"
    assert _model_endpoints("https://vendor.example/api/v1/chat/completions")[0] == "https://vendor.example/api/v1/models"
    assert _model_endpoints("https://vendor.example/custom/models")[0] == "https://vendor.example/custom/models"

def test_model_parser_supports_vendor_shapes():
    assert _parse_models({"data":[{"id":"model-a"}]}) == ["model-a"]
    assert _parse_models({"models":[{"name":"models/gemini-x"}]}) == ["gemini-x"]
    assert _parse_models({"result":{"items":[{"model_id":"vendor-y"}]}}) == ["vendor-y"]

def test_openai_generation_options_are_passed_safely():
    result=_generation_options({"temperature":0.2,"max_tokens":128,"tools":[{"type":"function"}],"provider":"routing","messages":[]})
    assert result["temperature"] == 0.2
    assert result["max_tokens"] == 128
    assert "provider" not in result and "messages" not in result

def test_native_payload_translation():
    messages=[{"role":"system","content":"Be concise"},{"role":"user","content":"Hi"}]
    anthropic=_anthropic_payload(messages,"claude-test",{"temperature":0.3,"max_tokens":99})
    assert anthropic["system"] == "Be concise" and anthropic["max_tokens"] == 99
    gemini=_gemini_payload(messages,{"top_p":0.8,"max_tokens":50})
    assert gemini["systemInstruction"]["parts"][0]["text"] == "Be concise"
    assert gemini["generationConfig"]["maxOutputTokens"] == 50
