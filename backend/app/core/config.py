"""
[IDENTITY]: Global Application Configuration
Centralized Environment Variable Management via Pydantic.

[INPUT]:
- Environment Variables (.env).

[LINK]:
- Root -> ../../../.env (Runtime)
- Main -> ../main.py (Usage)

[OUTPUT]: Settings Singleton (Injectable).
[POS]: /backend/app/core/config.py

[PROTOCOL]:
1. **Secrets**: All secrets MUST load from env vars, never hardcoded.
2. **Defaults**: Provide safe defaults for dev, fail hard for prod missing vars.
3. **Immutability**: Settings should be read-only after startup.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
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

    # OpenAI Configuration (Story 3.2)
    openai_api_key: str = ""
    openai_model: str = "gpt-4-turbo-preview"

    # Copy Generation Settings
    copy_max_tokens: int = 2000
    copy_temperature: float = 0.7
    copy_retry_attempts: int = 3
    copy_retry_base_delay: float = 2.0  # seconds for exponential backoff

    # Video Script Generation Settings (Story 4.2)
    video_max_tokens: int = 4000
    video_temperature: float = 0.8
    video_retry_attempts: int = 3
    video_retry_base_delay: float = 2.0

    # Video Rendering Configuration (Story 4.3)
    video_generation_provider: str = "mock"  # mock, runway, pika, custom
    runwayml_api_key: str = ""
    pika_api_key: str = ""
    custom_video_api_url: str = ""

    # Video API Timeouts and Retry
    video_api_request_timeout: int = 300  # 5 minutes
    video_api_retry_attempts: int = 3
    video_api_retry_delay: int = 5  # seconds


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Some modules/tests expect a module-level singleton.
settings = get_settings()
