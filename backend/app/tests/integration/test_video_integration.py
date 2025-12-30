"""
Integration tests for Video Script & Storyboard Generation.
Story 4.2: Script & Storyboard AI Service
"""

import pytest
import uuid
import asyncio
from unittest.mock import patch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.video import VideoProject, VideoGenerationJob, VideoMode, VideoProjectStatus, JobStatus
from app.models.user import User, Workspace
from app.models.product import Product
from app.schemas.video import ScriptGenerationRequest
from app.services.video_service import VideoService, VideoGenerationError
from app.tasks.video_tasks import generate_script_and_storyboard_task


class TestVideoIntegration:
    """Integration tests for video generation workflow."""

    @pytest.fixture
    async def test_workspace_and_user(self, db_session):
        """Create test workspace and user."""
        workspace = Workspace(
            name="Test Workspace",
            description="Test workspace for video integration",
            owner_id=uuid.uuid4()
        )
        db_session.add(workspace)
        await db_session.flush()

        user = User(
            email="test@example.com",
            username="testuser",
            workspace_id=workspace.id
        )
        db_session.add(user)
        await db_session.commit()

        return workspace, user

    @pytest.fixture
    async def test_product(self, db_session, test_workspace_and_user):
        """Create test product."""
        workspace, user = test_workspace_and_user

        product = Product(
            workspace_id=workspace.id,
            name="Test Product",
            description="A test product for video generation",
            selling_points=["Feature 1", "Feature 2", "Feature 3"],
            category="electronics",
            target_audience="professionals"
        )
        db_session.add(product)
        await db_session.commit()
        await db_session.refresh(product)

        return product

    @pytest.mark.asyncio
    async def test_complete_video_generation_workflow(
        self,
        db_session,
        test_workspace_and_user,
        test_product
    ):
        """Test complete video generation workflow in mock mode."""
        workspace, user = test_workspace_and_user
        product = test_product

        with patch('app.services.video_service.settings') as mock_settings:
            mock_settings.ai_mock_mode = True

            # Create VideoService
            video_service = VideoService(db_session)

            # Create video project
            video_project = VideoProject(
                workspace_id=workspace.id,
                user_id=user.id,
                product_id=product.id,
                mode=VideoMode.CREATIVE_AD,
                target_duration=30,
                status=VideoProjectStatus.PENDING
            )
            db_session.add(video_project)
            await db_session.flush()

            # Create generation job
            job = VideoGenerationJob(
                workspace_id=workspace.id,
                user_id=user.id,
                video_project_id=video_project.id,
                task_id=uuid.uuid4(),
                status=JobStatus.PENDING,
                generation_config={
                    "mode": "creative_ad",
                    "target_duration": 30,
                    "product_id": str(product.id)
                }
            )
            db_session.add(job)
            await db_session.commit()
            await db_session.refresh(job)

            # Process generation
            result = await video_service.process_script_generation(
                job_id=str(job.task_id),
                params={
                    "product_id": str(product.id),
                    "mode": "creative_ad",
                    "target_duration": 30
                }
            )

            # Verify results
            assert "script" in result
            assert "storyboard" in result
            assert len(result["script"]) > 0
            assert len(result["storyboard"]) > 0

            # Verify database state
            await db_session.refresh(video_project)
            await db_session.refresh(job)

            assert video_project.status == VideoProjectStatus.SCRIPT_READY
            assert video_project.script == result["script"]
            assert video_project.storyboard == result["storyboard"]
            assert job.status == JobStatus.COMPLETED
            assert job.progress == 100

    @pytest.mark.asyncio
    async def test_celery_task_integration(
        self,
        db_session,
        test_workspace_and_user,
        test_product
    ):
        """Test Celery task integration."""
        workspace, user = test_workspace_and_user
        product = test_product

        with patch('app.services.video_service.settings') as mock_settings:
            mock_settings.ai_mock_mode = True

            # Create video project and job
            video_project = VideoProject(
                workspace_id=workspace.id,
                user_id=user.id,
                product_id=product.id,
                mode=VideoMode.FUNCTIONAL_INTRO,
                target_duration=15,
                status=VideoProjectStatus.PENDING
            )
            db_session.add(video_project)
            await db_session.flush()

            job = VideoGenerationJob(
                workspace_id=workspace.id,
                user_id=user.id,
                video_project_id=video_project.id,
                task_id=uuid.uuid4(),
                status=JobStatus.PENDING,
                generation_config={
                    "mode": "functional_intro",
                    "target_duration": 15,
                    "product_id": str(product.id)
                }
            )
            db_session.add(job)
            await db_session.commit()
            await db_session.refresh(job)

            # Execute Celery task
            task_result = generate_script_and_storyboard_task(
                job_id=str(job.task_id),
                params={
                    "product_id": str(product.id),
                    "mode": "functional_intro",
                    "target_duration": 15
                }
            )

            # Verify task result
            assert task_result["status"] == "completed"
            assert "result" in task_result
            assert "task_id" in task_result

            # Verify database state
            await db_session.refresh(video_project)
            await db_session.refresh(job)

            assert video_project.status == VideoProjectStatus.SCRIPT_READY
            assert job.status == JobStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_error_handling_workflow(
        self,
        db_session,
        test_workspace_and_user,
        test_product
    ):
        """Test error handling in video generation workflow."""
        workspace, user = test_workspace_and_user
        product = test_product

        with patch('app.services.video_service.settings') as mock_settings:
            mock_settings.ai_mock_mode = False  # Use real mode for error testing

            # Mock OpenAI to raise an exception
            with patch('app.services.video_service.openai') as mock_openai:
                mock_openai.OpenAI.return_value.chat.completions.create.side_effect = Exception("API Error")

                video_service = VideoService(db_session)

                # Create video project and job
                video_project = VideoProject(
                    workspace_id=workspace.id,
                    user_id=user.id,
                    product_id=product.id,
                    mode=VideoMode.CREATIVE_AD,
                    target_duration=30,
                    status=VideoProjectStatus.PENDING
                )
                db_session.add(video_project)
                await db_session.flush()

                job = VideoGenerationJob(
                    workspace_id=workspace.id,
                    user_id=user.id,
                    video_project_id=video_project.id,
                    task_id=uuid.uuid4(),
                    status=JobStatus.PENDING,
                    generation_config={
                        "mode": "creative_ad",
                        "target_duration": 30,
                        "product_id": str(product.id)
                    }
                )
                db_session.add(job)
                await db_session.commit()
                await db_session.refresh(job)

                # Process generation should fail
                with pytest.raises(VideoGenerationError):
                    await video_service.process_script_generation(
                        job_id=str(job.task_id),
                        params={
                            "product_id": str(product.id),
                            "mode": "creative_ad",
                            "target_duration": 30
                        }
                    )

                # Verify error state
                await db_session.refresh(video_project)
                await db_session.refresh(job)

                assert video_project.status == VideoProjectStatus.FAILED
                assert job.status == JobStatus.FAILED
                assert "API Error" in video_project.error_message

    @pytest.mark.asyncio
    async def test_multi_tenant_data_isolation(
        self,
        db_session,
        test_workspace_and_user,
        test_product
    ):
        """Test that video projects are properly isolated by workspace."""
        workspace1, user1 = test_workspace_and_user

        # Create second workspace and user
        workspace2 = Workspace(
            name="Another Workspace",
            description="Different workspace for isolation test",
            owner_id=uuid.uuid4()
        )
        db_session.add(workspace2)
        await db_session.flush()

        user2 = User(
            email="another@example.com",
            username="anotheruser",
            workspace_id=workspace2.id
        )
        db_session.add(user2)
        await db_session.commit()

        # Create products in different workspaces
        product1 = test_product  # Already created in workspace1

        product2 = Product(
            workspace_id=workspace2.id,
            name="Product in Workspace 2",
            description="Another test product",
            selling_points=["Different Feature"],
            category="home"
        )
        db_session.add(product2)
        await db_session.commit()
        await db_session.refresh(product2)

        # Create video projects in different workspaces
        video_project1 = VideoProject(
            workspace_id=workspace1.id,
            user_id=user1.id,
            product_id=product1.id,
            mode=VideoMode.CREATIVE_AD,
            target_duration=30,
            status=VideoProjectStatus.PENDING
        )
        db_session.add(video_project1)

        video_project2 = VideoProject(
            workspace_id=workspace2.id,
            user_id=user2.id,
            product_id=product2.id,
            mode=VideoMode.FUNCTIONAL_INTRO,
            target_duration=15,
            status=VideoProjectStatus.PENDING
        )
        db_session.add(video_project2)
        await db_session.commit()

        # Test data isolation - user1 should only see workspace1 projects
        projects_query = select(VideoProject).where(VideoProject.workspace_id == workspace1.id)
        projects_result = await db_session.execute(projects_query)
        projects = projects_result.scalars().all()

        assert len(projects) == 1
        assert projects[0].id == video_project1.id
        assert projects[0].workspace_id == workspace1.id

        # User2 should only see workspace2 projects
        projects_query = select(VideoProject).where(VideoProject.workspace_id == workspace2.id)
        projects_result = await db_session.execute(projects_query)
        projects = projects_result.scalars().all()

        assert len(projects) == 1
        assert projects[0].id == video_project2.id
        assert projects[0].workspace_id == workspace2.id

    @pytest.mark.asyncio
    async def test_script_and_storyboard_duration_validation(
        self,
        db_session,
        test_workspace_and_user,
        test_product
    ):
        """Test that script and storyboard durations match the target duration."""
        workspace, user = test_workspace_and_user
        product = test_product

        with patch('app.services.video_service.settings') as mock_settings:
            mock_settings.ai_mock_mode = True

            video_service = VideoService(db_session)

            # Test different target durations
            test_cases = [
                {"duration": 15, "mode": "functional_intro"},
                {"duration": 30, "mode": "creative_ad"}
            ]

            for case in test_cases:
                # Create video project and job
                video_project = VideoProject(
                    workspace_id=workspace.id,
                    user_id=user.id,
                    product_id=product.id,
                    mode=VideoMode(case["mode"]),
                    target_duration=case["duration"],
                    status=VideoProjectStatus.PENDING
                )
                db_session.add(video_project)
                await db_session.flush()

                job = VideoGenerationJob(
                    workspace_id=workspace.id,
                    user_id=user.id,
                    video_project_id=video_project.id,
                    task_id=uuid.uuid4(),
                    status=JobStatus.PENDING,
                    generation_config={
                        "mode": case["mode"],
                        "target_duration": case["duration"],
                        "product_id": str(product.id)
                    }
                )
                db_session.add(job)
                await db_session.commit()
                await db_session.refresh(job)

                # Process generation
                result = await video_service.process_script_generation(
                    job_id=str(job.task_id),
                    params={
                        "product_id": str(product.id),
                        "mode": case["mode"],
                        "target_duration": case["duration"]
                    }
                )

                # Validate duration matching
                script_total_duration = sum(segment["duration"] for segment in result["script"])
                storyboard_total_duration = sum(scene["duration"] for scene in result["storyboard"])

                assert abs(script_total_duration - case["duration"]) < 1.0  # Allow small variance
                assert abs(storyboard_total_duration - case["duration"]) < 1.0
                assert script_total_duration == storyboard_total_duration

                # Clean up for next test case
                await db_session.delete(video_project)
                await db_session.delete(job)
                await db_session.commit()