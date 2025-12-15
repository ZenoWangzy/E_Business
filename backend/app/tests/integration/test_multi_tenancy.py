import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.main import app
from app.models.user import User, Workspace, WorkspaceMember
from app.models.asset import Asset
from app.core.database import get_db


class TestMultiTenancyIsolation:
    """测试多租户数据隔离功能"""

    @pytest.mark.asyncio
    async def test_workspace_isolation_enforced(self, async_client: AsyncClient):
        """验证工作区之间的数据隔离"""
        # Create two users and their workspaces
        user1_token = "user1_token"
        user2_token = "user2_token"

        workspace1_id = 1
        workspace2_id = 2

        # User 1 uploads a file to workspace 1
        file_content1 = b"File content for workspace 1"
        response1 = await async_client.post(
            f"/api/v1/workspaces/{workspace1_id}/assets/",
            files={"file": ("doc1.pdf", file_content1, "application/pdf")},
            headers={"Authorization": f"Bearer {user1_token}"}
        )
        assert response1.status_code == 201
        asset1_id = response1.json()["id"]

        # User 2 uploads a file to workspace 2
        file_content2 = b"File content for workspace 2"
        response2 = await async_client.post(
            f"/api/v1/workspaces/{workspace2_id}/assets/",
            files={"file": ("doc2.pdf", file_content2, "application/pdf")},
            headers={"Authorization": f"Bearer {user2_token}"}
        )
        assert response2.status_code == 201
        asset2_id = response2.json()["id"]

        # User 1 should only see assets from workspace 1
        response3 = await async_client.get(
            f"/api/v1/workspaces/{workspace1_id}/assets/",
            headers={"Authorization": f"Bearer {user1_token}"}
        )
        assert response3.status_code == 200
        assets1 = response3.json()
        assert len(assets1) == 1
        assert assets1[0]["id"] == asset1_id
        assert assets1[0]["workspace_id"] == workspace1_id

        # User 2 should only see assets from workspace 2
        response4 = await async_client.get(
            f"/api/v1/workspaces/{workspace2_id}/assets/",
            headers={"Authorization": f"Bearer {user2_token}"}
        )
        assert response4.status_code == 200
        assets2 = response4.json()
        assert len(assets2) == 1
        assert assets2[0]["id"] == asset2_id
        assert assets2[0]["workspace_id"] == workspace2_id

    @pytest.mark.asyncio
    async def test_cross_workspace_access_blocked(self, async_client: AsyncClient):
        """验证跨工作区访问被阻止"""
        user1_token = "user1_token"
        user2_token = "user2_token"

        workspace1_id = 1
        workspace2_id = 2

        # User 1 uploads to workspace 1
        file_content = b"Sensitive document"
        response = await async_client.post(
            f"/api/v1/workspaces/{workspace1_id}/assets/",
            files={"file": ("secret.pdf", file_content, "application/pdf")},
            headers={"Authorization": f"Bearer {user1_token}"}
        )
        assert response.status_code == 201
        asset_id = response.json()["id"]

        # User 2 tries to access User 1's asset in workspace 1 (should fail)
        response = await async_client.get(
            f"/api/v1/workspaces/{workspace1_id}/assets/{asset_id}",
            headers={"Authorization": f"Bearer {user2_token}"}
        )
        assert response.status_code == 403
        assert "Insufficient permissions" in response.json()["detail"]

        # User 2 tries to delete User 1's asset (should fail)
        response = await async_client.delete(
            f"/api/v1/workspaces/{workspace1_id}/assets/{asset_id}",
            headers={"Authorization": f"Bearer {user2_token}"}
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_workspace_member_permissions(self, async_client: AsyncClient):
        """验证工作区成员权限控制"""
        owner_token = "owner_token"
        member_token = "member_token"
        viewer_token = "viewer_token"

        workspace_id = 1

        # Owner uploads a file
        response = await async_client.post(
            f"/api/v1/workspaces/{workspace_id}/assets/",
            files={"file": ("shared.pdf", b"Shared content", "application/pdf")},
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 201
        asset_id = response.json()["id"]

        # Member can view the file
        response = await async_client.get(
            f"/api/v1/workspaces/{workspace_id}/assets/",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        assets = response.json()
        assert len(assets) == 1
        assert assets[0]["id"] == asset_id

        # Member can upload files
        response = await async_client.post(
            f"/api/v1/workspaces/{workspace_id}/assets/",
            files={"file": ("member_file.pdf", b"Member content", "application/pdf")},
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 201

        # Viewer can view but not upload
        response = await async_client.get(
            f"/api/v1/workspaces/{workspace_id}/assets/",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 200
        assert len(response.json()) >= 2  # Can see existing files

        response = await async_client.post(
            f"/api/v1/workspaces/{workspace_id}/assets/",
            files={"file": ("viewer_file.pdf", b"Viewer content", "application/pdf")},
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_workspace_id_isolation_in_database(self, db_session: AsyncSession):
        """验证数据库层面的工作区隔离"""
        # Create test data
        user1 = User(id=1, email="user1@example.com", hashed_password="hash")
        user2 = User(id=2, email="user2@example.com", hashed_password="hash")

        workspace1 = Workspace(id=1, name="WS1", slug="ws1", owner_id=1)
        workspace2 = Workspace(id=2, name="WS2", slug="ws2", owner_id=2)

        db_session.add_all([user1, user2, workspace1, workspace2])
        await db_session.commit()

        # Create assets in different workspaces
        asset1 = Asset(
            filename="asset1.pdf",
            original_filename="asset1.pdf",
            content_type="application/pdf",
            file_size=1024,
            workspace_id=1,
            uploaded_by=1
        )

        asset2 = Asset(
            filename="asset2.pdf",
            original_filename="asset2.pdf",
            content_type="application/pdf",
            file_size=1024,
            workspace_id=2,
            uploaded_by=2
        )

        db_session.add_all([asset1, asset2])
        await db_session.commit()

        # Verify isolation
        stmt = select(Asset).where(Asset.workspace_id == 1)
        result = await db_session.execute(stmt)
        ws1_assets = result.scalars().all()
        assert len(ws1_assets) == 1
        assert ws1_assets[0].workspace_id == 1

        stmt = select(Asset).where(Asset.workspace_id == 2)
        result = await db_session.execute(stmt)
        ws2_assets = result.scalars().all()
        assert len(ws2_assets) == 1
        assert ws2_assets[0].workspace_id == 2

    @pytest.mark.asyncio
    async def test_unauthorized_workspace_access(self, async_client: AsyncClient):
        """验证未授权的工作区访问"""
        unauthorized_token = "unauthorized_token"
        workspace_id = 1

        # Try to access assets without workspace membership
        response = await async_client.get(
            f"/api/v1/workspaces/{workspace_id}/assets/",
            headers={"Authorization": f"Bearer {unauthorized_token}"}
        )
        assert response.status_code == 403

        # Try to upload without workspace membership
        response = await async_client.post(
            f"/api/v1/workspaces/{workspace_id}/assets/",
            files={"file": ("test.pdf", b"content", "application/pdf")},
            headers={"Authorization": f"Bearer {unauthorized_token}"}
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_workspace_context_persistence(self, async_client: AsyncClient):
        """验证工作区上下文在整个请求周期中保持一致"""
        user_token = "user_token"
        workspace_id = 1

        # Upload file and verify workspace_id is correctly stored
        file_content = b"Test content"
        response = await async_client.post(
            f"/api/v1/workspaces/{workspace_id}/assets/",
            files={"file": ("test.pdf", file_content, "application/pdf")},
            headers={
                "Authorization": f"Bearer {user_token}",
                "X-Workspace-ID": str(workspace_id)
            }
        )
        assert response.status_code == 201

        # Verify the returned asset has correct workspace_id
        asset = response.json()
        assert asset["workspace_id"] == workspace_id

        # Retrieve the asset and verify workspace_id is still correct
        response = await async_client.get(
            f"/api/v1/workspaces/{workspace_id}/assets/{asset['id']}",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200

        retrieved_asset = response.json()
        assert retrieved_asset["workspace_id"] == workspace_id

    @pytest.mark.asyncio
    async def test_workspace_id_header_validation(self, async_client: AsyncClient):
        """验证工作区ID头部验证"""
        user_token = "user_token"

        # Missing workspace header
        response = await async_client.get(
            "/api/v1/workspaces/assets/",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 404  # Route not found without workspace_id

        # Invalid workspace ID format
        response = await async_client.get(
            "/api/v1/workspaces/invalid/assets/",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 422  # Validation error

        # Non-existent workspace
        response = await async_client.get(
            "/api/v1/workspaces/99999/assets/",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 404  # Workspace not found


@pytest.fixture
async def test_data_setup(db_session: AsyncSession):
    """设置测试数据"""
    # Create test users
    users = [
        User(id=1, email="user1@test.com", hashed_password="hash1"),
        User(id=2, email="user2@test.com", hashed_password="hash2"),
        User(id=3, email="user3@test.com", hashed_password="hash3"),
    ]

    # Create test workspaces
    workspaces = [
        Workspace(id=1, name="Workspace 1", slug="ws1", owner_id=1),
        Workspace(id=2, name="Workspace 2", slug="ws2", owner_id=2),
    ]

    # Create workspace members
    members = [
        WorkspaceMember(workspace_id=1, user_id=2, role="MEMBER"),
        WorkspaceMember(workspace_id=1, user_id=3, role="VIEWER"),
    ]

    db_session.add_all(users + workspaces + members)
    await db_session.commit()
    await db_session.refresh_all()

    yield

    # Cleanup
    await db_session.execute(WorkspaceMember.__table__.delete())
    await db_session.execute(Asset.__table__.delete())
    await db_session.execute(Workspace.__table__.delete())
    await db_session.execute(User.__table__.delete())
    await db_session.commit()