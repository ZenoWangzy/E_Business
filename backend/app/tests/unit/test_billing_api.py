"""
Unit tests for Billing API endpoints.

Story 5.2: User Usage Dashboard
Tests GET /billing/subscription and GET /billing/credits endpoints.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.api.deps import get_current_user, get_current_workspace_member, get_db
from app.models.user import User, WorkspaceMember, WorkspaceBilling, UserRole


# Test data
TEST_USER_ID = uuid4()
TEST_WORKSPACE_ID = uuid4()
TEST_BILLING_ID = uuid4()
TEST_MEMBER_ID = uuid4()


def create_mock_user():
    """Create a mock user for testing."""
    user = MagicMock(spec=User)
    user.id = TEST_USER_ID
    user.email = "test@example.com"
    user.name = "Test User"
    user.is_active = True
    return user


def create_mock_member():
    """Create a mock workspace member."""
    member = MagicMock(spec=WorkspaceMember)
    member.id = TEST_MEMBER_ID
    member.user_id = TEST_USER_ID
    member.workspace_id = TEST_WORKSPACE_ID
    member.role = UserRole.MEMBER
    return member


def create_mock_billing(tier="pro", credits_remaining=550, credits_limit=1000):
    """Create a mock billing record."""
    billing = MagicMock(spec=WorkspaceBilling)
    billing.id = TEST_BILLING_ID
    billing.workspace_id = TEST_WORKSPACE_ID
    billing.tier = tier
    billing.credits_remaining = credits_remaining
    billing.credits_limit = credits_limit
    billing.reset_date = datetime(2024, 2, 1, tzinfo=timezone.utc)
    billing.is_active = True
    billing.features = None
    return billing


@pytest.fixture
def mock_db():
    """Create mock database session with proper async support."""
    db = MagicMock(spec=AsyncSession)
    
    # Create a proper async execute mock
    async def mock_execute(*args, **kwargs):
        result = MagicMock()
        result.scalar_one_or_none = MagicMock(return_value=create_mock_billing())
        return result
    
    db.execute = mock_execute
    return db


@pytest.fixture
def mock_user():
    """Create mock user."""
    return create_mock_user()


@pytest.fixture
def mock_member():
    """Create mock member."""
    return create_mock_member()


@pytest.fixture
def client(mock_db, mock_user, mock_member):
    """Create test client with mocked dependencies."""
    
    async def override_get_db():
        return mock_db
    
    def override_get_current_user():
        return mock_user
    
    def override_get_current_workspace_member():
        return mock_member
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_workspace_member] = override_get_current_workspace_member
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


class TestGetSubscriptionDetails:
    """Tests for GET /api/v1/billing/workspaces/{id}/subscription endpoint."""

    def test_get_subscription_success(self, client):
        """Test successful retrieval of subscription details."""
        response = client.get(
            f"/api/v1/billing/workspaces/{TEST_WORKSPACE_ID}/subscription"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["tier"] == "PRO"
        assert data["credits"]["total"] == 1000
        assert data["credits"]["used"] == 450
        assert data["credits"]["remaining"] == 550

    def test_get_subscription_invalid_workspace_format(self, mock_user, mock_member):
        """Test that invalid workspace format returns 422."""
        # Need auth mocks to reach UUID validation
        def override_get_current_user():
            return mock_user
        
        def override_get_current_workspace_member():
            return mock_member
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_current_workspace_member] = override_get_current_workspace_member
        
        with TestClient(app) as test_client:
            response = test_client.get("/api/v1/billing/workspaces/invalid-uuid/subscription")
        
        app.dependency_overrides.clear()
        assert response.status_code == 422


class TestGetCreditBalance:
    """Tests for GET /api/v1/billing/workspaces/{id}/credits endpoint."""

    def test_get_credits_success(self, client):
        """Test successful retrieval of credit balance."""
        # Patch BillingService for credits endpoint
        with patch("app.api.v1.endpoints.billing.BillingService") as mock_service_class:
            mock_service = MagicMock()
            
            # Make get_credits return a coroutine
            async def mock_get_credits(*args):
                return 550
            
            mock_service.get_credits = mock_get_credits
            mock_service_class.return_value = mock_service
            
            response = client.get(
                f"/api/v1/billing/workspaces/{TEST_WORKSPACE_ID}/credits"
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["remaining_credits"] == 550
            assert data["workspace_id"] == str(TEST_WORKSPACE_ID)


class TestBillingEndpointSecurity:
    """Tests for endpoint security and authentication."""

    def test_unauthorized_access(self):
        """Test that unauthenticated requests return 401."""
        # Remove all auth overrides
        app.dependency_overrides.clear()
        
        with TestClient(app) as test_client:
            response = test_client.get(
                f"/api/v1/billing/workspaces/{uuid4()}/subscription"
            )
            
            # Should return 401 Unauthorized
            assert response.status_code == 401


class TestBillingNoBillingRecord:
    """Tests for handling missing billing records."""

    def test_no_billing_creates_default(self, mock_user, mock_member):
        """Test that missing billing record triggers default creation."""
        
        # Create a db mock that returns None (no billing)
        mock_db = MagicMock(spec=AsyncSession)
        
        async def mock_execute_no_billing(*args, **kwargs):
            result = MagicMock()
            result.scalar_one_or_none = MagicMock(return_value=None)
            return result
        
        mock_db.execute = mock_execute_no_billing
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        
        async def override_get_db():
            return mock_db
        
        def override_get_current_user():
            return mock_user
        
        def override_get_current_workspace_member():
            return mock_member
        
        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_current_workspace_member] = override_get_current_workspace_member
        
        with patch("app.api.v1.endpoints.billing.BillingService") as mock_service_class:
            mock_service = MagicMock()
            
            # Mock _create_default_billing to return a billing record
            async def mock_create_default(*args):
                return create_mock_billing(tier="free", credits_remaining=50, credits_limit=50)
            
            mock_service._create_default_billing = mock_create_default
            mock_service_class.return_value = mock_service
            
            with TestClient(app) as test_client:
                response = test_client.get(
                    f"/api/v1/billing/workspaces/{TEST_WORKSPACE_ID}/subscription"
                )
            
            # Should succeed with default billing
            assert response.status_code == 200
            data = response.json()
            assert data["tier"] == "FREE"
        
        app.dependency_overrides.clear()
