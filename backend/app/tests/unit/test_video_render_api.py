"""
Unit tests for Video Render API endpoints (Story 4.3).
Uses FastAPI dependency_overrides for proper auth mocking.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.deps import get_current_user, get_db, get_current_workspace_member
from app.models.video import VideoProject, VideoMode, VideoProjectStatus, VideoGenerationJob
from app.models.image import JobStatus
from app.models.user import User, WorkspaceMember


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def mock_user():
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "test@example.com"
    return user


@pytest.fixture()
def mock_member():
    member = MagicMock(spec=WorkspaceMember)
    member.workspace_id = uuid.uuid4()
    member.user_id = uuid.uuid4()
    return member


def _make_project(workspace_id):
    return VideoProject(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        user_id=uuid.uuid4(),
        product_id=uuid.uuid4(),
        mode=VideoMode.CREATIVE_AD,
        target_duration=30,
        status=VideoProjectStatus.SCRIPT_READY,
        script=[{"text": "t", "duration": 1.0}],
        storyboard=[{"scene_index": 1, "duration": 1.0, "visual_prompt": "v", "transition": "fade"}],
    )


def test_trigger_render_accepted(client, mock_user, mock_member):
    """Test triggering render returns 202 Accepted."""
    from unittest.mock import patch

    project = _make_project(mock_member.workspace_id)

    # AsyncSession stub
    async_db = AsyncMock()

    class _Res:
        def scalar_one_or_none(self_inner):
            return project

    async def refresh_side_effect(obj):
        if isinstance(obj, VideoGenerationJob) and getattr(obj, "id", None) is None:
            obj.id = uuid.uuid4()

    async_db.execute = AsyncMock(return_value=_Res())
    async_db.add = MagicMock()
    async_db.commit = AsyncMock()
    async_db.refresh = AsyncMock(side_effect=refresh_side_effect)

    # Override dependencies
    async def override_get_current_user():
        return mock_user

    async def override_get_current_workspace_member(workspace_id: uuid.UUID):
        return mock_member

    async def override_get_db():
        yield async_db

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_workspace_member] = override_get_current_workspace_member
    app.dependency_overrides[get_db] = override_get_db

    try:
        with patch("app.api.v1.endpoints.video.render_video_task") as mock_render_task:
            task_obj = MagicMock()
            task_obj.id = str(uuid.uuid4())
            mock_render_task.delay.return_value = task_obj

            url = f"/api/v1/video/workspaces/{mock_member.workspace_id}/render/{project.id}"
            resp = client.post(url, json={})

            assert resp.status_code == 202
            data = resp.json()
            assert "job_id" in data and len(data["job_id"]) > 0
            assert "task_id" in data and len(data["task_id"]) > 0
            assert data["status"] == "processing"
    finally:
        app.dependency_overrides.clear()


def test_get_render_job_status_success(client, mock_user, mock_member):
    """Test getting render job status returns 200."""
    from datetime import datetime, timezone

    job = VideoGenerationJob(
        id=uuid.uuid4(),
        workspace_id=mock_member.workspace_id,
        user_id=mock_user.id,
        video_project_id=uuid.uuid4(),
        task_id=uuid.uuid4(),
        status=JobStatus.COMPLETED,
        generation_config={},
    )
    job.progress = 100
    job.raw_results = [{"video_urls": ["https://example.com/mock-videos/x.mp4"], "status": "completed", "extra": {"provider": "mock"}}]
    job.created_at = datetime.now(timezone.utc)
    job.updated_at = datetime.now(timezone.utc)
    job.completed_at = datetime.now(timezone.utc)
    job.error_message = None

    async_db = AsyncMock()

    class _Res:
        def scalar_one_or_none(self_inner):
            return job

    async_db.execute = AsyncMock(return_value=_Res())

    async def override_get_current_user():
        return mock_user

    async def override_get_current_workspace_member(workspace_id: uuid.UUID):
        return mock_member

    async def override_get_db():
        yield async_db

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_workspace_member] = override_get_current_workspace_member
    app.dependency_overrides[get_db] = override_get_db

    try:
        url = f"/api/v1/video/workspaces/{mock_member.workspace_id}/render/jobs/{job.id}"
        resp = client.get(url)

        assert resp.status_code == 200
        data = resp.json()
        assert data["job_id"] == str(job.id)
        assert data["task_id"] == str(job.task_id)
        assert data["status"] == JobStatus.COMPLETED.value
        assert data["progress"] == 100
        assert data["video_urls"] == ["https://example.com/mock-videos/x.mp4"]
    finally:
        app.dependency_overrides.clear()


def test_trigger_render_project_not_found(client, mock_user, mock_member):
    """Should return 404 when project not found."""
    async_db = AsyncMock()

    class _Res:
        def scalar_one_or_none(self_inner):
            return None

    async_db.execute = AsyncMock(return_value=_Res())
    async_db.rollback = AsyncMock()

    async def override_get_current_user():
        return mock_user

    async def override_get_current_workspace_member(workspace_id: uuid.UUID):
        return mock_member

    async def override_get_db():
        yield async_db

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_workspace_member] = override_get_current_workspace_member
    app.dependency_overrides[get_db] = override_get_db

    try:
        url = f"/api/v1/video/workspaces/{mock_member.workspace_id}/render/{uuid.uuid4()}"
        resp = client.post(url, json={})

        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_get_render_job_status_not_found(client, mock_user, mock_member):
    """Should return 404 when job not found."""
    async_db = AsyncMock()

    class _Res:
        def scalar_one_or_none(self_inner):
            return None

    async_db.execute = AsyncMock(return_value=_Res())

    async def override_get_current_user():
        return mock_user

    async def override_get_current_workspace_member(workspace_id: uuid.UUID):
        return mock_member

    async def override_get_db():
        yield async_db

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_workspace_member] = override_get_current_workspace_member
    app.dependency_overrides[get_db] = override_get_db

    try:
        url = f"/api/v1/video/workspaces/{mock_member.workspace_id}/render/jobs/{uuid.uuid4()}"
        resp = client.get(url)

        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()
