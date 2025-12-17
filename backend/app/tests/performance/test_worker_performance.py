"""
Performance tests for the Celery worker.

Tests performance characteristics under load.
"""
import time
import uuid
from unittest.mock import patch

import pytest

from app.models.image import ImageGenerationJob, JobStatus
from app.tasks.image_generation import generate_images_task
from app.db.session import get_db_context


class TestWorkerPerformance:
    """Performance tests for worker."""

    @pytest.fixture
    def sample_jobs(self, count=10):
        """Create multiple sample jobs."""
        jobs = []
        with get_db_context() as db:
            for i in range(count):
                job = ImageGenerationJob(
                    id=uuid.uuid4(),
                    task_id=uuid.uuid4(),
                    workspace_id=uuid.uuid4(),
                    user_id=uuid.uuid4(),
                    product_id=uuid.uuid4(),
                    style_id="modern",
                    status=JobStatus.PENDING
                )
                db.add(job)
                jobs.append(job)
            db.commit()

        yield jobs

        # Cleanup
        with get_db_context() as db:
            for job in jobs:
                db.query(ImageGenerationJob).filter(
                    ImageGenerationJob.id == job.id
                ).delete()
            db.commit()

    @patch('app.services.image_service.settings')
    def test_task_throughput(self, mock_settings, sample_jobs):
        """Test worker throughput with multiple concurrent tasks."""
        # Arrange
        mock_settings.ai_mock_mode = True
        task_count = len(sample_jobs)

        # Act - Submit all tasks
        start_time = time.time()
        tasks = []
        for job in sample_jobs:
            task = generate_images_task.delay(str(job.id))
            tasks.append(task)

        # Wait for all tasks to complete
        results = []
        for task in tasks:
            result = task.get(timeout=30)  # 30 second timeout
            results.append(result)

        end_time = time.time()
        duration = end_time - start_time

        # Assert
        assert len(results) == task_count
        assert all(r["status"] == "completed" for r in results)

        # Performance assertions
        # Each mock task takes ~6 seconds (5 sleep + processing)
        # With concurrency, total should be much less than task_count * 6
        assert duration < (task_count * 6) / 2  # At least 2x speedup

        print(f"Processed {task_count} tasks in {duration:.2f} seconds")
        print(f"Throughput: {task_count / duration:.2f} tasks/second")

    @patch('app.services.image_service.settings')
    def test_memory_usage(self, mock_settings, sample_jobs):
        """Test memory usage with many tasks."""
        # Arrange
        mock_settings.ai_mock_mode = True

        # Monitor memory usage (simplified)
        import psutil
        process = psutil.Process()
        initial_memory = process.memory_info().rss

        # Act - Process many tasks
        for i, job in enumerate(sample_jobs[:5]):  # Limit to 5 for test
            task = generate_images_task.delay(str(job.id))
            task.get(timeout=30)

            # Check memory after each task
            current_memory = process.memory_info().rss
            memory_growth = current_memory - initial_memory
            memory_mb = memory_growth / (1024 * 1024)

            print(f"Task {i+1}: Memory growth: {memory_mb:.2f} MB")

            # Assert memory doesn't grow excessively
            # Allow up to 50MB growth for 5 tasks
            assert memory_mb < 50

    @patch('app.services.image_service.settings')
    def test_queue_drain_rate(self, mock_settings):
        """Test how quickly worker can drain a queue."""
        # Arrange
        mock_settings.ai_mock_mode = True

        # Create a batch of jobs
        job_count = 20
        jobs = []
        with get_db_context() as db:
            for i in range(job_count):
                job = ImageGenerationJob(
                    id=uuid.uuid4(),
                    task_id=uuid.uuid4(),
                    workspace_id=uuid.uuid4(),
                    user_id=uuid.uuid4(),
                    product_id=uuid.uuid4(),
                    style_id="modern",
                    status=JobStatus.PENDING
                )
                db.add(job)
                jobs.append(job)
            db.commit()

        try:
            # Act - Fill queue rapidly
            start_time = time.time()
            tasks = []
            for job in jobs:
                task = generate_images_task.delay(str(job.id))
                tasks.append(task)

            # Measure queue drain time
            queue_filled_time = time.time()

            # Wait for all to complete
            for task in tasks:
                task.get(timeout=60)

            queue_drained_time = time.time()

            # Calculate metrics
            fill_time = queue_filled_time - start_time
            drain_time = queue_drained_time - queue_filled_time
            total_time = queue_drained_time - start_time

            print(f"Queue fill time: {fill_time:.2f}s")
            print(f"Queue drain time: {drain_time:.2f}s")
            print(f"Total time: {total_time:.2f}s")
            print(f"Average task time: {total_time/job_count:.2f}s")

            # Assert performance
            assert drain_time < job_count * 5  # Should be faster than serial execution

        finally:
            # Cleanup
            with get_db_context() as db:
                for job in jobs:
                    db.query(ImageGenerationJob).filter(
                        ImageGenerationJob.id == job.id
                    ).delete()
                db.commit()

    @patch('app.services.image_service.settings')
    def test_timeout_handling_performance(self, mock_settings, sample_jobs):
        """Test performance when handling timeouts."""
        # Arrange
        mock_settings.ai_mock_mode = False  # This will cause failures

        # Act - Submit tasks that will fail
        start_time = time.time()
        tasks = []
        for job in sample_jobs[:3]:  # Test with 3 jobs
            task = generate_images_task.delay(str(job.id))
            tasks.append(task)

        # Wait for tasks to fail/retry
        failures = 0
        for task in tasks:
            try:
                task.get(timeout=10)
            except Exception:
                failures += 1

        end_time = time.time()
        duration = end_time - start_time

        # Assert
        assert failures > 0  # Should have failures
        assert duration < 30  # Should fail quickly, not hang

        print(f"Handled {failures} failures in {duration:.2f}s")

    @patch('app.services.image_service.settings')
    def test_scalability(self, mock_settings):
        """Test worker scalability with increasing load."""
        mock_settings.ai_mock_mode = True

        # Test with different batch sizes
        batch_sizes = [5, 10, 20]
        results = {}

        for batch_size in batch_sizes:
            # Create jobs
            jobs = []
            with get_db_context() as db:
                for i in range(batch_size):
                    job = ImageGenerationJob(
                        id=uuid.uuid4(),
                        task_id=uuid.uuid4(),
                        workspace_id=uuid.uuid4(),
                        user_id=uuid.uuid4(),
                        product_id=uuid.uuid4(),
                        style_id="modern",
                        status=JobStatus.PENDING
                    )
                    db.add(job)
                    jobs.append(job)
                db.commit()

            try:
                # Time the batch
                start_time = time.time()
                tasks = []
                for job in jobs:
                    task = generate_images_task.delay(str(job.id))
                    tasks.append(task)

                for task in tasks:
                    task.get(timeout=60)

                end_time = time.time()
                duration = end_time - start_time
                throughput = batch_size / duration

                results[batch_size] = {
                    "duration": duration,
                    "throughput": throughput
                }

                print(f"Batch size {batch_size}: {duration:.2f}s, {throughput:.2f} tasks/s")

                # Assert reasonable performance
                assert throughput > 0.5  # At least 0.5 tasks/second

            finally:
                # Cleanup
                with get_db_context() as db:
                    for job in jobs:
                        db.query(ImageGenerationJob).filter(
                            ImageGenerationJob.id == job.id
                        ).delete()
                    db.commit()

        # Check if throughput scales reasonably
        if len(results) > 1:
            throughputs = list(results.values())
            # Throughput shouldn't decrease dramatically with scale
            assert throughputs[-1]["throughput"] >= throughputs[0]["throughput"] * 0.5