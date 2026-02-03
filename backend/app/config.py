"""
Application Configuration
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Environment
    NODE_ENV: str = "development"
    ENVIRONMENT: str = "development"
    APP_NAME: str = "Mirai HelpDesk Management System"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "192.168.0.187"
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 8080
    USE_HTTPS: bool = False
    
    # API
    API_PREFIX: str = "/api"
    CORS_ORIGINS: list[str] = ["http://localhost:8080", "http://127.0.0.1:8080"]
    ENABLE_API_DOCS: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/helpdesk.db"

    # PostgreSQL Configuration (optional for development, required for production)
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "mirai_helpdesk"
    DB_USER: str = "mirai_user"
    DB_PASSWORD: str = ""

    # Database Connection Pool (PostgreSQL only, ignored for SQLite)
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    DB_ECHO: bool = False

    @property
    def is_postgres(self) -> bool:
        """Check if using PostgreSQL database."""
        return "postgresql" in self.DATABASE_URL.lower()

    @property
    def is_sqlite(self) -> bool:
        """Check if using SQLite database."""
        return "sqlite" in self.DATABASE_URL.lower()

    # Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Microsoft Graph API (Non-interactive authentication)
    MS_TENANT_ID: str = ""
    MS_CLIENT_ID: str = ""
    MS_CLIENT_SECRET: str = ""
    MS_AUTHORITY: str = ""
    MS_GRAPH_ENDPOINT: str = "https://graph.microsoft.com/v1.0"
    MS_SCOPES: str = "https://graph.microsoft.com/.default"
    
    # File Upload
    UPLOAD_DIR: Path = Path("./data/uploads")
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: list[str] = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".txt", ".csv", ".xlsx", ".docx"]
    
    # SLA Defaults (in hours)
    SLA_P1_RESPONSE: int = 1
    SLA_P1_RESOLUTION: int = 4
    SLA_P2_RESPONSE: int = 4
    SLA_P2_RESOLUTION: int = 24
    SLA_P3_RESPONSE: int = 8
    SLA_P3_RESOLUTION: int = 72
    SLA_P4_RESPONSE: int = 24
    SLA_P4_RESOLUTION: int = 120
    
    # Logging
    LOG_LEVEL: str = "info"
    LOG_FILE: str | None = None

    # Audit Logging
    LOG_DIR: str = "logs"
    AUDIT_LOG_ENABLED: bool = True
    AUDIT_LOG_RETENTION_DAYS: int = 90  # 最低2年 (730日) を推奨
    
    # Development Options
    INCLUDE_SAMPLE_DATA: bool = True
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
