"""
Authentication endpoints.

Provides login endpoint for credentials-based authentication.
OAuth flow is handled by NextAuth on the frontend.
"""
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.security import create_access_token, verify_password
from app.db.base import get_db
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    """Login request body."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Token response for successful login."""
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """User info response."""
    id: str
    email: str
    name: str | None
    is_active: bool

    model_config = {"from_attributes": True}


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User login with email and password",
    description="Authenticate user with email/password and return JWT token. "
                "This endpoint is used by NextAuth's CredentialsProvider.",
)
async def login(
    login_data: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """
    Authenticate user and return access token.
    
    This endpoint is called by NextAuth CredentialsProvider to validate
    user credentials. The returned token is then managed by NextAuth.
    
    Args:
        login_data: Email and password.
        db: Database session.
        
    Returns:
        JWT access token.
        
    Raises:
        HTTPException: 401 if credentials are invalid.
    """
    # Find user by email
    result = await db.execute(
        select(User).where(User.email == login_data.email)
    )
    user = result.scalar_one_or_none()
    
    # Validate user exists and password matches
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    if not user.hashed_password:
        # User registered via OAuth, cannot use password login
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please use OAuth to sign in",
        )
    
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    
    # Create access token
    settings = get_settings()
    access_token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        extra_data={"email": user.email, "name": user.name},
    )
    
    return TokenResponse(access_token=access_token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user info",
    description="Return the currently authenticated user's information.",
)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """
    Get current user information.
    
    Requires valid NextAuth session cookie.
    
    Args:
        current_user: Current authenticated user from dependency.
        
    Returns:
        Current user info.
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        is_active=current_user.is_active,
    )
