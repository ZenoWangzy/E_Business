"""
API Dependencies for FastAPI.

Provides dependency injection for authentication and database access.
"""
from typing import Annotated
from uuid import UUID

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.base import get_db
from app.models.user import User


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    session_token: str | None = Cookie(default=None, alias="authjs.session-token"),
    secure_session_token: str | None = Cookie(default=None, alias="__Secure-authjs.session-token"),
) -> User:
    """
    Get the current authenticated user from JWT session cookie.
    
    NextAuth v5 sends session token via cookie. In production (HTTPS),
    the cookie name is '__Secure-authjs.session-token'. In development (HTTP),
    it's 'authjs.session-token'.
    
    Args:
        db: Database session.
        session_token: Development session cookie.
        secure_session_token: Production session cookie (HTTPS).
        
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
    
    # Use secure token in production, fallback to regular token in dev
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
