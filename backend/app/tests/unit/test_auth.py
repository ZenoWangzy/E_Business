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


class MockAsyncSessionWithCommit:
    """Mock async session that supports add/commit/refresh for registration tests."""
    
    def __init__(self, existing_user=None, should_fail_integrity=False):
        self.existing_user = existing_user
        self.should_fail_integrity = should_fail_integrity
        self.added_user = None
        
    async def execute(self, stmt):
        result = MagicMock()
        result.scalar_one_or_none.return_value = self.existing_user
        return result
    
    def add(self, user):
        self.added_user = user
        
    async def commit(self):
        from sqlalchemy.exc import IntegrityError
        if self.should_fail_integrity:
            raise IntegrityError("Duplicate", {}, None)
        # Simulate setting ID after commit
        if self.added_user and not hasattr(self.added_user, 'id') or self.added_user.id is None:
            self.added_user.id = uuid4()
    
    async def refresh(self, user):
        pass
    
    async def rollback(self):
        pass
    
    async def close(self):
        pass


class TestRegisterEndpoint:
    """Tests for POST /api/v1/auth/register endpoint."""

    def test_register_success(self, client):
        """Successful registration should return 201 with user info."""
        async def mock_get_db():
            yield MockAsyncSessionWithCommit()
        
        app.dependency_overrides[get_db] = mock_get_db
        try:
            response = client.post(
                "/api/v1/auth/register",
                json={
                    "email": "newuser@example.com",
                    "password": "StrongPass123!",
                    "name": "New User"
                }
            )
            assert response.status_code == status.HTTP_201_CREATED
            data = response.json()
            assert data["email"] == "newuser@example.com"
            assert data["name"] == "New User"
            assert "id" in data
            assert data["message"] == "注册成功"
        finally:
            app.dependency_overrides.clear()

    def test_register_weak_password_too_short(self, client):
        """Password too short should return 400."""
        async def mock_get_db():
            yield MockAsyncSessionWithCommit()
        
        app.dependency_overrides[get_db] = mock_get_db
        try:
            response = client.post(
                "/api/v1/auth/register",
                json={
                    "email": "newuser@example.com",
                    "password": "Short1!",  # Only 7 chars
                    "name": "New User"
                }
            )
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "8" in response.json()["detail"]  # Should mention 8 chars
        finally:
            app.dependency_overrides.clear()

    def test_register_weak_password_no_special(self, client):
        """Password without number or special char should return 400."""
        async def mock_get_db():
            yield MockAsyncSessionWithCommit()
        
        app.dependency_overrides[get_db] = mock_get_db
        try:
            response = client.post(
                "/api/v1/auth/register",
                json={
                    "email": "newuser@example.com",
                    "password": "LongPasswordNoNumber",  # No number or special
                    "name": "New User"
                }
            )
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "数字" in response.json()["detail"] or "特殊字符" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    def test_register_email_already_exists(self, client):
        """Duplicate email should return 400."""
        async def mock_get_db():
            yield MockAsyncSessionWithCommit(should_fail_integrity=True)
        
        app.dependency_overrides[get_db] = mock_get_db
        try:
            response = client.post(
                "/api/v1/auth/register",
                json={
                    "email": "existing@example.com",
                    "password": "StrongPass123!",
                    "name": "Existing User"
                }
            )
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "邮箱已被注册" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    def test_register_invalid_email_format(self, client):
        """Invalid email format should return 422."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "password": "StrongPass123!",
                "name": "Test User"
            }
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_missing_name(self, client):
        """Missing name should return 422."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "StrongPass123!"
            }
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

