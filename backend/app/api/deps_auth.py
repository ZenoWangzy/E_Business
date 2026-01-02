"""
API Dependencies for FastAPI.

Provides dependency injection for authentication and database access.
"""
from typing import Annotated, Callable
from uuid import UUID

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.base import get_db
from app.models.user import User, Workspace, WorkspaceMember, UserRole


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    session_token: str | None = Cookie(default=None, alias="authjs.session-token"),
    secure_session_token: str | None = Cookie(default=None, alias="__Secure-authjs.session-token"),
    authorization: str | None = Header(default=None),
) -> User:
    """
    Get the current authenticated user from JWT session cookie or Authorization header.
    
    NextAuth v5 sends session token via cookie. In production (HTTPS),
    the cookie name is '__Secure-authjs.session-token'. In development (HTTP),
    it's 'authjs.session-token'.
    
    Additionally, supports Bearer token in Authorization header for API calls
    from frontend that cannot use cookies (e.g., fetch with custom headers).
    
    Args:
        db: Database session.
        session_token: Development session cookie.
        secure_session_token: Production session cookie (HTTPS).
        authorization: Authorization header value (Bearer token).
        
    Returns:
        The authenticated User object.
        
    Raises:
        HTTPException: 401 if not authenticated or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Priority: Authorization header > Secure cookie > Regular cookie
    token = None
    
    # Check Authorization header first (Bearer token)
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]  # Remove "Bearer " prefix
    else:
        # Fallback to cookie-based auth
        token = secure_session_token or session_token
    
    if not token:
        raise credentials_exception
    
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    
    # NextAuth stores user info in 'sub' or 'email' depending on config
    user_id: str | None = payload.get("sub")
    user_email: str | None = payload.get("email")
    
    if not user_id and not user_email:
        raise credentials_exception
    
    # Try to find user by ID first, then by email
    user = None
    if user_id:
        try:
            user_uuid = UUID(user_id)
            result = await db.execute(select(User).where(User.id == user_uuid))
            user = result.scalar_one_or_none()
        except ValueError:
            # user_id is not a valid UUID, try as email
            pass
    
    if not user and user_email:
        result = await db.execute(select(User).where(User.email == user_email))
        user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    
    return user


# Type alias for dependency injection
CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_current_workspace_member(
    workspace_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WorkspaceMember:
    """
    Get the membership record for the current user in the specified workspace.
    
    Verifies that:
    1. Workspace exists
    2. User is a member of the workspace
    
    Args:
        workspace_id: UUID from path parameter.
        current_user: Authenticated user.
        db: Database session.
        
    Returns:
        WorkspaceMember record (includes role).
        
    Raises:
        HTTPException: 404 if workspace not found or user not a member 
                       (to avoid leaking workspace existence).
    """
    from app.models.user import WorkspaceMember
    
    # Query for membership
    # We join Workspace to ensure it exists and to eagerly load it if possible
    # But for now a direct query on WorkspaceMember is sufficient as it has FKs
    query = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == current_user.id
    )
    result = await db.execute(query)
    member = result.scalar_one_or_none()
    
    if not member:
        # Use 404 to hide workspace existence from non-members
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )
        
    return member


CurrentWorkspaceMember = Annotated[WorkspaceMember, Depends(get_current_workspace_member)]


async def get_current_workspace(
    member: CurrentWorkspaceMember,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Workspace:
    """
    Get the current workspace object.
    
    Requires valid membership (checked by get_current_workspace_member).
    """
    from app.models.user import Workspace
    
    # We could have eager loaded this in the member query, but simpler to fetch if not attached/loaded
    # If using ORM lazy loading with async, we need to be careful.
    # Ideally, get_current_workspace_member could join Workspace.
    
    if member.workspace:
        return member.workspace
        
    result = await db.execute(select(Workspace).where(Workspace.id == member.workspace_id))
    workspace = result.scalar_one_or_none()
    
    if not workspace:
         # Should not happen due to FK integrity, but safe check
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )
        
    return workspace


def require_workspace_role(required_roles: list[UserRole]) -> Callable:
    """
    Factory for dependency that checks if user has one of the required roles.
    
    Usage:
        Depends(require_workspace_role([UserRole.OWNER, UserRole.ADMIN]))
    """
    def check_role(member: CurrentWorkspaceMember) -> WorkspaceMember:
        if member.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this workspace",
            )
        return member
        
    return check_role


async def get_current_superuser(
    current_user: CurrentUser,
) -> User:
    """
    Require system-level superuser access for admin endpoints.
    
    Args:
        current_user: Authenticated user from get_current_user dependency.
        
    Returns:
        The authenticated superuser.
        
    Raises:
        HTTPException: 403 if user is not a superuser.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required",
        )
    return current_user


# Type alias for superuser dependency injection
CurrentSuperuser = Annotated[User, Depends(get_current_superuser)]


__all__ = [
    "get_current_user",
    "get_current_workspace_member",
    "get_current_workspace",
    "require_workspace_role",
    "get_current_superuser",
    "CurrentUser",
    "CurrentWorkspaceMember",
    "CurrentSuperuser",
]

