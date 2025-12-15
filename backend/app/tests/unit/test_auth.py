"""
Unit tests for authentication endpoints.
"""
import pytest
from unittest.mock import MagicMock
from uuid import uuid4

from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import get_password_hash
from app.db.base import get_db


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


def create_mock_user(
    email: str = "test@example.com",
    password: str | None = "Password123!",  # Strong password for tests
    is_active: bool = True,
    name: str = "Test User",
):
    """Helper to create a mock user object."""
    mock_user = MagicMock()
    mock_user.id = uuid4()
    mock_user.email = email
    mock_user.name = name
    mock_user.hashed_password = get_password_hash(password) if password else None
    mock_user.is_active = is_active
    return mock_user


class MockAsyncSession:
    """Mock async session that returns pre-configured results."""
    
    def __init__(self, user=None):
        self.user = user
        
    async def execute(self, stmt):
        result = MagicMock()
        result.scalar_one_or_none.return_value = self.user
        return result
    
    async def close(self):
        pass


class TestLoginEndpoint:
    """Tests for POST /api/v1/auth/login endpoint."""

    def test_login_success(self, client):
        """Successful login should return access token."""
        mock_user = create_mock_user(
            email="test@example.com",
            password="CorrectPass123!",
        )
        
        async def mock_get_db():
            yield MockAsyncSession(mock_user)
        
        app.dependency_overrides[get_db] = mock_get_db
        try:
            response = client.post(
                "/api/v1/auth/login",
                json={"email": "test@example.com", "password": "CorrectPass123!"}
            )
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "access_token" in data
            assert data["token_type"] == "bearer"
        finally:
            app.dependency_overrides.clear()

    def test_login_user_not_found(self, client):
        """Login with non-existent user should return 401."""
        async def mock_get_db():
            yield MockAsyncSession(None)  # No user found
        
        app.dependency_overrides[get_db] = mock_get_db
        try:
            response = client.post(
                "/api/v1/auth/login",
                json={"email": "nonexistent@example.com", "password": "Password123!"}
            )
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
        finally:
            app.dependency_overrides.clear()

    def test_login_wrong_password(self, client):
        """Login with wrong password should return 401."""
        mock_user = create_mock_user(
            email="test@example.com",
            password="CorrectPass123!",
        )
        
        async def mock_get_db():
            yield MockAsyncSession(mock_user)
        
        app.dependency_overrides[get_db] = mock_get_db
        try:
            response = client.post(
                "/api/v1/auth/login",
                json={"email": "test@example.com", "password": "WrongPass123!"}
            )
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
        finally:
            app.dependency_overrides.clear()

    def test_login_oauth_user_no_password(self, client):
        """OAuth user without password should get helpful error."""
        mock_user = create_mock_user(
            email="oauth@example.com",
            password=None,  # OAuth user has no password
        )
        
        async def mock_get_db():
            yield MockAsyncSession(mock_user)
        
        app.dependency_overrides[get_db] = mock_get_db
        try:
            response = client.post(
                "/api/v1/auth/login",
                json={"email": "oauth@example.com", "password": "AnyPass123!"}
            )
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            assert "OAuth" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    def test_login_inactive_user(self, client):
        """Inactive user should get 403."""
        mock_user = create_mock_user(
            email="inactive@example.com",
            password="Password123!",
            is_active=False,
        )
        
        async def mock_get_db():
            yield MockAsyncSession(mock_user)
        
        app.dependency_overrides[get_db] = mock_get_db
        try:
            response = client.post(
                "/api/v1/auth/login",
                json={"email": "inactive@example.com", "password": "Password123!"}
            )
            assert response.status_code == status.HTTP_403_FORBIDDEN
        finally:
            app.dependency_overrides.clear()

    def test_login_invalid_email_format(self, client):
        """Invalid email format should return 422."""
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "not-an-email", "password": "Password123!"}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login_missing_password(self, client):
        """Missing password should return 422."""
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com"}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    def test_health_check(self, client):
        """Health check should return ok status."""
        response = client.get("/health")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"status": "ok"}
