from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql+asyncpg://ebusiness:ebusiness_secret@localhost:5433/ebusiness"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # MinIO
    minio_endpoint: str = "localhost:9000"
    minio_root_user: str = "minioadmin"
    minio_root_password: str = "minioadmin"
    minio_bucket: str = "ebusiness-assets"

    # Security
    secret_key: str = "dev-secret-key-change-in-production"
    auth_secret: str = "dev-auth-secret-change-in-production"  # NextAuth JWT secret
    access_token_expire_minutes: int = 30

    # App
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    # AI Configuration
    ai_mock_mode: bool = True  # When true, uses mock AI responses instead of real API calls


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
