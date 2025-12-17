"""
Integration Tests for Reference Image Attachment (Story 2.4)
Tests the complete flow from upload to generation with reference image
"""

import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.asset import Asset
from app.models.product import Product
from app.models.image import ImageGenerationJob, JobStatus, StyleType
from app.core.config import get_settings

settings = get_settings()


@pytest.mark.asyncio
async def test_generate_images_with_reference(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    test_workspace: Workspace
):
    """Test image generation with reference image attachment."""

    # Create workspace member
    member = WorkspaceMember(
        workspace_id=test_workspace.id,
        user_id=test_user.id,
        role="owner"
    )
    db_session.add(member)
    await db_session.commit()

    # Create test product
    product = Product(
        id=uuid.uuid4(),
        workspace_id=test_workspace.id,
        name="Test Product",
        category="electronics"
    )
    db_session.add(product)
    await db_session.commit()

    # Create reference asset
    reference_asset = Asset(
        id=uuid.uuid4(),
        workspace_id=test_workspace.id,
        name="reference.jpg",
        mime_type="image/jpeg",
        size=1024 * 1024,  # 1MB
        content=b"fake_image_content"
    )
    db_session.add(reference_asset)
    await db_session.commit()

    # Get auth token
    login_response = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user.email,
            "password": "testpassword123"
        }
    )
    assert login_response.status_code == 200
    auth_data = login_response.json()
    token = auth_data["access_token"]

    # Test generation with reference image
    generation_request = {
        "style_id": StyleType.MODERN,
        "category_id": "electronics",
        "asset_id": uuid.uuid4(),  # Mock asset ID
        "product_id": str(product.id),
        "reference_image_id": str(reference_asset.id)
    }

    response = await async_client.post(
        f"/api/v1/images/workspaces/{test_workspace.id}/generate",
        json=generation_request,
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 202
    data = response.json()
    assert "task_id" in data
    assert data["status"] == JobStatus.PENDING

    # Verify job was created with reference image
    job_result = await db_session.execute(
        select(ImageGenerationJob).where(
            ImageGenerationJob.task_id == uuid.UUID(data["task_id"])
        )
    )
    job = job_result.scalar_one()
    assert job.reference_image_id == reference_asset.id
    assert job.product_id == product.id
    assert job.style_id == StyleType.MODERN


@pytest.mark.asyncio
async def test_generate_images_with_invalid_reference(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    test_workspace: Workspace
):
    """Test generation with invalid reference image ID."""

    # Create workspace member
    member = WorkspaceMember(
        workspace_id=test_workspace.id,
        user_id=test_user.id,
        role="owner"
    )
    db_session.add(member)
    await db_session.commit()

    # Create test product
    product = Product(
        id=uuid.uuid4(),
        workspace_id=test_workspace.id,
        name="Test Product",
        category="electronics"
    )
    db_session.add(product)
    await db_session.commit()

    # Get auth token
    login_response = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user.email,
            "password": "testpassword123"
        }
    )
    assert login_response.status_code == 200
    auth_data = login_response.json()
    token = auth_data["access_token"]

    # Test generation with non-existent reference image
    fake_reference_id = uuid.uuid4()
    generation_request = {
        "style_id": StyleType.MODERN,
        "category_id": "electronics",
        "asset_id": uuid.uuid4(),
        "product_id": str(product.id),
        "reference_image_id": str(fake_reference_id)
    }

    response = await async_client.post(
        f"/api/v1/images/workspaces/{test_workspace.id}/generate",
        json=generation_request,
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 404
    assert "Reference image not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_generate_images_with_non_image_reference(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    test_workspace: Workspace
):
    """Test generation with non-image reference file."""

    # Create workspace member
    member = WorkspaceMember(
        workspace_id=test_workspace.id,
        user_id=test_user.id,
        role="owner"
    )
    db_session.add(member)
    await db_session.commit()

    # Create test product
    product = Product(
        id=uuid.uuid4(),
        workspace_id=test_workspace.id,
        name="Test Product",
        category="electronics"
    )
    db_session.add(product)
    await db_session.commit()

    # Create non-image reference asset
    reference_asset = Asset(
        id=uuid.uuid4(),
        workspace_id=test_workspace.id,
        name="reference.txt",
        mime_type="text/plain",
        size=1024,
        content=b"fake_text_content"
    )
    db_session.add(reference_asset)
    await db_session.commit()

    # Get auth token
    login_response = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user.email,
            "password": "testpassword123"
        }
    )
    assert login_response.status_code == 200
    auth_data = login_response.json()
    token = auth_data["access_token"]

    # Test generation with text file as reference
    generation_request = {
        "style_id": StyleType.MODERN,
        "category_id": "electronics",
        "asset_id": uuid.uuid4(),
        "product_id": str(product.id),
        "reference_image_id": str(reference_asset.id)
    }

    response = await async_client.post(
        f"/api/v1/images/workspaces/{test_workspace.id}/generate",
        json=generation_request,
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 400
    assert "Reference file must be an image" in response.json()["detail"]


@pytest.mark.asyncio
async def test_generate_images_without_reference(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    test_workspace: Workspace
):
    """Test generation without reference image (original functionality)."""

    # Create workspace member
    member = WorkspaceMember(
        workspace_id=test_workspace.id,
        user_id=test_user.id,
        role="owner"
    )
    db_session.add(member)
    await db_session.commit()

    # Create test product
    product = Product(
        id=uuid.uuid4(),
        workspace_id=test_workspace.id,
        name="Test Product",
        category="electronics"
    )
    db_session.add(product)
    await db_session.commit()

    # Get auth token
    login_response = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user.email,
            "password": "testpassword123"
        }
    )
    assert login_response.status_code == 200
    auth_data = login_response.json()
    token = auth_data["access_token"]

    # Test generation without reference image
    generation_request = {
        "style_id": StyleType.MODERN,
        "category_id": "electronics",
        "asset_id": uuid.uuid4(),
        "product_id": str(product.id)
        # No reference_image_id
    }

    response = await async_client.post(
        f"/api/v1/images/workspaces/{test_workspace.id}/generate",
        json=generation_request,
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 202
    data = response.json()
    assert "task_id" in data
    assert data["status"] == JobStatus.PENDING

    # Verify job was created without reference image
    job_result = await db_session.execute(
        select(ImageGenerationJob).where(
            ImageGenerationJob.task_id == uuid.UUID(data["task_id"])
        )
    )
    job = job_result.scalar_one()
    assert job.reference_image_id is None


@pytest.mark.asyncio
async def test_workspace_isolation_for_reference_images(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_user: User,
    test_workspace: Workspace
):
    """Test that reference images are isolated to their workspace."""

    # Create another workspace
    other_workspace = Workspace(
        id=uuid.uuid4(),
        name="Other Workspace",
        created_by=test_user.id
    )
    db_session.add(other_workspace)
    await db_session.commit()

    # Create member for main workspace only
    member = WorkspaceMember(
        workspace_id=test_workspace.id,
        user_id=test_user.id,
        role="owner"
    )
    db_session.add(member)
    await db_session.commit()

    # Create reference asset in other workspace
    reference_asset = Asset(
        id=uuid.uuid4(),
        workspace_id=other_workspace.id,  # Different workspace!
        name="reference.jpg",
        mime_type="image/jpeg",
        size=1024 * 1024,
        content=b"fake_image_content"
    )
    db_session.add(reference_asset)
    await db_session.commit()

    # Create test product in main workspace
    product = Product(
        id=uuid.uuid4(),
        workspace_id=test_workspace.id,
        name="Test Product",
        category="electronics"
    )
    db_session.add(product)
    await db_session.commit()

    # Get auth token
    login_response = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user.email,
            "password": "testpassword123"
        }
    )
    assert login_response.status_code == 200
    auth_data = login_response.json()
    token = auth_data["access_token"]

    # Try to use reference image from other workspace
    generation_request = {
        "style_id": StyleType.MODERN,
        "category_id": "electronics",
        "asset_id": uuid.uuid4(),
        "product_id": str(product.id),
        "reference_image_id": str(reference_asset.id)
    }

    response = await async_client.post(
        f"/api/v1/images/workspaces/{test_workspace.id}/generate",
        json=generation_request,
        headers={"Authorization": f"Bearer {token}"}
    )

    # Should fail due to workspace isolation
    assert response.status_code == 404
    assert "Reference image not found or access denied" in response.json()["detail"]