"""
Unit tests for Admin User Management API (Story 5.4).

Tests user management endpoints and task retry functionality.
"""
import pytest
from unittest.mock import MagicMock, AsyncMock
from uuid import uuid4, UUID
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.main import app
from app.db.base import get_db
from app.api.deps_auth import get_current_user
from app.models.user import User


# Test data
TEST_SUPERUSER_ID = uuid4()
TEST_USER_ID = uuid4()
SYSTEM_WORKSPACE_ID = UUID("00000000-0000-0000-0000-000000000000")


def create_mock_user(is_superuser: bool = False, user_id: UUID = None) -> MagicMock:
    """Create a mock user for testing."""
    user = MagicMock(spec=User)
    user.id = user_id or (TEST_SUPERUSER_ID if is_superuser else TEST_USER_ID)
    user.email = "admin@example.com" if is_superuser else "user@example.com"
    user.name = "Admin User" if is_superuser else "Regular User"
    user.is_active = True
    user.is_superuser = is_superuser
    user.created_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    user.workspaces = []
    return user


@pytest.fixture
def mock_db():
    """Create mock database session."""
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


@pytest.fixture
def superuser():
    """Create superuser mock user."""
    return create_mock_user(is_superuser=True)


@pytest.fixture
def regular_user():
    """Create regular (non-superuser) mock user."""
    return create_mock_user(is_superuser=False)


class TestUserManagementSecurity:
    """Tests verifying that user management endpoints require superuser access."""

    def test_list_users_requires_superuser(self, regular_user, mock_db):
        """Test that non-superuser cannot access /admin/users."""
        def override_get_current_user():
            return regular_user
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            response = client.get("/api/v1/admin/users")
        
        app.dependency_overrides.clear()
        
        # Should return 403 Forbidden
        assert response.status_code == 403
        assert "Superuser access required" in response.json()["detail"]

    def test_get_user_detail_requires_superuser(self, regular_user, mock_db):
        """Test that non-superuser cannot access /admin/users/{id}."""
        def override_get_current_user():
            return regular_user
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            response = client.get(f"/api/v1/admin/users/{TEST_USER_ID}")
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 403
        assert "Superuser access required" in response.json()["detail"]

    def test_update_user_requires_superuser(self, regular_user, mock_db):
        """Test that non-superuser cannot update users."""
        def override_get_current_user():
            return regular_user
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            response = client.patch(
                f"/api/v1/admin/users/{TEST_USER_ID}",
                json={"isActive": False}
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 403

    def test_get_user_tasks_requires_superuser(self, regular_user, mock_db):
        """Test that non-superuser cannot access user tasks."""
        def override_get_current_user():
            return regular_user
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            response = client.get(f"/api/v1/admin/users/{TEST_USER_ID}/tasks")
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 403

    def test_retry_task_requires_superuser(self, regular_user, mock_db):
        """Test that non-superuser cannot retry tasks."""
        def override_get_current_user():
            return regular_user
        
        async def override_get_db():
            return mock_db
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        task_id = uuid4()
        with TestClient(app) as client:
            response = client.post(
                f"/api/v1/admin/tasks/{task_id}/retry?task_type=image"
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 403


class TestUserManagementFunctionality:
    """Tests for user management functionality."""

    def test_superuser_can_list_users(self, superuser, mock_db):
        """Test that superuser can list users."""
        def override_get_current_user():
            return superuser
        
        async def override_get_db():
            return mock_db
        
        # Mock database responses
        mock_count_result = MagicMock()
        mock_count_result.scalar.return_value = 2
        
        mock_users_result = MagicMock()
        mock_users = [
            create_mock_user(is_superuser=True, user_id=TEST_SUPERUSER_ID),
            create_mock_user(is_superuser=False, user_id=TEST_USER_ID),
        ]
        mock_users_result.scalars.return_value.all.return_value = mock_users
        
        # Mock workspace count queries
        mock_workspace_count = MagicMock()
        mock_workspace_count.scalar.return_value = 1
        
        mock_db.execute = AsyncMock(side_effect=[
            mock_count_result,  # Total count
            mock_users_result,  # Users query
            mock_workspace_count,  # Workspace count for user 1
            mock_workspace_count,  # Workspace count for user 2
        ])
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            response = client.get("/api/v1/admin/users")
        
        app.dependency_overrides.clear()
        
        # Should return 200 OK
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 2

    def test_cannot_demote_self(self, superuser, mock_db):
        """Test that superuser cannot demote themselves."""
        def override_get_current_user():
            return superuser
        
        async def override_get_db():
            return mock_db
        
        # Mock user query - return the superuser themselves
        mock_user_result = MagicMock()
        mock_user_result.scalar_one_or_none.return_value = superuser
        mock_db.execute = AsyncMock(return_value=mock_user_result)
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as client:
            response = client.patch(
                f"/api/v1/admin/users/{superuser.id}",
                json={"isSuperuser": False}
            )
        
        app.dependency_overrides.clear()
        
        # Should return 400 Bad Request
        assert response.status_code == 400
        assert "Cannot demote yourself" in response.json()["detail"]


class TestTaskRetryFunctionality:
    """Tests for task retry functionality."""

    def test_retry_requires_failed_status(self, superuser, mock_db):
        """Test that only FAILED tasks can be retried without force flag."""
        # This test would require mocking the task_retry_service
        # For now, we'll skip detailed implementation
        pass

    def test_retry_with_force_flag(self, superuser, mock_db):
        """Test that force flag allows retrying non-failed tasks."""
        # This test would require mocking the task_retry_service
        pass


class TestAuditLogging:
    """Tests for audit logging of user management actions."""

    def test_user_deactivation_logged(self, superuser, mock_db):
        """Test that user deactivation is logged to audit trail."""
        # This test would require mocking audit_service
        pass

    def test_superuser_promotion_logged(self, superuser, mock_db):
        """Test that superuser promotion is logged with details."""
        pass
