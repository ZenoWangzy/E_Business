"""
[IDENTITY]: Billing Configuration Management
Subscription tiers, credit costs, and feature access rules for billing system.

[INPUT]:
- Subscription Tier: Enum or string value from User model
- Action Type: Enum of billable actions

[LINK]:
- User Model -> app.models.user.SubscriptionTier
- Billing Service -> app.services.billing_service (usage)
- Quota Middleware -> app.api.deps.quota (enforcement)

[OUTPUT]:
- Credit costs for actions
- Tier configurations (limits, features)
- Feature access permissions

[POS]: /backend/app/core/billing_config.py

[PROTOCOL]:
1. **Credit Costs**: Define in ACTION_COSTS dictionary
2. **Tier Limits**: Define in TIER_CONFIGS dictionary
3. **Helper Methods**: Use BillingConfig static methods for queries
4. **Defaults**: FREE tier as fallback for invalid tiers
"""
from enum import Enum
from typing import Dict, Any, List

from app.models.user import SubscriptionTier


class ActionType(str, Enum):
    """Types of billable actions with associated credit costs."""
    COPY_GENERATION = "copy_generation"
    IMAGE_GENERATION = "image_generation"
    VIDEO_GENERATION = "video_generation"


# Credit costs for each action type
ACTION_COSTS: Dict[ActionType, int] = {
    ActionType.COPY_GENERATION: 1,
    ActionType.IMAGE_GENERATION: 5,
    ActionType.VIDEO_GENERATION: 20,
}


# Tier configurations with limits and features
TIER_CONFIGS: Dict[SubscriptionTier, Dict[str, Any]] = {
    SubscriptionTier.FREE: {
        "max_workspaces": 1,
        "monthly_credits": 50,
        "api_speed": "standard",
        "features": ["basic_generation"],
        "rate_limit": "10/hour",
    },
    SubscriptionTier.PRO: {
        "max_workspaces": 5,
        "monthly_credits": 1000,
        "api_speed": "fast",
        "features": ["basic_generation", "advanced_generation", "priority_queue"],
        "rate_limit": "100/hour",
    },
    SubscriptionTier.ENTERPRISE: {
        "max_workspaces": -1,  # Unlimited
        "monthly_credits": -1,  # Custom/Unlimited
        "api_speed": "priority",
        "features": ["basic_generation", "advanced_generation", "priority_queue", "custom_models", "dedicated_support"],
        "rate_limit": "1000/hour",
    },
}


class BillingConfig:
    """Configuration helper for billing and subscription management."""

    @staticmethod
    def get_cost(action: ActionType) -> int:
        """Get credit cost for an action type.
        
        Args:
            action: The action type to get cost for.
            
        Returns:
            Credit cost for the action, or 0 if action not found.
        """
        return ACTION_COSTS.get(action, 0)

    @staticmethod
    def get_tier_config(tier: SubscriptionTier | str) -> Dict[str, Any]:
        """Get configuration for a subscription tier.
        
        Args:
            tier: Subscription tier enum or string value.
            
        Returns:
            Tier configuration dictionary.
        """
        if isinstance(tier, str):
            try:
                tier = SubscriptionTier(tier)
            except ValueError:
                return TIER_CONFIGS[SubscriptionTier.FREE]
        return TIER_CONFIGS.get(tier, TIER_CONFIGS[SubscriptionTier.FREE])

    @staticmethod
    def can_access_feature(tier: SubscriptionTier | str, feature: str) -> bool:
        """Check if a tier has access to a specific feature.
        
        Args:
            tier: Subscription tier enum or string value.
            feature: Feature name to check.
            
        Returns:
            True if tier has access to feature, False otherwise.
        """
        config = BillingConfig.get_tier_config(tier)
        return feature in config.get("features", [])

    @staticmethod
    def get_monthly_credits(tier: SubscriptionTier | str) -> int:
        """Get monthly credit limit for a tier.
        
        Args:
            tier: Subscription tier enum or string value.
            
        Returns:
            Monthly credit limit, or -1 for unlimited.
        """
        config = BillingConfig.get_tier_config(tier)
        return config.get("monthly_credits", 50)

    @staticmethod
    def get_all_features(tier: SubscriptionTier | str) -> List[str]:
        """Get all features available for a tier.
        
        Args:
            tier: Subscription tier enum or string value.
            
        Returns:
            List of available feature names.
        """
        config = BillingConfig.get_tier_config(tier)
        return config.get("features", [])
