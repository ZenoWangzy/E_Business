"""
[IDENTITY]: Admin User Management Schemas
DTOs for System Admin operations (User Management, Task Retry).

[INPUT]:
- Pydantic Models for Request Bodies (Update, Retry).

[LINK]:
- AdminRouter -> ../api/v1/endpoints/admin.py
- UserModel -> ../models/user.py

[OUTPUT]: CamelCase JSON Responses for Admin Dashboard.
[POS]: /backend/app/schemas/admin_users.py

[PROTOCOL]:
1. All outputs must use `CamelCaseModel` to support the React Admin Dashboard (camelCase default).
2. `TaskHistoryItem` aggregates multiple task types (Image, Video, Copy).
"""
from datetime import datetime
from typing import Optional, Literal
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase for JSON output."""
    components = string.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


class CamelCaseModel(BaseModel):
    """Base model that outputs camelCase JSON keys."""
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )


# =============================================================================
# User Management Schemas
# =============================================================================

class AdminUserListItem(CamelCaseModel):
    """User item for admin user list."""
    id: UUID
    email: str
    name: Optional[str] = None
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
    workspace_count: int = 0


class AdminUserListResponse(BaseModel):
    """Paginated response for user list."""
    items: list[AdminUserListItem]
    total: int
    page: int
    page_size: int
    has_more: bool


class WorkspaceBrief(CamelCaseModel):
    """Brief workspace info for user detail."""
    id: UUID
    name: str
    slug: str
    role: str  # UserRole value
    joined_at: datetime


class AdminUserDetail(CamelCaseModel):
    """Detailed user information for admin view."""
    id: UUID
    email: str
    name: Optional[str] = None
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
    workspaces: list[WorkspaceBrief] = []


class AdminUserUpdate(CamelCaseModel):
    """Schema for updating user via admin API."""
    is_active: Optional[bool] = Field(None, description="Activate or deactivate user")
    is_superuser: Optional[bool] = Field(None, description="Promote or demote superuser status")


# =============================================================================
# Task History Schemas
# =============================================================================

class TaskType(str, Enum):
    """Types of tasks that can be tracked."""
    IMAGE = "image"
    VIDEO = "video"
    COPY = "copy"


class TaskStatus(str, Enum):
    """Task status values."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskHistoryItem(CamelCaseModel):
    """Single task history entry."""
    id: UUID
    task_type: TaskType
    status: TaskStatus
    created_at: datetime
    updated_at: datetime
    error_message: Optional[str] = None
    workspace_id: UUID
    workspace_name: Optional[str] = None


class TaskHistoryResponse(BaseModel):
    """Paginated task history response."""
    items: list[TaskHistoryItem]
    total: int
    page: int
    page_size: int
    has_more: bool


# =============================================================================
# Task Retry Schemas
# =============================================================================

class TaskRetryRequest(BaseModel):
    """Request body for task retry (optional, can include override params)."""
    force: bool = Field(False, description="Force retry even if task is not in FAILED state")


class TaskRetryResponse(BaseModel):
    """Response for task retry operation."""
    success: bool
    task_id: UUID
    new_task_id: Optional[UUID] = None
    message: str
    status: str  # New status after retry
