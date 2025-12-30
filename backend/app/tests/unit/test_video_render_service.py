"""
Unit tests for VideoRenderService (Story 4.3 - Mock provider).
"""

import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from app.services.video_service import VideoRenderService
from app.models.video import VideoGenerationJob, VideoProject, VideoMode, VideoProjectStatus
from app.models.image import JobStatus


@pytest.mark.asyncio
async def test_process_render_with_mock_provider_monotonic_progress():
    """Render completes and updates job/progress with mock provider."""
    workspace_id = uuid.uuid4()
    user_id = uuid.uuid4()
    project_id = uuid.uuid4()

    # Prepare ORM entities (plain instances are fine for unit tests)
    job = VideoGenerationJob(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        user_id=user_id,
        video_project_id=project_id,
        task_id=uuid.uuid4(),
        status=JobStatus.PENDING,
        generation_config={"mode": "creative_ad", "target_duration": 30},
    )

    project = VideoProject(
        id=project_id,
        workspace_id=workspace_id,
        user_id=user_id,
        product_id=uuid.uuid4(),
        mode=VideoMode.CREATIVE_AD,
        target_duration=30,
        status=VideoProjectStatus.SCRIPT_READY,
        script=[{"text": "t", "duration": 1.0}],
        storyboard=[{"scene_index": 1, "duration": 1.0, "visual_prompt": "v", "transition": "fade"}],
    )

    # AsyncSession double
    adb = AsyncMock()
    adb.get = AsyncMock(return_value=job)

    class _Res:
        def scalar_one_or_none(self):
            return project

    adb.execute = AsyncMock(return_value=_Res())
    adb.commit = AsyncMock()

    with patch("app.services.video_service.redis_client") as mock_redis:
        mock_redis.publish = MagicMock()
        # speed up provider - patch global asyncio.sleep since it's imported locally in MockVideoProvider.render
        with patch("asyncio.sleep", new=AsyncMock(return_value=None)):
            with patch("random.uniform", return_value=0.05):
                service = VideoRenderService(adb)
                result = await service.process_render(str(job.id))

    # Assertions on job state
    assert job.status == JobStatus.COMPLETED
    assert job.progress == 100
    assert isinstance(result, dict)
    assert result["status"] == JobStatus.COMPLETED.value
    assert result["results"][0]["video_urls"][0].startswith("https://example.com/mock-videos/")

    # At least one commit occurred
    assert adb.commit.await_count >= 1


@pytest.mark.asyncio
async def test_process_render_job_not_found_raises():
    """Should raise ValueError when job not found."""
    adb = AsyncMock()
    adb.get = AsyncMock(return_value=None)

    service = VideoRenderService(adb)
    with pytest.raises(ValueError, match="not found"):
        await service.process_render(str(uuid.uuid4()))


@pytest.mark.asyncio
async def test_process_render_project_not_found_raises():
    """Should raise ValueError when project not found in workspace."""
    job = VideoGenerationJob(
        id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        video_project_id=uuid.uuid4(),
        task_id=uuid.uuid4(),
        status=JobStatus.PENDING,
        generation_config={},
    )
    adb = AsyncMock()
    adb.get = AsyncMock(return_value=job)

    class _Res:
        def scalar_one_or_none(self):
            return None

    adb.execute = AsyncMock(return_value=_Res())
    adb.commit = AsyncMock()

    with patch("app.services.video_service.redis_client"):
        service = VideoRenderService(adb)
        with pytest.raises(ValueError, match="not found in workspace"):
            await service.process_render(str(job.id))


@pytest.mark.asyncio
async def test_process_render_provider_failure_marks_job_failed():
    """Provider exception should mark job as FAILED and re-raise."""
    workspace_id = uuid.uuid4()
    project_id = uuid.uuid4()

    job = VideoGenerationJob(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        user_id=uuid.uuid4(),
        video_project_id=project_id,
        task_id=uuid.uuid4(),
        status=JobStatus.PENDING,
        generation_config={},
    )

    project = VideoProject(
        id=project_id,
        workspace_id=workspace_id,
        user_id=uuid.uuid4(),
        product_id=uuid.uuid4(),
        mode=VideoMode.CREATIVE_AD,
        target_duration=30,
        status=VideoProjectStatus.SCRIPT_READY,
        script=[{"text": "t", "duration": 1.0}],
        storyboard=[{"scene_index": 1, "duration": 1.0, "visual_prompt": "v", "transition": "fade"}],
    )

    adb = AsyncMock()
    adb.get = AsyncMock(return_value=job)

    class _Res:
        def scalar_one_or_none(self):
            return project

    adb.execute = AsyncMock(return_value=_Res())
    adb.commit = AsyncMock()

    with patch("app.services.video_service.redis_client") as mock_redis:
        mock_redis.publish = MagicMock()
        # Make provider raise
        with patch.object(VideoRenderService, "_get_provider") as mock_prov:
            prov_instance = AsyncMock()
            prov_instance.render = AsyncMock(side_effect=RuntimeError("API down"))
            mock_prov.return_value = prov_instance

            service = VideoRenderService(adb)
            with pytest.raises(RuntimeError, match="API down"):
                await service.process_render(str(job.id))

    assert job.status == JobStatus.FAILED
    assert "API down" in (job.error_message or "")
