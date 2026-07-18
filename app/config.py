from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Moataz AI Hub"
    app_url: str = "http://localhost:8000"
    admin_username: str = "admin"
    admin_password: str = "change-me"
    session_secret: str = "dev-session-secret-change-me"
    encryption_key: str = ""
    database_url: str = "sqlite:///./data.db"
    telegram_bot_token: str = ""
    telegram_webhook_secret: str = "dev-webhook-secret"
    allowed_telegram_users: str = ""
    workspace_dir: str = "./workspace_files"
    max_upload_mb: int = 10
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_users(self) -> set[int]:
        return {int(x.strip()) for x in self.allowed_telegram_users.split(",") if x.strip().isdigit()}

settings = Settings()
Path(settings.workspace_dir).mkdir(parents=True, exist_ok=True)

