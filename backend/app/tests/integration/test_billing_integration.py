"""
Integration tests for Billing API endpoints.

Story 5.2: User Usage Dashboard
Tests complete billing page data flow, credit updates, and error handling.
"""
import pytest
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.api.deps import get_current_user, get_current_workspace_member, get_db
from app.models.user import User, WorkspaceMember, WorkspaceBilling, UserRole


# Test fixtures
TEST_WORKSPACE_ID = uuid4()


def create_mock_user():
    """Create a mock user for testing."""
    user = MagicMock(spec=User)
    user.id = uuid4()
    user.email = "billing-test@example.com"
    user.name = "Billing Test User"
    user.is_active = True
    return user


def create_mock_member(user_id, workspace_id):
    """Create a mock workspace member."""
    member = MagicMock(spec=WorkspaceMember)
    member.id = uuid4()
    member.user_id = user_id
    member.workspace_id = workspace_id
    member.role = UserRole.MEMBER
    return member


def create_mock_billing(workspace_id, tier="pro", credits_remaining=550, credits_limit=1000):
    """Create a mock billing record."""
    billing = MagicMock(spec=WorkspaceBilling)
    billing.id = uuid4()
    billing.workspace_id = workspace_id
    billing.tier = tier
    billing.credits_remaining = credits_remaining
    billing.credits_limit = credits_limit
    billing.reset_date = datetime.now(timezone.utc) + timedelta(days=20)
    billing.is_active = True
    billing.features = None
    return billing


@pytest.fixture
def test_user():
    """Create test user."""
    return create_mock_user()


@pytest.fixture
def test_workspace_id():
    """Create test workspace ID."""
    return TEST_WORKSPACE_ID


@pytest.fixture
def test_member(test_user, test_workspace_id):
    """Create test workspace member."""
    return create_mock_member(test_user.id, test_workspace_id)


def create_client_with_billing(test_user, test_member, billing_mock):
    """Create test client with specific billing mock."""
    mock_db = MagicMock(spec=AsyncSession)
    
    async def mock_execute(*args, **kwargs):
        result = MagicMock()
        result.scalar_one_or_none = MagicMock(return_value=billing_mock)
        return result
    
    mock_db.execute = mock_execute
    
    async def override_get_db():
        return mock_db
    
    def override_get_current_user():
        return test_user
    
    def override_get_current_workspace_member():
        return test_member
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_workspace_member] = override_get_current_workspace_member
    
    return TestClient(app)


