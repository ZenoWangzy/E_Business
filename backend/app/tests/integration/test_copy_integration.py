"""
Integration tests for Copy Generation workflow.
"""

import pytest
import uuid
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone
from httpx import AsyncClient

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.copy import (
    CopyGenerationJob,
    CopyResult,
    CopyQuota,
    CopyType,
    Tone,
    Audience,
    Length,
    JobStatus
)
from app.models.product import Product, ProductCategory
from app.models.asset import Asset
from app.schemas.copy import CopyGenerationRequest, GenerationConfig


class TestCopyGenerationIntegration:
    """Integration tests for copy generation workflow."""

    @pytest.mark.asyncio
    async def test_copy_generation_full_workflow(
        self,
        async_client: AsyncClient,
        db: AsyncSession,
        test_user,
        test_workspace,
        member_headers
    ):
        """Test the complete copy generation workflow from API to database."""
        # Arrange
        # Create a test asset
        asset = Asset(
            workspace_id=test_workspace.id,
            name="test_product.jpg",
            mime_type="image/jpeg",
            size=1024000,
            content="Premium wireless headphones with noise cancellation",
            preview="High-quality audio experience"
        )
        db.add(asset)
        await db.commit()

        # Create a test product
        product = Product(
            workspace_id=test_workspace.id,
            name="Premium Wireless Headphones",
            category=ProductCategory.ELECTRONICS,
            original_asset_id=asset.id
        )
        db.add(product)
        await db.commit()

        # Create quota for workspace
        quota = CopyQuota(
            workspace_id=test_workspace.id,
            monthly_limit=100,
            used_current_month=0
        )
        db.add(quota)
        await db.commit()

        # Prepare request
        request_data = CopyGenerationRequest(
            type=CopyType.TITLES,
            config=GenerationConfig(
                tone=Tone.PROFESSIONAL,
                audience=Audience.B2C,
                length=Length.SHORT
            ),
            context={"category": "electronics"}
        )

        # Act - Trigger copy generation
        with patch('app.tasks.copy_tasks.generate_copy_task.delay') as mock_task:
            mock_task.return_value = MagicMock()

            response = await async_client.post(
                f"/api/v1/copy/workspaces/{test_workspace.id}/products/{product.id}/generate",
                json=request_data.dict(),
                headers=member_headers
            )

        # Assert API response
        assert response.status_code == 202
        data = response.json()
        assert "task_id" in data
        assert data["status"] == JobStatus.PENDING

        # Verify database state
        result = await db.execute(
            select(CopyGenerationJob).where(
                CopyGenerationJob.task_id == uuid.UUID(data["task_id"])
            )
        )
        job = result.scalar_one_or_none()
        assert job is not None
        assert job.product_id == product.id
        assert job.copy_type == CopyType.TITLES
        assert job.tone == Tone.PROFESSIONAL
        assert job.audience == Audience.B2C
        assert job.length == Length.SHORT

        # Verify quota was decremented
        result = await db.execute(
            select(CopyQuota).where(CopyQuota.workspace_id == test_workspace.id)
        )
        updated_quota = result.scalar_one()
        assert updated_quota.used_current_month == 1

    @pytest.mark.asyncio
    async def test_copy_generation_quota_exceeded(
        self,
        async_client: AsyncClient,
        db: AsyncSession,
        test_user,
        test_workspace,
        member_headers
    ):
        """Test copy generation when quota is exceeded."""
        # Arrange
        # Create a test asset and product
        asset = Asset(
            workspace_id=test_workspace.id,
            name="test_product.jpg",
            mime_type="image/jpeg",
            size=1024000
        )
        db.add(asset)
        await db.commit()

        product = Product(
            workspace_id=test_workspace.id,
            name="Test Product",
            category=ProductCategory.OTHER,
            original_asset_id=asset.id
        )
        db.add(product)
        await db.commit()

        # Create quota with no remaining allowance
        quota = CopyQuota(
            workspace_id=test_workspace.id,
            monthly_limit=10,
            used_current_month=10  # Already at limit
        )
        db.add(quota)
        await db.commit()

        # Prepare request
        request_data = CopyGenerationRequest(
            type=CopyType.DESCRIPTIONS,
            config=GenerationConfig(
                tone=Tone.CASUAL,
                audience=Audience.B2C,
                length=Length.MEDIUM
            )
        )

        # Act
        response = await async_client.post(
            f"/api/v1/copy/workspaces/{test_workspace.id}/products/{product.id}/generate",
            json=request_data.dict(),
            headers=member_headers
        )

        # Assert
        assert response.status_code == 429
        assert "quota exceeded" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_copy_generation_product_not_found(
        self,
        async_client: AsyncClient,
        member_headers
    ):
        """Test copy generation with non-existent product."""
        # Arrange
        workspace_id = uuid.uuid4()
        product_id = uuid.uuid4()
        request_data = CopyGenerationRequest(
            type=CopyType.FAQ,
            config=GenerationConfig(
                tone=Tone.PROFESSIONAL,
                audience=Audience.B2B,
                length=Length.LONG
            )
        )

        # Act
        response = await async_client.post(
            f"/api/v1/copy/workspaces/{workspace_id}/products/{product_id}/generate",
            json=request_data.dict(),
            headers=member_headers
        )

        # Assert
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_copy_job_status_tracking(
        self,
        async_client: AsyncClient,
        db: AsyncSession,
        test_user,
        test_workspace,
        member_headers
    ):
        """Test tracking copy generation job status."""
        # Arrange
        # Create a test job
        task_id = uuid.uuid4()
        asset = Asset(
            workspace_id=test_workspace.id,
            name="test.jpg",
            mime_type="image/jpeg",
            size=1024
        )
        db.add(asset)
        await db.commit()

        product = Product(
            workspace_id=test_workspace.id,
            name="Test Product",
            category=ProductCategory.OTHER,
            original_asset_id=asset.id
        )
        db.add(product)
        await db.commit()

        job = CopyGenerationJob(
            workspace_id=test_workspace.id,
            user_id=test_user.id,
            product_id=product.id,
            task_id=task_id,
            copy_type=CopyType.SELLING_POINTS,
            tone=Tone.PLAYFUL,
            audience=Audience.B2C,
            length=Length.SHORT,
            status=JobStatus.PENDING,
            progress=0
        )
        db.add(job)
        await db.commit()

        # Act - Check initial status
        response = await async_client.get(
            f"/api/v1/copy/workspaces/{test_workspace.id}/jobs/{task_id}",
            headers=member_headers
        )

        # Assert initial status
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == JobStatus.PENDING
        assert data["progress"] == 0
        assert data["results"] is None

        # Update job to processing
        job.status = JobStatus.PROCESSING
        job.progress = 50
        job.started_at = datetime.now(timezone.utc)
        await db.commit()

        # Act - Check processing status
        response = await async_client.get(
            f"/api/v1/copy/workspaces/{test_workspace.id}/jobs/{task_id}",
            headers=member_headers
        )

        # Assert processing status
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == JobStatus.PROCESSING
        assert data["progress"] == 50

        # Update job to completed with results
        job.status = JobStatus.COMPLETED
        job.progress = 100
        job.completed_at = datetime.now(timezone.utc)
        job.raw_results = [
            "Premium Quality - Unmatched Excellence",
            "Innovative Design - Modern Solution",
            "Trusted by Thousands - Customer Favorite"
        ]
        await db.commit()

        # Act - Check completed status
        response = await async_client.get(
            f"/api/v1/copy/workspaces/{test_workspace.id}/jobs/{task_id}",
            headers=member_headers
        )

        # Assert completed status
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == JobStatus.COMPLETED
        assert data["progress"] == 100
        assert len(data["results"]) == 3
        assert "Premium Quality" in data["results"][0]

    @pytest.mark.asyncio
    async def test_save_copy_results(
        self,
        async_client: AsyncClient,
        db: AsyncSession,
        test_user,
        test_workspace,
        member_headers
    ):
        """Test saving and managing copy results."""
        # Arrange
        # Create a completed job
        task_id = uuid.uuid4()
        asset = Asset(
            workspace_id=test_workspace.id,
            name="test.jpg",
            mime_type="image/jpeg",
            size=1024
        )
        db.add(asset)
        await db.commit()

        product = Product(
            workspace_id=test_workspace.id,
            name="Test Product",
            category=ProductCategory.OTHER,
            original_asset_id=asset.id
        )
        db.add(product)
        await db.commit()

        job = CopyGenerationJob(
            workspace_id=test_workspace.id,
            user_id=test_user.id,
            product_id=product.id,
            task_id=task_id,
            copy_type=CopyType.TITLES,
            tone=Tone.PROFESSIONAL,
            audience=Audience.B2B,
            length=Length.MEDIUM,
            status=JobStatus.COMPLETED,
            progress=100
        )
        db.add(job)
        await db.commit()

        # Save a copy result
        result = CopyResult(
            workspace_id=test_workspace.id,
            generation_job_id=job.id,
            product_id=product.id,
            content="Professional Grade Product - Industry Leading Solution",
            copy_type=CopyType.TITLES,
            generation_config={
                "tone": "professional",
                "audience": "b2b",
                "length": "medium"
            },
            is_favorite=False
        )
        db.add(result)
        await db.commit()

        # Act - Get results
        response = await async_client.get(
            f"/api/v1/copy/workspaces/{test_workspace.id}/products/{product.id}/results",
            headers=member_headers
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 1
        assert data["results"][0]["content"] == "Professional Grade Product - Industry Leading Solution"
        assert data["results"][0]["is_favorite"] is False

        # Act - Toggle favorite
        response = await async_client.post(
            f"/api/v1/copy/workspaces/{test_workspace.id}/results/{result.id}/favorite",
            headers=member_headers
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["is_favorite"] is True

        # Verify in database
        await db.refresh(result)
        assert result.is_favorite is True

    @pytest.mark.asyncio
    async def test_quota_usage_endpoint(
        self,
        async_client: AsyncClient,
        db: AsyncSession,
        test_workspace,
        member_headers
    ):
        """Test quota usage endpoint."""
        # Arrange
        quota = CopyQuota(
            workspace_id=test_workspace.id,
            monthly_limit=100,
            used_current_month=42
        )
        db.add(quota)
        await db.commit()

        # Act
        response = await async_client.get(
            f"/api/v1/copy/workspaces/{test_workspace.id}/quota",
            headers=member_headers
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 100
        assert data["used"] == 42
        assert data["remaining"] == 58