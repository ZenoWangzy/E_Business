"""
Unit tests for core configuration.
Tests AC: Verify pydantic-settings loads env vars correctly.
"""
import pytest
from app.core.config import Settings, get_settings


class TestSettings:
    """Test suite for Settings configuration."""

    def test_settings_defaults(self):
        """Test default settings values are set correctly."""
        settings = Settings()
        
        # Database default
        assert "postgresql+asyncpg" in settings.database_url
        assert "5433" in settings.database_url  # Uses mapped host port
        
        # Redis default
        assert "redis://localhost:6379" in settings.redis_url
        
        # MinIO defaults
        assert settings.minio_endpoint == "localhost:9000"
        assert settings.minio_root_user == "minioadmin"
        assert settings.minio_bucket == "ebusiness-assets"
        
        # App defaults
        assert settings.debug is True
        assert settings.api_v1_prefix == "/api/v1"

    def test_get_settings_cached(self):
        """Test that settings are cached via lru_cache."""
        settings1 = get_settings()
        settings2 = get_settings()
        assert settings1 is settings2

    def test_database_url_format(self):
        """Test database URL uses asyncpg driver for async support."""
        settings = Settings()
        assert settings.database_url.startswith("postgresql+asyncpg://")

    def test_secret_key_present(self):
        """Test secret key is configured (not empty)."""
        settings = Settings()
        assert len(settings.secret_key) > 0
