"""
[IDENTITY]: Audit Log Schemas
DTOs for Audit History display.

[INPUT]: None (Audit logs are generated system-side).

[LINK]:
- AuditModel -> ../models/audit.py
- AuditService -> ../services/audit.py

[OUTPUT]: AuditLogRead (Expanded with actor names).
[POS]: /backend/app/schemas/audit.py

[PROTOCOL]:
1. `AuditLogRead` includes computed fields (actor_email) not in DB model, populated by Service.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import ConfigDict

from app.models.audit import AuditAction
from app.schemas.workspace import CamelCaseModel


class AuditLogBase(CamelCaseModel):
    """Base schema for audit logs."""
    action: AuditAction
    resource_type: str
    resource_id: Optional[UUID] = None
    target_user_id: Optional[UUID] = None
    extra_data: Optional[dict] = None


class AuditLogRead(AuditLogBase):
    """Schema for reading audit logs."""
    id: UUID
    actor_id: Optional[UUID]
    workspace_id: UUID
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    
    # Optional expanded fields
    actor_email: Optional[str] = None
    target_user_email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AuditLogListResponse(CamelCaseModel):
    """Response for listing audit logs."""
    items: list[AuditLogRead]
    total: int
    skip: int
    limit: int
