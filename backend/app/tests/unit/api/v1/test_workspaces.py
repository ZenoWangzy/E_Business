"""
Unit tests for workspace endpoints.
"""
import pytest
from unittest.mock import MagicMock, AsyncMock
from uuid import uuid4

from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from app.api.deps import get_current_user, get_db, get_current_workspace
from app.models.user import User, Workspace, WorkspaceMember, UserRole


@pytest.fixture
def client():
    return TestClient(app)


def create_mock_user(id=None, email="test@example.com", name="Test User"):
    user = MagicMock(spec=User)
    user.id = id or uuid4()
    user.email = email
    user.name = name
    user.is_active = True
    return user


class MockAsyncSession:
    def __init__(self):
        self.added = []
        self.committed = False
        self.deleted = []
        
    def add(self, obj):
        from datetime import datetime, timezone
        self.added.append(obj)
        # Simulate defaults
        if hasattr(obj, 'id') and not obj.id:
            obj.id = uuid4()
        if hasattr(obj, 'created_at') and not obj.created_at:
            obj.created_at = datetime.now(timezone.utc)
        if hasattr(obj, 'updated_at') and not obj.updated_at:
            obj.updated_at = datetime.now(timezone.utc)
        if hasattr(obj, 'max_members') and not obj.max_members:
            obj.max_members = 100
        if hasattr(obj, 'is_active') and obj.is_active is None:
            obj.is_active = True
            
    async def commit(self):
        self.committed = True
    
    async def flush(self):
        # Flush writes to DB without committing - simulate by doing nothing
        pass
        
    async def refresh(self, obj):
        pass
    
    async def delete(self, obj):
        self.deleted.append(obj)
        
    async def execute(self, stmt):
        result = MagicMock()
        result.scalars().all.return_value = []
        result.scalar_one_or_none.return_value = None
        result.scalar_one.return_value = 0
        return result


