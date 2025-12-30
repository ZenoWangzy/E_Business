"""
Unit tests for Admin API security.

Story 5.3: Admin Dashboard - Stats & Logs

Tests that non-superusers cannot access admin endpoints and
superusers can access them successfully.
"""
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from uuid import uuid4
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.main import app
from app.db.base import get_db
from app.api.deps_auth import get_current_user, get_current_superuser
from app.models.user import User


# Test data
TEST_USER_ID = uuid4()
TEST_SUPERUSER_ID = uuid4()


def create_mock_user(is_superuser: bool = False) -> MagicMock:
    """Create a mock user for testing."""
    user = MagicMock(spec=User)
    user.id = TEST_SUPERUSER_ID if is_superuser else TEST_USER_ID
    user.email = "admin@example.com" if is_superuser else "user@example.com"
    user.name = "Admin User" if is_superuser else "Regular User"
    user.is_active = True
    user.is_superuser = is_superuser
    return user


@pytest.fixture
def mock_db():
    """Create mock database session."""
    db = MagicMock()
    db.execute = AsyncMock()
    return db


@pytest.fixture
def regular_user():
    """Create regular (non-superuser) mock user."""
    return create_mock_user(is_superuser=False)


@pytest.fixture
def superuser():
    """Create superuser mock user."""
    return create_mock_user(is_superuser=True)


class TestSuperuserRequired:
    """Tests verifying that admin endpoints require superuser access."""

    def test_stats_requires_superuser(self, regular_user, mock_db):
        """Test that non-superuser cannot access /admin/stats."""
        def override_get_current_user():
            return regular_user
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            response = client.get("/api/v1/admin/stats")
        
        app.dependency_overrides.clear()
        
        # Should return 403 Forbidden
        assert response.status_code == 403
        assert "Superuser access required" in response.json()["detail"]

    def test_logs_requires_superuser(self, regular_user, mock_db):
        """Test that non-superuser cannot access /admin/logs."""
        def override_get_current_user():
            return regular_user
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            response = client.get("/api/v1/admin/logs")
        
        app.dependency_overrides.clear()
        
        # Should return 403 Forbidden
        assert response.status_code == 403
        assert "Superuser access required" in response.json()["detail"]

    def test_log_detail_requires_superuser(self, regular_user, mock_db):
        """Test that non-superuser cannot access /admin/logs/{id}."""
        def override_get_current_user():
            return regular_user
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            response = client.get("/api/v1/admin/logs/1")
        
        app.dependency_overrides.clear()
        
        # Should return 403 Forbidden
        assert response.status_code == 403
        assert "Superuser access required" in response.json()["detail"]


class TestSuperuserAccess:
    """Tests verifying that superusers can access admin endpoints."""

    def test_superuser_can_access_stats(self, superuser, mock_db):
        """Test that superuser can access /admin/stats."""
        def override_get_current_user():
            return superuser
        
        async def override_get_db():
            return mock_db
        
        # Mock database responses
        mock_result = MagicMock()
        mock_result.scalar.return_value = 10
        mock_db.execute = AsyncMock(return_value=mock_result)
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            response = client.get("/api/v1/admin/stats")
        
        app.dependency_overrides.clear()
        
        # Should return 200 OK
        assert response.status_code == 200
        data = response.json()
        assert "active_workspaces" in data
        assert "generations_today" in data
        assert "error_rate_24h" in data
        assert "estimated_mrr" in data

    def test_superuser_can_access_logs(self, superuser, mock_db):
        """Test that superuser can access /admin/logs."""
        def override_get_current_user():
            return superuser
        
        async def override_get_db():
            return mock_db
        
        # Mock database responses for count and logs
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0
        
        mock_logs_result = MagicMock()
        mock_logs_result.scalars.return_value.all.return_value = []
        
        mock_db.execute = AsyncMock(side_effect=[mock_count_result, mock_logs_result])
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            response = client.get("/api/v1/admin/logs")
        
        app.dependency_overrides.clear()
        
        # Should return 200 OK
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data


class TestUnauthenticatedAccess:
    """Tests for unauthenticated access attempts."""

    def test_stats_requires_authentication(self):
        """Test that unauthenticated requests return 401."""
        app.dependency_overrides.clear()
        
        with TestClient(app) as client:
            response = client.get("/api/v1/admin/stats")
        
        # Should return 401 Unauthorized
        assert response.status_code == 401

    def test_logs_requires_authentication(self):
        """Test that unauthenticated requests return 401."""
        app.dependency_overrides.clear()
        
        with TestClient(app) as client:
            response = client.get("/api/v1/admin/logs")
        
        # Should return 401 Unauthorized
        assert response.status_code == 401
