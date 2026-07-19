from fastapi.testclient import TestClient
from app.main import app
from app.security import decrypt, encrypt

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

def test_presets_require_authentication():
    response = TestClient(app).get("/api/provider-presets")
    assert response.status_code == 401

def test_provider_secrets_round_trip():
    encrypted = encrypt("sk-example")
    assert encrypted != "sk-example"
    assert decrypt(encrypted) == "sk-example"