def test_create_workspace(client):
    """Test creating a new workspace."""
    mock_user = create_mock_user()
    mock_db = MockAsyncSession()
    
    async def mock_get_current_user():
        return mock_user
        
    async def mock_get_db():
        yield mock_db

    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_db] = mock_get_db
    
    try:
        response = client.post(
            "/api/v1/workspaces/",
            json={"name": "New Corp", "description": "A test workspace"}
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        # Flat response - direct access to fields (camelCase due to alias_generator)
        assert data["name"] == "New Corp"
        assert data["description"] == "A test workspace"
        assert "id" in data
        
        # Verify DB interactions
        assert len(mock_db.added) >= 2 # Workspace and Member
        workspace = next((x for x in mock_db.added if isinstance(x, Workspace)), None)
        member = next((x for x in mock_db.added if isinstance(x, WorkspaceMember)), None)
        
        assert workspace is not None
        assert member is not None
        assert member.role == UserRole.OWNER
        assert member.user_id == mock_user.id
        
    finally:
        app.dependency_overrides.clear()


def test_list_workspaces(client):
    """Test listing workspaces."""
    from datetime import datetime
    mock_user = create_mock_user()
    
    workspace1 = Workspace(
        id=uuid4(), 
        name="Corp A", 
        slug="corp-a",
        is_active=True,
        max_members=100,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    workspace2 = Workspace(
        id=uuid4(), 
        name="Corp B", 
        slug="corp-b", 
        is_active=True,
        max_members=100,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    mock_db = MockAsyncSession()
    # Mock execute result
    result_mock = MagicMock()
    result_mock.scalars().all.return_value = [workspace1, workspace2]
    
    async def mock_execute(stmt):
        return result_mock
    
    mock_db.execute = mock_execute

    async def mock_get_current_user():
        return mock_user
        
    async def mock_get_db():
        yield mock_db
        
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_db] = mock_get_db
    
    try:
        response = client.get("/api/v1/workspaces/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Flat response - returns list directly
        assert len(data) == 2
        assert data[0]["name"] == "Corp A"
        
    finally:
        app.dependency_overrides.clear()


# =============================================================================
# Role-Based Access Control Tests
# =============================================================================

def test_update_workspace_requires_admin_or_owner(client):
    """Test that updating workspace requires ADMIN or OWNER role."""
    from datetime import datetime, UTC
    mock_user = create_mock_user()
    
    workspace = Workspace(
        id=uuid4(),
        name="Test Corp",
        slug="test-corp",
        is_active=True,
        max_members=100,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )
    
    # User is VIEWER - should be denied
    member = WorkspaceMember(
        id=uuid4(),
        user_id=mock_user.id,
        workspace_id=workspace.id,
        role=UserRole.VIEWER,
        joined_at=datetime.now(UTC)
    )
    
    mock_db = MockAsyncSession()
    
    async def mock_get_current_user():
        return mock_user
    
    async def mock_get_db():
        yield mock_db
    
    async def mock_execute(stmt):
        result = MagicMock()
        result.scalar_one_or_none.return_value = member
        return result
    
    mock_db.execute = mock_execute
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_db] = mock_get_db
    
    try:
        response = client.put(
            f"/api/v1/workspaces/{workspace.id}",
            json={"name": "Updated Name"}
        )
        # Should be 403 Forbidden due to insufficient role
        assert response.status_code == status.HTTP_403_FORBIDDEN
    finally:
        app.dependency_overrides.clear()


def test_delete_workspace_owner_only(client):
    """Test that deleting workspace requires OWNER role."""
    from datetime import datetime, UTC
    mock_user = create_mock_user()
    
    workspace = Workspace(
        id=uuid4(),
        name="Test Corp",
        slug="test-corp",
        is_active=True,
        max_members=100,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )
    
    # User is ADMIN - should be denied for delete
    member = WorkspaceMember(
        id=uuid4(),
        user_id=mock_user.id,
        workspace_id=workspace.id,
        role=UserRole.ADMIN,
        joined_at=datetime.now(UTC)
    )
    
    mock_db = MockAsyncSession()
    
    async def mock_get_current_user():
        return mock_user
    
    async def mock_get_db():
        yield mock_db
        
    async def mock_execute(stmt):
        result = MagicMock()
        result.scalar_one_or_none.return_value = member
        return result
    
    mock_db.execute = mock_execute
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_db] = mock_get_db
    
    try:
        response = client.delete(f"/api/v1/workspaces/{workspace.id}")
        assert response.status_code == status.HTTP_403_FORBIDDEN
    finally:
        app.dependency_overrides.clear()


# =============================================================================
# Invite Lifecycle Tests
# =============================================================================

def test_create_invite_admin_or_owner(client):
    """Test creating invite requires ADMIN or OWNER."""
    from datetime import datetime, UTC
    mock_user = create_mock_user()
    
    workspace = Workspace(
        id=uuid4(),
        name="Test Corp",
        slug="test-corp",
        is_active=True,
        max_members=100,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )
    
    # User is OWNER - should succeed
    member = WorkspaceMember(
        id=uuid4(),
        user_id=mock_user.id,
        workspace_id=workspace.id,
        role=UserRole.OWNER,
        joined_at=datetime.now(UTC)
    )
    member.workspace = workspace
    
    mock_db = MockAsyncSession()
    
    async def mock_get_current_user():
        return mock_user
    
    async def mock_get_db():
        yield mock_db
    
    call_count = [0]
    async def mock_execute(stmt):
        call_count[0] += 1
        result = MagicMock()
        if call_count[0] == 1:
            # First call: get_current_workspace_member
            result.scalar_one_or_none.return_value = member
        elif call_count[0] == 2:
            # Second call: count members
            result.scalar_one.return_value = 5  # Below limit
        elif call_count[0] == 3:
            # Third call: check existing invite
            result.scalar_one_or_none.return_value = None
        elif call_count[0] == 4:
            # Fourth call: check existing user
            result.scalar_one_or_none.return_value = None
        return result
    
    mock_db.execute = mock_execute
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_db] = mock_get_db
    
    try:
        response = client.post(
            f"/api/v1/workspaces/{workspace.id}/invites",
            json={"invited_email": "newuser@example.com", "role": "member"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Flat response - direct access with camelCase
        assert data["invitedEmail"] == "newuser@example.com"
    finally:
        app.dependency_overrides.clear()


def test_invite_fails_when_workspace_full(client):
    """Test that invite fails when workspace reaches max members."""
    from datetime import datetime, UTC
    mock_user = create_mock_user()
    
    workspace = Workspace(
        id=uuid4(),
        name="Full Corp",
        slug="full-corp",
        is_active=True,
        max_members=10,  # Low limit
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )
    
    member = WorkspaceMember(
        id=uuid4(),
        user_id=mock_user.id,
        workspace_id=workspace.id,
        role=UserRole.OWNER,
        joined_at=datetime.now(UTC)
    )
    member.workspace = workspace
    
    mock_db = MockAsyncSession()
    
    async def mock_get_current_user():
        return mock_user
    
    async def mock_get_db():
        yield mock_db
    
    call_count = [0]
    async def mock_execute(stmt):
        call_count[0] += 1
        result = MagicMock()
        if call_count[0] == 1:
            result.scalar_one_or_none.return_value = member
        elif call_count[0] == 2:
            # Member count at max
            result.scalar_one.return_value = 10
        return result
    
    mock_db.execute = mock_execute
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_db] = mock_get_db
    
    try:
        response = client.post(
            f"/api/v1/workspaces/{workspace.id}/invites",
            json={"invited_email": "overflow@example.com"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "limit" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


# =============================================================================
# Edge Case Tests
# =============================================================================

def test_cannot_modify_workspace_owner_role(client):
    """Test that OWNER role cannot be modified by anyone."""
    from datetime import datetime, UTC
    mock_user = create_mock_user()
    owner_id = uuid4()
    
    workspace = Workspace(
        id=uuid4(),
        name="Protected Corp",
        slug="protected-corp",
        is_active=True,
        max_members=100,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )
    
    # Requester is OWNER
    requester_member = WorkspaceMember(
        id=uuid4(),
        user_id=mock_user.id,
        workspace_id=workspace.id,
        role=UserRole.OWNER,
        joined_at=datetime.now(UTC)
    )
    requester_member.workspace = workspace
    
    # Target is also OWNER (same person or another)
    target_member = WorkspaceMember(
        id=uuid4(),
        user_id=owner_id,
        workspace_id=workspace.id,
        role=UserRole.OWNER,
        joined_at=datetime.now(UTC)
    )
    
    mock_db = MockAsyncSession()
    
    async def mock_get_current_user():
        return mock_user
    
    async def mock_get_db():
        yield mock_db
    
    call_count = [0]
    async def mock_execute(stmt):
        call_count[0] += 1
        result = MagicMock()
        if call_count[0] == 1:
            result.scalar_one_or_none.return_value = requester_member
        elif call_count[0] == 2:
            result.scalar_one_or_none.return_value = target_member
        return result
    
    mock_db.execute = mock_execute
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_db] = mock_get_db
    
    try:
        response = client.put(
            f"/api/v1/workspaces/{workspace.id}/members/{owner_id}",
            json={"role": "admin"}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "owner" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_member_not_found(client):
    """Test 404 when workspace or membership doesn't exist."""
    mock_user = create_mock_user()
    mock_db = MockAsyncSession()
    
    async def mock_get_current_user():
        return mock_user
    
    async def mock_get_db():
        yield mock_db
    
    async def mock_execute(stmt):
        result = MagicMock()
        result.scalar_one_or_none.return_value = None  # No membership
        return result
    
    mock_db.execute = mock_execute
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_db] = mock_get_db
    
    try:
        fake_workspace_id = uuid4()
        response = client.get(f"/api/v1/workspaces/{fake_workspace_id}")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    finally:
        app.dependency_overrides.clear()


def test_unauthenticated_access_denied(client):
    """Test that unauthenticated requests are denied."""
    # Don't override get_current_user - let it fail naturally
    response = client.get("/api/v1/workspaces/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

