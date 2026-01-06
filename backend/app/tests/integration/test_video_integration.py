"""
Integration tests for Video Script & Storyboard Generation.
Story 4.2: Script & Storyboard AI Service
"""

import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from httpx import AsyncClient

from app.models.video import (
    VideoProject, VideoGenerationJob, Video,
    VideoMode, VideoProjectStatus, VideoStatus
)
from app.models.user import User, Workspace
from app.models.product import Product, ProductCategory
from app.models.asset import Asset
from app.models.image import JobStatus


class TestVideoIntegration:
    """Integration tests for video generation workflow."""

    @pytest.mark.asyncio
    async def test_create_video_project(
        self,
        db: AsyncSession,
        test_user: User,
        test_workspace: Workspace,
        member_headers: dict
    ):
        """Test creating a video project."""
        # Create original asset for product
        original_asset = Asset(
            workspace_id=test_workspace.id,
            name="product_image.jpg",
            mime_type="image/jpeg",
            size=2048
        )
        db.add(original_asset)
        await db.flush()

        # Create product
        product = Product(
            workspace_id=test_workspace.id,
            name="Test Product",
            category=ProductCategory.ELECTRONICS,
            original_asset_id=original_asset.id
        )
        db.add(product)
        await db.flush()

        # Create video project
        video_project = VideoProject(
            workspace_id=test_workspace.id,
            user_id=test_user.id,
            product_id=product.id,
            mode=VideoMode.CREATIVE_AD,
            target_duration=30,
            status=VideoProjectStatus.PENDING
        )
        db.add(video_project)
        await db.commit()
        await db.refresh(video_project)

        # Verify project was created
        assert video_project.id is not None
        assert video_project.workspace_id == test_workspace.id
        assert video_project.user_id == test_user.id
        assert video_project.product_id == product.id
        assert video_project.mode == VideoMode.CREATIVE_AD
        assert video_project.target_duration == 30
        assert video_project.status == VideoProjectStatus.PENDING

    @pytest.mark.asyncio
    async def test_create_video_generation_job(
        self,
        db: AsyncSession,
        test_user: User,
        test_workspace: Workspace,
        member_headers: dict
    ):
        """Test creating a video generation job."""
        # Create original asset for product
        original_asset = Asset(
            workspace_id=test_workspace.id,
            name="product_image.jpg",
            mime_type="image/jpeg",
            size=2048
        )
        db.add(original_asset)
        await db.flush()

        # Create product
        product = Product(
            workspace_id=test_workspace.id,
            name="Test Product",
            category=ProductCategory.ELECTRONICS,
            original_asset_id=original_asset.id
        )
        db.add(product)
        await db.flush()

        # Create video project
        video_project = VideoProject(
            workspace_id=test_workspace.id,
            user_id=test_user.id,
            product_id=product.id,
            mode=VideoMode.FUNCTIONAL_INTRO,
            target_duration=15,
            status=VideoProjectStatus.PENDING
        )
        db.add(video_project)
        await db.flush()

        # Create generation job
        task_id = uuid.uuid4()
        job = VideoGenerationJob(
            workspace_id=test_workspace.id,
            user_id=test_user.id,
            video_project_id=video_project.id,
            task_id=task_id,
            status=JobStatus.PENDING,
            generation_config={
                "mode": "functional_intro",
                "target_duration": 15,
                "product_id": str(product.id)
            }
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)

        # Verify job was created
        assert job.id is not None
        assert job.task_id == task_id
        assert job.workspace_id == test_workspace.id
        assert job.video_project_id == video_project.id
        assert job.status == JobStatus.PENDING
        assert job.generation_config["mode"] == "functional_intro"

    @pytest.mark.asyncio
    async def test_video_project_status_transitions(
        self,
        db: AsyncSession,
        test_user: User,
        test_workspace: Workspace,
        member_headers: dict
    ):
        """Test video project status transitions."""
        # Create original asset for product
        original_asset = Asset(
            workspace_id=test_workspace.id,
            name="product_image.jpg",
            mime_type="image/jpeg",
            size=2048
        )
        db.add(original_asset)
        await db.flush()

        # Create product
        product = Product(
            workspace_id=test_workspace.id,
            name="Test Product",
            category=ProductCategory.ELECTRONICS,
            original_asset_id=original_asset.id
        )
        db.add(product)
        await db.flush()

        # Create video project
        video_project = VideoProject(
            workspace_id=test_workspace.id,
            user_id=test_user.id,
            product_id=product.id,
            mode=VideoMode.CREATIVE_AD,
            target_duration=30,
            status=VideoProjectStatus.PENDING
        )
        db.add(video_project)
        await db.commit()

        # Transition to PROCESSING
        video_project.status = VideoProjectStatus.PROCESSING
        await db.commit()
        await db.refresh(video_project)
        assert video_project.status == VideoProjectStatus.PROCESSING

        # Transition to SCRIPT_READY
        video_project.status = VideoProjectStatus.SCRIPT_READY
        video_project.script = [{"scene": 1, "text": "Test script"}]
        video_project.storyboard = [{"scene": 1, "description": "Test storyboard"}]
        await db.commit()
        await db.refresh(video_project)
        assert video_project.status == VideoProjectStatus.SCRIPT_READY
        assert video_project.script is not None
        assert video_project.storyboard is not None

        # Transition to COMPLETED
        video_project.status = VideoProjectStatus.COMPLETED
        await db.commit()
        await db.refresh(video_project)
        assert video_project.status == VideoProjectStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_multi_tenant_data_isolation(
        self,
        db: AsyncSession,
        test_user: User,
        test_workspace: Workspace,
        member_headers: dict
    ):
        """Test that video projects are properly isolated by workspace."""
        # Create another workspace
        workspace2 = Workspace(
            name="Another Workspace",
            slug=f"another-ws-{uuid.uuid4().hex[:8]}"
        )
        db.add(workspace2)
        await db.flush()

        # Create original assets for products
        asset1 = Asset(
            workspace_id=test_workspace.id,
            name="product1.jpg",
            mime_type="image/jpeg",
            size=2048
        )
        asset2 = Asset(
            workspace_id=workspace2.id,
            name="product2.jpg",
            mime_type="image/jpeg",
            size=2048
        )
        db.add(asset1)
        db.add(asset2)
        await db.flush()

        # Create products in different workspaces
        product1 = Product(
            workspace_id=test_workspace.id,
            name="Product in Workspace 1",
            category=ProductCategory.ELECTRONICS,
            original_asset_id=asset1.id
        )
        product2 = Product(
            workspace_id=workspace2.id,
            name="Product in Workspace 2",
            category=ProductCategory.HOME,
            original_asset_id=asset2.id
        )
        db.add(product1)
        db.add(product2)
        await db.flush()

        # Create video projects in different workspaces
        video_project1 = VideoProject(
            workspace_id=test_workspace.id,
            user_id=test_user.id,
            product_id=product1.id,
            mode=VideoMode.CREATIVE_AD,
            target_duration=30,
            status=VideoProjectStatus.PENDING
        )
        video_project2 = VideoProject(
            workspace_id=workspace2.id,
            user_id=test_user.id,
            product_id=product2.id,
            mode=VideoMode.FUNCTIONAL_INTRO,
            target_duration=15,
            status=VideoProjectStatus.PENDING
        )
        db.add(video_project1)
        db.add(video_project2)
        await db.commit()

        # Test isolation - workspace1 should only see its projects
        projects_result = await db.execute(
            select(VideoProject).where(VideoProject.workspace_id == test_workspace.id)
        )
        projects = projects_result.scalars().all()

        assert len(projects) == 1
        assert projects[0].id == video_project1.id
        assert projects[0].workspace_id == test_workspace.id

        # Workspace2 should only see its projects
        projects_result2 = await db.execute(
            select(VideoProject).where(VideoProject.workspace_id == workspace2.id)
        )
        projects2 = projects_result2.scalars().all()

        assert len(projects2) == 1
        assert projects2[0].id == video_project2.id
        assert projects2[0].workspace_id == workspace2.id

    @pytest.mark.asyncio
    async def test_video_creation_and_status(
        self,
        db: AsyncSession,
        test_user: User,
        test_workspace: Workspace,
        member_headers: dict
    ):
        """Test creating a Video (rendered output) and tracking status."""
        # Create original asset for product
        original_asset = Asset(
            workspace_id=test_workspace.id,
            name="product_image.jpg",
            mime_type="image/jpeg",
            size=2048
        )
        db.add(original_asset)
        await db.flush()

        # Create product
        product = Product(
            workspace_id=test_workspace.id,
            name="Test Product",
            category=ProductCategory.ELECTRONICS,
            original_asset_id=original_asset.id
        )
        db.add(product)
        await db.flush()

        # Create video project
        video_project = VideoProject(
            workspace_id=test_workspace.id,
            user_id=test_user.id,
            product_id=product.id,
            mode=VideoMode.CREATIVE_AD,
            target_duration=30,
            status=VideoProjectStatus.SCRIPT_READY
        )
        db.add(video_project)
        await db.flush()

        # Create rendered video
        video = Video(
            project_id=video_project.id,
            workspace_id=test_workspace.id,
            user_id=test_user.id,
            title="Test Video",
            status=VideoStatus.PENDING
        )
        db.add(video)
        await db.commit()
        await db.refresh(video)

        # Verify video was created
        assert video.id is not None
        assert video.title == "Test Video"
        assert video.status == VideoStatus.PENDING

        # Simulate processing
        video.status = VideoStatus.PROCESSING
        video.progress = 50
        await db.commit()
        await db.refresh(video)
        assert video.status == VideoStatus.PROCESSING
        assert video.progress == 50

        # Simulate completion
        video.status = VideoStatus.COMPLETED
        video.progress = 100
        video.video_url = "https://storage.example.com/video.mp4"
        video.duration = 30.0
        video.file_size = 1024 * 1024 * 10  # 10MB
        await db.commit()
        await db.refresh(video)
        
        assert video.status == VideoStatus.COMPLETED
        assert video.progress == 100
        assert video.video_url is not None
        assert video.duration == 30.0