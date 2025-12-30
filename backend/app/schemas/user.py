"""
[IDENTITY]: User Schemas
User creation and response schemas for authentication.

[INPUT]:
- User data for registration.

[LINK]:
- Security -> ../core/security.py (password validation)
- User Model -> ../models/user.py

[OUTPUT]: Validated Pydantic models for API.
[POS]: /backend/app/schemas/user.py

[PROTOCOL]:
1. Password is validated using `validate_password_strength` at API layer.
2. Email is validated by `pydantic.EmailStr`.
"""
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    """User registration request."""
    email: EmailStr
    password: str  # Validated using validate_password_strength at endpoint
    name: str
