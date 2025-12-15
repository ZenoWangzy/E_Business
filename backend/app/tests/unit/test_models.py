"""
Unit tests for User, Workspace, and WorkspaceMember models.
Tests AC: Verify models have correct fields and relationships.
"""
import pytest
import uuid
from datetime import datetime
from app.models.user import User, Workspace, WorkspaceMember, UserRole


class TestUserModel:
    """Test suite for User model."""

    def test_user_fields_exist(self):
        """Test User model has all required fields."""
        user = User(
            email="test@example.com",
            hashed_password="hashed123",
            name="Test User"
        )
        
        assert user.email == "test@example.com"
        assert user.hashed_password == "hashed123"
        assert user.name == "Test User"

    def test_user_is_active_default_configured(self):
        """Test User is_active column has default=True configured."""
        # SQLAlchemy defaults are evaluated on flush, not instantiation
        # Verify column configuration instead
        is_active_col = User.__table__.c.is_active
        assert is_active_col.default.arg is True

    def test_user_id_is_uuid(self):
        """Test User id field defaults to UUID."""
        user = User(email="test@example.com")
        # Column has default=uuid.uuid4, but not evaluated until flush
        # Test that the column type is configured correctly
        assert User.__table__.c.id.type.__class__.__name__ == "UUID"

    def test_user_email_is_indexed(self):
        """Test email column is indexed for lookups."""
        assert User.__table__.c.email.index is True

    def test_user_email_is_unique(self):
        """Test email column is unique."""
        assert User.__table__.c.email.unique is True


class TestWorkspaceModel:
    """Test suite for Workspace model."""

    def test_workspace_fields_exist(self):
        """Test Workspace model has all required fields."""
        workspace = Workspace(
            name="My Workspace",
            slug="my-workspace"
        )
        
        assert workspace.name == "My Workspace"
        assert workspace.slug == "my-workspace"

    def test_workspace_slug_is_indexed(self):
        """Test slug column is indexed for lookups."""
        assert Workspace.__table__.c.slug.index is True

    def test_workspace_slug_is_unique(self):
        """Test slug column is unique."""
        assert Workspace.__table__.c.slug.unique is True


class TestWorkspaceMemberModel:
    """Test suite for WorkspaceMember association model."""

    def test_workspace_member_role_default_configured(self):
        """Test WorkspaceMember role column has MEMBER as default."""
        # SQLAlchemy defaults are evaluated on flush, not instantiation
        # Verify column configuration instead
        role_col = WorkspaceMember.__table__.c.role
        assert role_col.default.arg == UserRole.MEMBER

    def test_user_role_enum_values(self):
        """Test UserRole enum has correct values."""
        assert UserRole.OWNER.value == "owner"
        assert UserRole.ADMIN.value == "admin"
        assert UserRole.MEMBER.value == "member"
        assert UserRole.VIEWER.value == "viewer"


class TestModelRelationships:
    """Test suite for model relationships."""

    def test_user_has_workspaces_relationship(self):
        """Test User model has workspaces relationship."""
        assert hasattr(User, "workspaces")

    def test_workspace_has_members_relationship(self):
        """Test Workspace model has members relationship."""
        assert hasattr(Workspace, "members")

    def test_workspace_member_has_user_relationship(self):
        """Test WorkspaceMember has user relationship."""
        assert hasattr(WorkspaceMember, "user")

    def test_workspace_member_has_workspace_relationship(self):
        """Test WorkspaceMember has workspace relationship."""
        assert hasattr(WorkspaceMember, "workspace")
