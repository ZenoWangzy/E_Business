"""
[IDENTITY]: Workspace Schemas
DTOs for Tenancy, Membership, and Invitations.

[INPUT]:
- WorkspaceCreate, WorkspaceMemberCreate (Admin), WorkspaceInviteCreate.

[LINK]:
- WorkspaceRouter -> ../api/v1/endpoints/workspaces.py
- WorkspaceModel -> ../models/user.py

[OUTPUT]: WorkspaceRead, WorkspaceMemberRead.
[POS]: /backend/app/schemas/workspace.py

[PROTOCOL]:
1. `WorkspaceCreate` validation enforces naming conventions (Regex).
2. `to_camel` ensures frontend receives standard camelCase JSON.
"""
import re
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict


from app.models.user import UserRole, InviteStatus


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
# Base Schemas
# =============================================================================

class WorkspaceBase(BaseModel):
    """Base workspace fields."""
    name: str = Field(..., min_length=3, max_length=50, description="Workspace name (3-50 characters)")
    description: Optional[str] = Field(None, max_length=500, description="Optional description (max 500 chars)")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate workspace name format."""
        # Allow alphanumeric, spaces, hyphens, underscores
        if not re.match(r'^[\w\s\-]+$', v, re.UNICODE):
            raise ValueError('Workspace name can only contain letters, numbers, spaces, hyphens, and underscores')
        return v.strip()


class WorkspaceMemberBase(BaseModel):
    """Base workspace member fields."""
    role: UserRole = Field(default=UserRole.MEMBER, description="Member role in workspace")


class WorkspaceInviteBase(BaseModel):
    """Base workspace invite fields."""
    invited_email: EmailStr = Field(..., description="Email address of the invitee")
    role: UserRole = Field(default=UserRole.MEMBER, description="Role to assign upon acceptance")


# =============================================================================
# Create Schemas (Input)
# =============================================================================

class WorkspaceCreate(WorkspaceBase):
    """Schema for creating a new workspace."""
    max_members: int = Field(default=100, ge=1, le=1000, description="Maximum members allowed")


class WorkspaceMemberCreate(BaseModel):
    """Schema for adding a member directly (admin action)."""
    user_id: UUID = Field(..., description="User ID to add as member")
    role: UserRole = Field(default=UserRole.MEMBER, description="Role to assign")


class WorkspaceInviteCreate(WorkspaceInviteBase):
    """Schema for creating a workspace invitation."""
    pass


# =============================================================================
# Update Schemas (Input)
# =============================================================================

class WorkspaceUpdate(BaseModel):
    """Schema for updating workspace settings."""
    name: Optional[str] = Field(None, min_length=3, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    max_members: Optional[int] = Field(None, ge=1, le=1000)
    is_active: Optional[bool] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r'^[\w\s\-]+$', v, re.UNICODE):
            raise ValueError('Workspace name can only contain letters, numbers, spaces, hyphens, and underscores')
        return v.strip()


class WorkspaceMemberUpdate(BaseModel):
    """Schema for updating a member's role."""
    role: UserRole = Field(..., description="New role to assign")


class WorkspaceInviteAccept(BaseModel):
    """Schema for accepting a workspace invitation."""
    pass  # Token is in URL path, no body needed


# =============================================================================
# Read Schemas (Output)
# =============================================================================

class UserBrief(CamelCaseModel):
    """Brief user information for embedding in responses."""
    
    id: UUID
    email: str
    name: Optional[str] = None


class WorkspaceMemberRead(CamelCaseModel):
    """Schema for reading workspace member information."""
    
    id: UUID
    user_id: UUID
    workspace_id: UUID
    role: UserRole
    joined_at: datetime
    user: Optional[UserBrief] = None


class WorkspaceRead(CamelCaseModel):
    """Schema for reading workspace information."""
    
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    max_members: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    member_count: Optional[int] = None  # Computed field


class WorkspaceWithMembers(WorkspaceRead):
    """Workspace with full member list."""
    members: list[WorkspaceMemberRead] = []


class WorkspaceInviteRead(CamelCaseModel):
    """Schema for reading invitation information."""
    
    id: UUID
    workspace_id: UUID
    invited_email: str
    role: UserRole
    token: UUID
    expires_at: datetime
    status: InviteStatus
    inviter_id: Optional[UUID] = None
    created_at: datetime
    accepted_at: Optional[datetime] = None


class WorkspaceInvitePreview(CamelCaseModel):
    """Schema for previewing an invitation (public view)."""
    
    workspace_name: str
    workspace_description: Optional[str] = None
    inviter_name: Optional[str] = None
    role: UserRole
    expires_at: datetime
    is_valid: bool


# =============================================================================
# Response Wrapper Schemas
# =============================================================================

class WorkspaceResponse(BaseModel):
    """Standard response wrapper for workspace operations."""
    data: WorkspaceRead
    message: str = "Success"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class WorkspaceListResponse(BaseModel):
    """Response for listing workspaces."""
    data: list[WorkspaceRead]
    total: int
    message: str = "Success"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class WorkspaceMemberResponse(BaseModel):
    """Response for member operations."""
    data: WorkspaceMemberRead
    message: str = "Success"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class WorkspaceMemberListResponse(BaseModel):
    """Response for listing members."""
    data: list[WorkspaceMemberRead]
    total: int
    message: str = "Success"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class WorkspaceInviteResponse(BaseModel):
    """Response for invite operations."""
    data: WorkspaceInviteRead
    invite_url: Optional[str] = None
    message: str = "Success"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class WorkspaceInviteListResponse(BaseModel):
    """Response for listing invites."""
    data: list[WorkspaceInviteRead]
    total: int
    message: str = "Success"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# Error Response Schemas
# =============================================================================

class ErrorDetail(BaseModel):
    """Detailed error information."""
    code: str
    message: str
    details: Optional[dict] = None


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: ErrorDetail
