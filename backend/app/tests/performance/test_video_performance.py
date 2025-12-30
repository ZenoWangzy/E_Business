"""
Performance tests for Video Script & Storyboard Generation.
Story 4.2: Script & Storyboard AI Service
"""

import pytest
import uuid
import time
import psutil
import os
from unittest.mock import patch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.video import VideoProject, VideoGenerationJob, VideoMode, VideoProjectStatus, JobStatus
from app.models.user import User
from app.models.workspace import Workspace
from app.models.product import Product
from app.services.video_service import VideoService


class TestVideoPerformance:
    """Performance tests for video generation."""

    @pytest.fixture
    async def performance_test_setup(self, db_session):
        """Create test data for performance testing."""
        workspace = Workspace(
            name="Performance Test Workspace",
            description="Workspace for performance testing",
            owner_id=uuid.uuid4()
        )
        db_session.add(workspace)
        await db_session.flush()

        user = User(
            email="perf@example.com",
            username="perfuser",
            workspace_id=workspace.id
        )
        db_session.add(user)

        # Create multiple products for batch testing
        products = []
        for i in range(5):
            product = Product(
                workspace_id=workspace.id,
                name=f"Performance Test Product {i}",
                description=f"Test product {i} for performance testing",
                selling_points=[f"Feature {i}.1", f"Feature {i}.2", f"Feature {i}.3"],
                category="electronics",
                target_audience="professionals"
            )
            db_session.add(product)
            products.append(product)

        await db_session.commit()
        await db_session.refresh(user)
        for product in products:
            await db_session.refresh(product)

        return workspace, user, products

    @pytest.mark.asyncio
    async def test_script_generation_performance_mock_mode(
        self,
        db_session,
        performance_test_setup
    ):
        """Test script generation performance in mock mode."""
        workspace, user, products = performance_test_setup

        with patch('app.services.video_service.settings') as mock_settings:
            mock_settings.ai_mock_mode = True

            video_service = VideoService(db_session)
            target_duration = 30
            start_time = time.time()

            # Process multiple generations
            results = []
            for i, product in enumerate(products):
                # Create video project and job
                video_project = VideoProject(
                    workspace_id=workspace.id,
                    user_id=user.id,
                    product_id=product.id,
                    mode=VideoMode.CREATIVE_AD if i % 2 == 0 else VideoMode.FUNCTIONAL_INTRO,
                    target_duration=target_duration,
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
                        "mode": video_project.mode.value,
                        "target_duration": target_duration,
                        "product_id": str(product.id)
                    }
                )
                db_session.add(job)
                await db_session.commit()
                await db_session.refresh(job)

                # Process generation
                generation_start = time.time()
                result = await video_service.process_script_generation(
                    job_id=str(job.task_id),
                    params={
                        "product_id": str(product.id),
                        "mode": video_project.mode.value,
                        "target_duration": target_duration
                    }
                )
                generation_time = time.time() - generation_start
                results.append({
                    "product_index": i,
                    "generation_time": generation_time,
                    "script_length": len(result["script"]),
                    "storyboard_length": len(result["storyboard"])
                })

            total_time = time.time() - start_time

            # Performance assertions
            assert total_time < 30.0  # Should complete 5 generations in under 30 seconds
            assert len(results) == 5

            # Individual generation performance
            for result in results:
                assert result["generation_time"] < 5.0  # Each generation under 5 seconds
                assert result["script_length"] >= 2  # Minimum script segments
                assert result["storyboard_length"] >= 2  # Minimum storyboard scenes

            avg_generation_time = sum(r["generation_time"] for r in results) / len(results)
            print(f"Average generation time: {avg_generation_time:.2f}s")
            print(f"Total time for {len(results)} generations: {total_time:.2f}s")

    @pytest.mark.asyncio
    async def test_concurrent_generation_performance(
        self,
        db_session,
        performance_test_setup
    ):
        """Test concurrent video generation performance."""
        workspace, user, products = performance_test_setup

        with patch('app.services.video_service.settings') as mock_settings:
            mock_settings.ai_mock_mode = True

            video_service = VideoService(db_session)

            # Prepare multiple jobs
            jobs = []
            for product in products[:3]:  # Test with 3 concurrent jobs
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
                jobs.append((video_project, job))

            # Test concurrent execution
            start_time = time.time()

            async def process_single_job(video_project, job):
                return await video_service.process_script_generation(
                    job_id=str(job.task_id),
                    params={
                        "product_id": str(job.product_id),
                        "mode": "creative_ad",
                        "target_duration": 30
                    }
                )

            # Run jobs concurrently
            tasks = [
                process_single_job(video_project, job)
                for video_project, job in jobs
            ]
            results = await asyncio.gather(*tasks)

            concurrent_time = time.time() - start_time

            # Performance assertions
            assert concurrent_time < 15.0  # Concurrent should be faster than sequential
            assert len(results) == 3

            print(f"Concurrent processing time: {concurrent_time:.2f}s for {len(jobs)} jobs")

    @pytest.mark.asyncio
    async def test_memory_usage_during_generation(
        self,
        db_session,
        performance_test_setup
    ):
        """Test memory usage during video generation."""
        workspace, user, products = performance_test_setup

        with patch('app.services.video_service.settings') as mock_settings:
            mock_settings.ai_mock_mode = True

            # Monitor initial memory usage
            process = psutil.Process(os.getpid())
            initial_memory = process.memory_info().rss / 1024 / 1024  # MB

            video_service = VideoService(db_session)

            # Generate multiple projects
            video_projects = []
            for i, product in enumerate(products):
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
                video_projects.append(video_project)

            await db_session.commit()

            # Process all projects
            for i, video_project in enumerate(video_projects):
                job = VideoGenerationJob(
                    workspace_id=workspace.id,
                    user_id=user.id,
                    video_project_id=video_project.id,
                    task_id=uuid.uuid4(),
                    status=JobStatus.PENDING,
                    generation_config={
                        "mode": "creative_ad",
                        "target_duration": 30,
                        "product_id": str(video_project.product_id)
                    }
                )
                db_session.add(job)
                await db_session.commit()
                await db_session.refresh(job)

                await video_service.process_script_generation(
                    job_id=str(job.task_id),
                    params={
                        "product_id": str(video_project.product_id),
                        "mode": "creative_ad",
                        "target_duration": 30
                    }
                )

                # Monitor memory after each generation
                current_memory = process.memory_info().rss / 1024 / 1024  # MB
                memory_increase = current_memory - initial_memory

                # Memory usage assertions
                assert memory_increase < 512  # Should not exceed 512MB increase
                print(f"Memory after generation {i+1}: {current_memory:.2f}MB (+{memory_increase:.2f}MB)")

    @pytest.mark.asyncio
    async def test_large_script_performance(
        self,
        db_session,
        performance_test_setup
    ):
        """Test performance with larger target durations."""
        workspace, user, products = performance_test_setup

        with patch('app.services.video_service.settings') as mock_settings:
            mock_settings.ai_mock_mode = True

            video_service = VideoService(db_session)
            large_duration = 60  # Test with 60-second video

            # Create video project with large duration
            video_project = VideoProject(
                workspace_id=workspace.id,
                user_id=user.id,
                product_id=products[0].id,
                mode=VideoMode.CREATIVE_AD,
                target_duration=large_duration,
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
                    "target_duration": large_duration,
                    "product_id": str(products[0].id)
                }
            )
            db_session.add(job)
            await db_session.commit()
            await db_session.refresh(job)

            # Measure generation time
            start_time = time.time()
            result = await video_service.process_script_generation(
                job_id=str(job.task_id),
                params={
                    "product_id": str(products[0].id),
                    "mode": "creative_ad",
                    "target_duration": large_duration
                }
            )
            generation_time = time.time() - start_time

            # Performance assertions for large video
            assert generation_time < 10.0  # Large video should still be fast in mock mode
            assert len(result["script"]) >= 2
            assert len(result["storyboard"]) >= 2

            # Validate duration accuracy
            script_total_duration = sum(segment["duration"] for segment in result["script"])
            storyboard_total_duration = sum(scene["duration"] for scene in result["storyboard"])

            assert abs(script_total_duration - large_duration) < 2.0
            assert abs(storyboard_total_duration - large_duration) < 2.0

            print(f"Large video generation time: {generation_time:.2f}s for {large_duration}s video")
            print(f"Generated {len(result['script'])} script segments and {len(result['storyboard'])} storyboard scenes")

    @pytest.mark.asyncio
    async def test_database_query_performance(
        self,
        db_session,
        performance_test_setup
    ):
        """Test database query performance for video operations."""
        workspace, user, products = performance_test_setup

        # Create multiple video projects for testing
        video_projects = []
        for i in range(10):
            video_project = VideoProject(
                workspace_id=workspace.id,
                user_id=user.id,
                product_id=products[i % len(products)].id,
                mode=VideoMode.CREATIVE_AD if i % 2 == 0 else VideoMode.FUNCTIONAL_INTRO,
                target_duration=30 if i % 2 == 0 else 15,
                status=VideoProjectStatus.COMPLETED if i < 5 else VideoProjectStatus.PENDING
            )
            db_session.add(video_project)
            video_projects.append(video_project)

        await db_session.commit()

        # Test query performance
        start_time = time.time()

        # Query all projects
        projects_query = select(VideoProject).where(VideoProject.workspace_id == workspace.id)
        projects_result = await db_session.execute(projects_query)
        projects = projects_result.scalars().all()

        query_time = time.time() - start_time

        # Performance assertions
        assert query_time < 0.1  # Database queries should be fast
        assert len(projects) == 10

        # Test filtered query performance
        start_time = time.time()

        completed_query = select(VideoProject).where(
            VideoProject.workspace_id == workspace.id,
            VideoProject.status == VideoProjectStatus.COMPLETED
        )
        completed_result = await db_session.execute(completed_query)
        completed_projects = completed_result.scalars().all()

        filtered_query_time = time.time() - start_time

        assert filtered_query_time < 0.05  # Filtered queries should be even faster
        assert len(completed_projects) == 5

        print(f"Query performance: {query_time:.4f}s for {len(projects)} records")
        print(f"Filtered query: {filtered_query_time:.4f}s for {len(completed_projects)} records")