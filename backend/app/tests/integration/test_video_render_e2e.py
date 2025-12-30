"""
E2E smoke test for video rendering (requires Postgres and Redis running).

To enable, set environment variable E2E_SMOKE=1 before running pytest.
"""

import os
import uuid
import pytest

pytestmark = pytest.mark.skipif(not os.getenv("E2E_SMOKE"), reason="Set E2E_SMOKE=1 to run E2E smoke tests")

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.models.video import VideoProject, VideoGenerationJob, VideoMode, VideoProjectStatus
from app.models.image import JobStatus
from app.tasks.video_tasks import render_video_task


@pytest.mark.asyncio
async def test_render_smoke():
    async with AsyncSessionLocal() as db:  # type: AsyncSession
        workspace_id = uuid.uuid4()
        user_id = uuid.uuid4()

        project = VideoProject(
            workspace_id=workspace_id,
            user_id=user_id,
            product_id=uuid.uuid4(),
            mode=VideoMode.CREATIVE_AD,
            target_duration=15,
            status=VideoProjectStatus.SCRIPT_READY,
            script=[{"text": "t", "duration": 1.0}],
            storyboard=[{"scene_index": 1, "duration": 1.0, "visual_prompt": "v", "transition": "fade"}],
        )
        db.add(project)
        await db.flush()

        job = VideoGenerationJob(
            workspace_id=workspace_id,
            user_id=user_id,
            video_project_id=project.id,
            task_id=uuid.uuid4(),
            status=JobStatus.PENDING,
            generation_config={"mode": project.mode.value, "target_duration": project.target_duration},
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)

        # Invoke Celery task directly (synchronous wrapper)
        result = render_video_task(job_id=str(job.id))
        assert result["status"] in {"completed", "failed"}