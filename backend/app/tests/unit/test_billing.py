"""
Unit tests for BillingService.

Tests Redis caching, database fallback, credit deduction, and feature eligibility.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.services.billing_service import BillingService
from app.models.user import WorkspaceBilling, SubscriptionTier
from app.core.billing_config import BillingConfig, ActionType


@pytest.fixture
def mock_redis():
    """Mock Redis client for testing."""
    mock = AsyncMock()
    mock.get.return_value = None
    mock.setex.return_value = True
    mock.close = AsyncMock()
    return mock


@pytest.fixture
def mock_db():
    """Mock database session."""
    mock = AsyncMock()
    mock.execute = AsyncMock()
    mock.commit = AsyncMock()
    mock.refresh = AsyncMock()
    mock.begin_nested = AsyncMock()
    return mock


@pytest.fixture
async def billing_service(mock_db):
    """Create BillingService with mocked dependencies."""
    return BillingService(mock_db)


class TestBillingService:
    """Test suite for BillingService."""

    @pytest.mark.asyncio
    async def test_get_credits_from_cache(self, billing_service, mock_redis, monkeypatch):
        """Test getting credits from Redis cache."""
        monkeypatch.setattr(billing_service, "_get_redis", AsyncMock(return_value=mock_redis))
        mock_redis.get.return_value = "100"

        credits = await billing_service.get_credits(str(uuid4()))

        assert credits == 100
        mock_redis.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_credits_from_db(self, billing_service, mock_redis, mock_db, monkeypatch):
        """Test falling back to database when cache miss."""
        workspace_id = uuid4()
        monkeypatch.setattr(billing_service, "_get_redis", AsyncMock(return_value=mock_redis))
        mock_redis.get.return_value = None

        # Mock database result
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = 50
        mock_db.execute.return_value = mock_result

        credits = await billing_service.get_credits(str(workspace_id))

        assert credits == 50
        mock_redis.setex.assert_called_once()

    @pytest.mark.asyncio
    async def test_deduct_credits_success(self, billing_service, mock_redis, mock_db, monkeypatch):
        """Test successful credit deduction."""
        workspace_id = uuid4()
        monkeypatch.setattr(billing_service, "_get_redis", AsyncMock(return_value=mock_redis))

        # Mock database result
        mock_billing = WorkspaceBilling(
            id=uuid4(),
            workspace_id=workspace_id,
            tier="free",
            credits_remaining=50,
            credits_limit=50,
        )
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = mock_billing
        mock_db.execute.return_value = mock_result
        
        # Mock begin_nested context manager
        mock_db.begin_nested.return_value.__aenter__ = AsyncMock()
        mock_db.begin_nested.return_value.__aexit__ = AsyncMock()

        success = await billing_service.deduct_credits(str(workspace_id), 5)

        assert success is True
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_deduct_credits_insufficient(self, billing_service, mock_db):
        """Test credit deduction with insufficient credits."""
        workspace_id = uuid4()

        # Mock database result with only 3 credits
        mock_billing = WorkspaceBilling(
            id=uuid4(),
            workspace_id=workspace_id,
            tier="free",
            credits_remaining=3,
            credits_limit=50,
        )
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = mock_billing
        mock_db.execute.return_value = mock_result
        
        # Mock begin_nested context manager
        mock_db.begin_nested.return_value.__aenter__ = AsyncMock()
        mock_db.begin_nested.return_value.__aexit__ = AsyncMock()

        success = await billing_service.deduct_credits(str(workspace_id), 5)

        assert success is False

    @pytest.mark.asyncio
    async def test_check_eligibility(self, billing_service, mock_db):
        """Test feature eligibility check."""
        workspace_id = uuid4()

        # Mock database result
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = "free"
        mock_db.execute.return_value = mock_result

        # Can access basic feature
        assert await billing_service.check_eligibility(str(workspace_id), "basic_generation")

        # Cannot access advanced feature
        assert not await billing_service.check_eligibility(str(workspace_id), "advanced_generation")


class TestBillingConfig:
    """Test suite for BillingConfig."""

    def test_get_action_costs(self):
        """Test getting costs for different actions."""
        assert BillingConfig.get_cost(ActionType.COPY_GENERATION) == 1
        assert BillingConfig.get_cost(ActionType.IMAGE_GENERATION) == 5
        assert BillingConfig.get_cost(ActionType.VIDEO_GENERATION) == 20

    def test_tier_configurations(self):
        """Test tier configurations."""
        free_config = BillingConfig.get_tier_config(SubscriptionTier.FREE)
        assert free_config["monthly_credits"] == 50
        assert free_config["max_workspaces"] == 1

        pro_config = BillingConfig.get_tier_config(SubscriptionTier.PRO)
        assert pro_config["monthly_credits"] == 1000
        assert pro_config["max_workspaces"] == 5

    def test_feature_access(self):
        """Test feature access by tier."""
        assert BillingConfig.can_access_feature(SubscriptionTier.FREE, "basic_generation")
        assert not BillingConfig.can_access_feature(SubscriptionTier.FREE, "advanced_generation")
        assert BillingConfig.can_access_feature(SubscriptionTier.PRO, "advanced_generation")

    def test_get_monthly_credits(self):
        """Test getting monthly credit limits."""
        assert BillingConfig.get_monthly_credits(SubscriptionTier.FREE) == 50
        assert BillingConfig.get_monthly_credits(SubscriptionTier.PRO) == 1000
        assert BillingConfig.get_monthly_credits(SubscriptionTier.ENTERPRISE) == -1
