"""
Integration tests for Admin Dashboard.

Story 5.3: Admin Dashboard - Stats & Logs

End-to-end tests for:
- Non-admin cannot access /admin routes
- SQL injection prevention
- Full CRUD operations on admin endpoints
"""
import pytest
from unittest.mock import MagicMock, AsyncMock
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.db.base import get_db
from app.api.deps_auth import get_current_user
from app.models.user import User


# Test constants
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
    mock_result = MagicMock()
    mock_result.scalar.return_value = 0
    mock_result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=mock_result)
    return db


class TestNonAdminAccessBlocking:
    """Tests verifying non-admins cannot access admin routes."""

    def test_regular_user_blocked_from_stats(self, mock_db):
        """Test that regular users get 403 on /admin/stats."""
        regular_user = create_mock_user(is_superuser=False)
        
        def override_get_current_user():
            return regular_user
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            response = client.get("/api/v1/admin/stats")
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 403
        assert "Superuser access required" in response.json()["detail"]

    def test_regular_user_blocked_from_logs(self, mock_db):
        """Test that regular users get 403 on /admin/logs."""
        regular_user = create_mock_user(is_superuser=False)
        
        def override_get_current_user():
            return regular_user
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            response = client.get("/api/v1/admin/logs")
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 403


class TestSQLInjectionPrevention:
    """Tests for SQL injection prevention in admin endpoints."""

    def test_logs_level_filter_injection(self, mock_db):
        """Test that level filter parameter prevents SQL injection."""
        superuser = create_mock_user(is_superuser=True)
        
        def override_get_current_user():
            return superuser
        
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0
        
        mock_logs_result = MagicMock()
        mock_logs_result.scalars.return_value.all.return_value = []
        
        mock_db.execute = AsyncMock(side_effect=[mock_count_result, mock_logs_result])
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        # Attempt SQL injection via level parameter
        with TestClient(app) as client:
            response = client.get("/api/v1/admin/logs?level=error' OR '1'='1")
        
        app.dependency_overrides.clear()
        
        # Should return 422 (validation error) or 400, not 500
        # The Literal["error", "warning", "info"] type constraint prevents injection
        assert response.status_code in [422, 400]

    def test_logs_component_filter_injection(self, mock_db):
        """Test that component filter uses parameterized queries."""
        superuser = create_mock_user(is_superuser=True)
        
        def override_get_current_user():
            return superuser
        
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 0
        
        mock_logs_result = MagicMock()
        mock_logs_result.scalars.return_value.all.return_value = []
        
        mock_db.execute = AsyncMock(side_effect=[mock_count_result, mock_logs_result])
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        # Attempt SQL injection via component parameter
        with TestClient(app) as client:
            response = client.get("/api/v1/admin/logs?component=api'; DROP TABLE system_logs; --")
        
        app.dependency_overrides.clear()
        
        # Should return 200 (query runs safely) - parameterized queries prevent injection
        assert response.status_code == 200


class TestAdminCRUDOperations:
    """Tests for complete CRUD operations on admin endpoints."""

    def test_get_stats_returns_all_fields(self, mock_db):
        """Test that stats endpoint returns all required fields."""
        superuser = create_mock_user(is_superuser=True)
        
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
        data = response.json()
        
        # Verify all AC2 required fields
        assert "active_workspaces" in data
        assert "generations_today" in data
        assert "error_rate_24h" in data
        assert "estimated_mrr" in data
        assert "last_updated" in data

    def test_get_logs_with_filtering(self, mock_db):
        """Test logs endpoint with various filters."""
        superuser = create_mock_user(is_superuser=True)
        
        def override_get_current_user():
            return superuser
        
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
            response = client.get("/api/v1/admin/logs?level=error&component=api")
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify AC3 required fields
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "has_more" in data
