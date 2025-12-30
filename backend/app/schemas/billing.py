"""
[IDENTITY]: Billing Schemas
DTOs for Subscription Status and Credit Usage.

[INPUT]: None (Read-only Dashboard).

[LINK]:
- BillingRouter -> ../api/v1/endpoints/billing.py
- BillingService -> ../services/billing_service.py

[OUTPUT]: SubscriptionDetailsResponse.
[POS]: /backend/app/schemas/billing.py

[PROTOCOL]:
1. `features` list dictates UI capabilities (e.g. "4k_video", "bulk_copy").
"""
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


class CreditUsage(BaseModel):
    """Credit usage information."""
    
    total: int = Field(..., description="Total monthly credit limit")
    used: int = Field(..., description="Credits used this period")
    remaining: int = Field(..., description="Credits remaining")

    class Config:
        from_attributes = True


class SubscriptionDetailsResponse(BaseModel):
    """Subscription details with credit usage."""
    
    tier: str = Field(..., description="Subscription tier: FREE, PRO, or ENTERPRISE")
    credits: CreditUsage = Field(..., description="Credit usage information")
    period_end: datetime = Field(..., description="Current billing period end date")
    renewal_date: Optional[datetime] = Field(None, description="Next renewal date")
    features: Optional[List[str]] = Field(None, description="Available features for this tier")

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class QuotaCheckResponse(BaseModel):
    """Response for quota check endpoint."""
    
    has_credits: bool = Field(..., description="Whether workspace has sufficient credits")
    remaining_credits: int = Field(..., description="Remaining credits")
    required_credits: int = Field(..., description="Credits required for action")
    tier: str = Field(..., description="Current subscription tier")
