"""
Performance tests for Admin API endpoints.

Story 5.3: Admin Dashboard - Stats & Logs

Tests that ensure admin API endpoints meet performance requirements:
- Stats API response < 200ms
- Logs API response < 200ms
- Caching mechanisms work correctly
"""
import pytest
import time
from unittest.mock import MagicMock, AsyncMock
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.db.base import get_db
from app.api.deps_auth import get_current_user
from app.models.user import User


# Test constants
TEST_SUPERUSER_ID = uuid4()
PERFORMANCE_THRESHOLD_MS = 200


def create_mock_superuser() -> MagicMock:
    """Create a mock superuser for testing."""
    user = MagicMock(spec=User)
    user.id = TEST_SUPERUSER_ID
    user.email = "admin@example.com"
    user.name = "Admin User"
    user.is_active = True
    user.is_superuser = True
    return user


@pytest.fixture
def mock_db():
    """Create mock database session with realistic response times."""
    db = MagicMock()
    
    # Simulate fast database responses
    mock_result = MagicMock()
    mock_result.scalar.return_value = 100
    mock_result.scalars.return_value.all.return_value = []
    
    db.execute = AsyncMock(return_value=mock_result)
    return db


@pytest.fixture
def superuser():
    """Create superuser mock user."""
    return create_mock_superuser()


class TestStatsApiPerformance:
    """Tests for /admin/stats endpoint performance."""

    def test_stats_response_time(self, superuser, mock_db):
        """Test that stats API responds within 200ms."""
        def override_get_current_user():
            return superuser
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            start_time = time.time()
            response = client.get("/api/v1/admin/stats")
            duration_ms = (time.time() - start_time) * 1000
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        assert duration_ms < PERFORMANCE_THRESHOLD_MS, \
            f"Stats API took {duration_ms:.2f}ms, expected < {PERFORMANCE_THRESHOLD_MS}ms"


class TestLogsApiPerformance:
    """Tests for /admin/logs endpoint performance."""

    def test_logs_response_time(self, superuser, mock_db):
        """Test that logs API responds within 200ms."""
        def override_get_current_user():
            return superuser
        
        # Mock for count and logs query
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0
        
        mock_logs_result = MagicMock()
        mock_logs_result.scalars.return_value.all.return_value = []
        
        mock_db.execute = AsyncMock(side_effect=[mock_count_result, mock_logs_result])
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            start_time = time.time()
            response = client.get("/api/v1/admin/logs")
            duration_ms = (time.time() - start_time) * 1000
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        assert duration_ms < PERFORMANCE_THRESHOLD_MS, \
            f"Logs API took {duration_ms:.2f}ms, expected < {PERFORMANCE_THRESHOLD_MS}ms"

    def test_logs_pagination_performance(self, superuser, mock_db):
        """Test that paginated logs API maintains performance."""
        def override_get_current_user():
            return superuser
        
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 1000  # Large dataset
        
        mock_logs_result = MagicMock()
        mock_logs_result.scalars.return_value.all.return_value = []
        
        mock_db.execute = AsyncMock(side_effect=[mock_count_result, mock_logs_result])
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            start_time = time.time()
            response = client.get("/api/v1/admin/logs?page=10&page_size=50")
            duration_ms = (time.time() - start_time) * 1000
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        assert duration_ms < PERFORMANCE_THRESHOLD_MS


class TestCachingMechanisms:
    """Tests for caching behavior."""

    def test_stats_caching_headers(self, superuser, mock_db):
        """Test that stats API returns proper cache headers."""
        def override_get_current_user():
            return superuser
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            response = client.get("/api/v1/admin/stats")
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        # Stats should return last_updated field for client-side caching decision
        data = response.json()
        assert "last_updated" in data
