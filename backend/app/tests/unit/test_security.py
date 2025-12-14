"""
Unit tests for security module.
"""
import pytest
from datetime import timedelta

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_token,
    ALGORITHM,
)


class TestPasswordHashing:
    """Tests for password hashing functions."""

    def test_get_password_hash_returns_string(self):
        """Password hash should return a string."""
        password = "test_password_123"
        hashed = get_password_hash(password)
        assert isinstance(hashed, str)
        assert len(hashed) > 0

    def test_get_password_hash_different_from_plain(self):
        """Hash should be different from plain password."""
        password = "test_password_123"
        hashed = get_password_hash(password)
        assert hashed != password

    def test_same_password_produces_different_hashes(self):
        """Each hash should be unique due to salt."""
        password = "test_password_123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        # bcrypt uses random salt, so hashes should differ
        assert hash1 != hash2

    def test_verify_password_correct(self):
        """Correct password should verify successfully."""
        password = "correct_password"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Incorrect password should fail verification."""
        password = "correct_password"
        hashed = get_password_hash(password)
        assert verify_password("wrong_password", hashed) is False

    def test_verify_empty_password(self):
        """Empty password should fail against non-empty hash."""
        password = "non_empty_password"
        hashed = get_password_hash(password)
        assert verify_password("", hashed) is False


class TestJwtToken:
    """Tests for JWT token functions."""

    def test_create_access_token_returns_string(self):
        """Access token should be a string."""
        token = create_access_token(subject="user123")
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_access_token_with_custom_expiry(self):
        """Token should work with custom expiry."""
        token = create_access_token(
            subject="user123",
            expires_delta=timedelta(hours=1)
        )
        assert isinstance(token, str)
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user123"

    def test_create_access_token_with_extra_data(self):
        """Extra data should be included in token."""
        extra = {"email": "test@example.com", "name": "Test User"}
        token = create_access_token(
            subject="user123",
            extra_data=extra
        )
        payload = decode_token(token)
        assert payload is not None
        assert payload["email"] == "test@example.com"
        assert payload["name"] == "Test User"

    def test_decode_token_valid(self):
        """Valid token should decode successfully."""
        token = create_access_token(subject="user456")
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user456"
        assert "exp" in payload
        assert "iat" in payload

    def test_decode_token_invalid(self):
        """Invalid token should return None."""
        payload = decode_token("invalid.token.here")
        assert payload is None

    def test_decode_token_empty(self):
        """Empty token should return None."""
        payload = decode_token("")
        assert payload is None

    def test_decode_token_malformed(self):
        """Malformed token should return None."""
        payload = decode_token("not-a-jwt")
        assert payload is None

    def test_algorithm_is_hs256(self):
        """Algorithm should be HS256 for NextAuth compatibility."""
        assert ALGORITHM == "HS256"