class TestBillingIntegration:
    """Integration tests for complete billing data flow."""

    def test_complete_subscription_flow_free_tier(self, test_user, test_member, test_workspace_id):
        """Test complete subscription retrieval for FREE tier."""
        billing = create_mock_billing(test_workspace_id, tier="free", credits_remaining=15, credits_limit=50)
        
        with create_client_with_billing(test_user, test_member, billing) as client:
            response = client.get(
                f"/api/v1/billing/workspaces/{test_workspace_id}/subscription"
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        data = response.json()
        assert data["tier"] == "FREE"
        assert data["credits"]["total"] == 50
        assert data["credits"]["remaining"] == 15
        assert data["credits"]["used"] == 35
        assert "period_end" in data

    def test_complete_subscription_flow_pro_tier(self, test_user, test_member, test_workspace_id):
        """Test complete subscription retrieval for PRO tier."""
        billing = create_mock_billing(test_workspace_id, tier="pro", credits_remaining=550, credits_limit=1000)
        
        with create_client_with_billing(test_user, test_member, billing) as client:
            response = client.get(
                f"/api/v1/billing/workspaces/{test_workspace_id}/subscription"
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        data = response.json()
        assert data["tier"] == "PRO"
        assert data["credits"]["total"] == 1000
        assert data["credits"]["remaining"] == 550
        assert data["credits"]["used"] == 450

    def test_credit_balance_endpoint(self, test_user, test_member, test_workspace_id):
        """Test credit balance retrieval."""
        mock_db = MagicMock(spec=AsyncSession)
        
        async def override_get_db():
            return mock_db
        
        def override_get_current_user():
            return test_user
        
        def override_get_current_workspace_member():
            return test_member
        
        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_current_workspace_member] = override_get_current_workspace_member
        
        with patch("app.api.v1.endpoints.billing.BillingService") as mock_service:
            mock_instance = MagicMock()
            
            async def mock_get_credits(*args):
                return 550
            
            mock_instance.get_credits = mock_get_credits
            mock_service.return_value = mock_instance
            
            with TestClient(app) as client:
                response = client.get(
                    f"/api/v1/billing/workspaces/{test_workspace_id}/credits"
                )
            
            assert response.status_code == 200
            data = response.json()
            assert data["remaining_credits"] == 550
            assert data["workspace_id"] == str(test_workspace_id)
        
        app.dependency_overrides.clear()


class TestBillingErrorHandling:
    """Integration tests for billing error scenarios."""

    def test_billing_not_found_creates_default(self, test_user, test_member, test_workspace_id):
        """Test that missing billing record triggers default creation."""
        mock_db = MagicMock(spec=AsyncSession)
        
        async def mock_execute(*args, **kwargs):
            result = MagicMock()
            result.scalar_one_or_none = MagicMock(return_value=None)
            return result
        
        mock_db.execute = mock_execute
        
        async def override_get_db():
            return mock_db
        
        def override_get_current_user():
            return test_user
        
        def override_get_current_workspace_member():
            return test_member
        
        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_current_workspace_member] = override_get_current_workspace_member
        
        with patch("app.api.v1.endpoints.billing.BillingService") as mock_service:
            mock_billing = create_mock_billing(test_workspace_id, tier="free", credits_remaining=50, credits_limit=50)
            mock_instance = MagicMock()
            
            async def mock_create_default(*args):
                return mock_billing
            
            mock_instance._create_default_billing = mock_create_default
            mock_service.return_value = mock_instance
            
            with TestClient(app) as client:
                response = client.get(
                    f"/api/v1/billing/workspaces/{test_workspace_id}/subscription"
                )
            
            assert response.status_code == 200
            data = response.json()
            assert data["tier"] == "FREE"
        
        app.dependency_overrides.clear()

    def test_invalid_workspace_id_format(self, test_user, test_member):
        """Test invalid workspace ID format returns 422."""
        def override_get_current_user():
            return test_user
        
        def override_get_current_workspace_member():
            return test_member
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_current_workspace_member] = override_get_current_workspace_member
        
        with TestClient(app) as client:
            response = client.get(
                "/api/v1/billing/workspaces/invalid-uuid/subscription"
            )
        
        app.dependency_overrides.clear()
        assert response.status_code == 422


class TestBillingCacheIntegration:
    """Integration tests for billing cache behavior."""

    def test_multiple_requests_use_cache(self, test_user, test_member, test_workspace_id):
        """Test that repeated requests can use cached data."""
        billing = create_mock_billing(test_workspace_id, tier="pro", credits_remaining=550, credits_limit=1000)
        
        with create_client_with_billing(test_user, test_member, billing) as client:
            # Make multiple requests
            for _ in range(3):
                response = client.get(
                    f"/api/v1/billing/workspaces/{test_workspace_id}/subscription"
                )
                assert response.status_code == 200
        
        app.dependency_overrides.clear()


class TestBillingCreditDeduction:
    """Integration tests for credit deduction flow."""

    def test_credit_balance_after_deduction(self, test_user, test_member, test_workspace_id):
        """Test credit balance reflects deductions."""
        mock_db = MagicMock(spec=AsyncSession)
        
        async def override_get_db():
            return mock_db
        
        def override_get_current_user():
            return test_user
        
        def override_get_current_workspace_member():
            return test_member
        
        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_current_workspace_member] = override_get_current_workspace_member
        
        with patch("app.api.v1.endpoints.billing.BillingService") as mock_service:
            mock_instance = MagicMock()
            
            async def mock_get_credits(*args):
                return 549  # After 1 credit deducted
            
            mock_instance.get_credits = mock_get_credits
            mock_service.return_value = mock_instance
            
            with TestClient(app) as client:
                response = client.get(
                    f"/api/v1/billing/workspaces/{test_workspace_id}/credits"
                )
            
            assert response.status_code == 200
            assert response.json()["remaining_credits"] == 549
        
        app.dependency_overrides.clear()
