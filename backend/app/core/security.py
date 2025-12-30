"""
[IDENTITY]: Security Primitives
Encryption, Hashing, and JWT Utilities.

[INPUT]:
- Plaintext Password, JWT Claims.

[LINK]:
- Config -> ./config.py (Secrets)
- Passlib -> package:bcrypt
- Jose -> package:python-jose

[OUTPUT]: Hashed Strings, Encoded Tokens.
[POS]: /backend/app/core/security.py

[PROTOCOL]:
1. **Hashing**: Use `bcrypt` with random salts for all passwords.
2. **Tokens**: Use `HS256` for signing (compatible with NextAuth).
3. **Expiration**: Mandate `exp` claim check.
"""
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings


# JWT Algorithm - HS256 for shared secret (NextAuth compatible)
ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    
    Args:
        plain_password: The plain text password to verify.
        hashed_password: The bcrypt hashed password to compare against.
        
    Returns:
        True if password matches, False otherwise.
    """
    try:
        password_bytes = plain_password.encode("utf-8")
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        return False




def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength.
    
    Requirements:
    - At least 8 characters long
    - Contains at least one number or special character (recommended)
    
    Args:
        password: The password to validate.
        
    Returns:
        Tuple of (is_valid: bool, error_message: str)
    """
    if len(password) < 8:
        return False, "密码至少需要8个字符"
    
    # Recommended: check for numbers or special characters
    has_number_or_special = any(
        c.isdigit() or not c.isalnum() for c in password
    )
    if not has_number_or_special:
        return False, "密码需要包含至少一个数字或特殊字符"
    
    return True, ""


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Note: Password strength validation should be done at the API endpoint layer
    before calling this function. This keeps validation logic centralized.
    
    Args:
        password: The plain text password to hash.
        
    Returns:
        The bcrypt hashed password.
    """
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def create_access_token(
    subject: str | int,
    expires_delta: timedelta | None = None,
    extra_data: dict[str, Any] | None = None,
) -> str:
    """
    Create a JWT access token.
    
    Args:
        subject: The subject (typically user ID) to encode in the token.
        expires_delta: Optional custom expiration time.
        extra_data: Optional additional data to include in the token.
        
    Returns:
        Encoded JWT token string.
    """
    settings = get_settings()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    
    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    
    if extra_data:
        to_encode.update(extra_data)
    
    encoded_jwt = jwt.encode(to_encode, settings.auth_secret, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict[str, Any] | None:
    """
    Decode and verify a JWT token.
    
    This function is used to verify tokens issued by NextAuth (configured for JWS)
    or tokens created by this backend. Validates expiration time.
    
    Args:
        token: The JWT token string to decode.
        
    Returns:
        The decoded token payload if valid and not expired, None otherwise.
    """
    settings = get_settings()
    
    try:
        # Decode with expiration verification enabled
        payload = jwt.decode(
            token,
            settings.auth_secret,
            algorithms=[ALGORITHM],
            options={"verify_exp": True}  # Verify expiration time
        )
        return payload
    except JWTError:
        # Token is invalid, malformed, or expired
        return None
