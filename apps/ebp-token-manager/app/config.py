from functools import lru_cache
import os


class Settings:
    app_title: str
    admin_username: str
    admin_password: str
    database_url: str
    ebp_token_url: str
    ebp_client_id: str
    ebp_client_secret: str
    refresh_margin_seconds: int
    refresh_interval_seconds: int
    request_timeout_seconds: int
    clients_dir: str
    auth_mode: str
    internal_api_token: str
    public_base_url: str
    ebp_auth_scope: str
    smtp_host: str
    smtp_port: int
    smtp_username: str
    smtp_password: str
    smtp_from_email: str
    alert_to_email: str
    alert_policy: str
    db_public_host: str
    db_public_port: int
    db_public_name: str
    db_public_user: str
    db_public_password: str

    def __init__(self) -> None:
        self.app_title = os.getenv("APP_TITLE", "EBP Token Manager")
        self.admin_username = os.getenv("ADMIN_USERNAME", "admin")
        self.admin_password = os.getenv("ADMIN_PASSWORD", "change-me")
        self.database_url = os.getenv(
            "DATABASE_URL",
            "mysql+pymysql://ebp:change-me@mariadb:3306/ebp_tokens",
        )
        self.ebp_token_url = os.getenv(
            "EBP_TOKEN_URL",
            "https://api-login.ebp.com/connect/token",
        )
        self.ebp_client_id = os.getenv("EBP_CLIENT_ID", "jupiterwithoutpkce")
        self.ebp_client_secret = os.getenv("EBP_CLIENT_SECRET", "")
        self.refresh_margin_seconds = int(os.getenv("REFRESH_MARGIN_SECONDS", "900"))
        self.refresh_interval_seconds = int(os.getenv("REFRESH_INTERVAL_SECONDS", "60"))
        self.request_timeout_seconds = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))
        self.clients_dir = os.getenv("CLIENTS_DIR", "/app/clients")
        self.auth_mode = os.getenv("AUTH_MODE", "basic").strip().lower()
        self.internal_api_token = os.getenv("INTERNAL_API_TOKEN", "")
        self.public_base_url = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
        self.ebp_auth_scope = os.getenv(
            "EBP_AUTH_SCOPE",
            "openid profile offline_access",
        )
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.smtp_from_email = os.getenv("SMTP_FROM_EMAIL", self.smtp_username)
        self.alert_to_email = os.getenv("ALERT_TO_EMAIL", "")
        self.alert_policy = os.getenv("ALERT_POLICY", "new_only")
        self.db_public_host = os.getenv("DB_PUBLIC_HOST", "86.104.252.66")
        self.db_public_port = int(os.getenv("DB_PUBLIC_PORT", "3307"))
        self.db_public_name = os.getenv("MARIADB_DATABASE", "ebp_tokens")
        self.db_public_user = os.getenv("MARIADB_READONLY_USER", "ebp_read")
        self.db_public_password = os.getenv("MARIADB_READONLY_PASSWORD", "")


@lru_cache
def get_settings() -> Settings:
    return Settings()
