"""
[IDENTITY]: Authentication Endpoints
Handles Credentials Login and User Session Retrieval.

[INPUT]:
- LoginRequest (Email/Password).
- Session Token (for /me).

[LINK]:
- DB_User -> ../../../models/user.py
- Crypto -> ../../../core/security.py

[OUTPUT]: JWT Token (Login) or User Profile (Me).
[POS]: /backend/app/api/v1/endpoints/auth.py

[PROTOCOL]:
1. OAuth-registered users (no hashed_password) MUST NOT use password login.
2. Returns standard OAuth2 Bearer token format.
"""
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.security import create_access_token, get_password_hash, validate_password_strength, verify_password
from app.db.base import get_db
from app.models.user import User
from app.schemas.user import UserCreate

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Rate limiter for auth endpoints
limiter = Limiter(key_func=get_remote_address)


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


class RegisterResponse(BaseModel):
    """Registration success response."""
    id: str
    email: str
    name: str | None
    message: str = "注册成功"


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="User registration",
    description="Register a new user with email, password, and name.",
)
@limiter.limit("5/minute")  # Rate limit: 5 registrations per minute per IP
async def register(
    request: Request,  # Required for rate limiter
    register_data: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RegisterResponse:
    """
    Register a new user.
    
    Creates a new user account with the provided email, password, and name.
    The password is validated for strength and then hashed before storage.
    
    Args:
        register_data: Email, password, and name.
        db: Database session.
        
    Returns:
        Newly created user info.
        
    Raises:
        HTTPException: 400 if password is weak or email already exists.
    """
    # Validate password strength
    is_valid, error_msg = validate_password_strength(register_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )
    
    # Hash password
    hashed_password = get_password_hash(register_data.password)
    
    # Create user
    new_user = User(
        email=register_data.email,
        hashed_password=hashed_password,
        name=register_data.name,
        is_active=True,
    )
    
    try:
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已被注册",
        )
    
    return RegisterResponse(
        id=str(new_user.id),
        email=new_user.email,
        name=new_user.name,
    )

