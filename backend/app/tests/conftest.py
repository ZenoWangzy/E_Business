"""
Test fixtures and configuration for pytest.
"""
import pytest
from app.core.config import Settings, get_settings


@pytest.fixture
def settings() -> Settings:
    """Provide test settings instance."""
    return get_settings()


@pytest.fixture
def test_database_url(settings: Settings) -> str:
    """Provide database URL for testing."""
    return settings.database_url
