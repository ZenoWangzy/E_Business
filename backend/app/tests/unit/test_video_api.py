"""
Unit tests for Video API endpoints.
Story 4.2: Script & Storyboard AI Service
"""

import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.api.v1.endpoints.video import router
from app.schemas.video import (
    ScriptGenerationRequest,
    TaskCreatedResponse,
    JobStatusResponse
)


class TestVideoAPI:
    """Test Video API endpoints."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        from app.main import app
        app.include_router(router, prefix="/api/v1/video", tags=["video"])
        return TestClient(app)

    @pytest.fixture
    def sample_user(self):
        """Create a sample user for testing."""
        return {
            "id": uuid.uuid4(),
            "email": "test@example.com",
            "workspace_id": uuid.uuid4()
        }

    @pytest.fixture
    def sample_request(self):
        """Create a sample script generation request."""
        return ScriptGenerationRequest(
            product_id=uuid.uuid4(),
            mode="creative_ad",
            target_duration=30
        )

    def test_generate_script_and_storyboard_endpoint(self, client, sample_request):
        """Test POST /generate/script endpoint."""
        # This should fail until we implement the endpoint
        response = client.post("/api/v1/video/generate/script", json=sample_request.dict())

        # Expect 401 Unauthorized without authentication
        assert response.status_code == 401

    @patch('app.api.v1.endpoints.video.get_current_user')
    @patch('app.api.v1.endpoints.video.get_current_workspace_member')
    @patch('app.api.v1.endpoints.video.get_db')
    def test_generate_script_success_with_auth(
        self,
        mock_get_db,
        mock_workspace_member,
        mock_current_user,
        client,
        sample_request,
        sample_user
    ):
        """Test successful script generation with proper authentication."""
        # This should fail until we implement the endpoint
        mock_current_user.return_value = sample_user
        mock_workspace_member.return_value = MagicMock()
        mock_db = AsyncMock()
        mock_get_db.return_value = mock_db

        # Mock database queries
        mock_db.query.return_value.filter.return_value.first.return_value = None  # Product exists
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None

        with patch('app.api.v1.endpoints.video.generate_script_and_storyboard_task') as mock_task:
            mock_task.delay.return_value = MagicMock()
            mock_task.delay.return_value.id = str(uuid.uuid4())

            response = client.post("/api/v1/video/generate/script", json=sample_request.dict())

            assert response.status_code == 202  # Accepted for async processing

            data = response.json()
            assert "task_id" in data
            assert "status" in data
            assert data["status"] == "processing"

    def test_get_script_generation_status_endpoint(self, client):
        """Test GET /jobs/{task_id} endpoint."""
        # This should fail until we implement the endpoint
        task_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/video/jobs/{task_id}")

        # Expect 401 Unauthorized without authentication
        assert response.status_code == 401

    @patch('app.api.v1.endpoints.video.get_current_user')
    @patch('app.api.v1.endpoints.video.get_current_workspace_member')
    @patch('app.api.v1.endpoints.video.get_db')
    def test_get_job_status_success_with_auth(
        self,
        mock_get_db,
        mock_workspace_member,
        mock_current_user,
        client,
        sample_user
    ):
        """Test successful job status retrieval with proper authentication."""
        # This should fail until we implement the endpoint
        mock_current_user.return_value = sample_user
        mock_workspace_member.return_value = MagicMock()
        mock_db = AsyncMock()
        mock_get_db.return_value = mock_db

        # Mock job query
        from app.models.video import VideoGenerationJob, JobStatus
        mock_job = MagicMock()
        mock_job.task_id = uuid.uuid4()
        mock_job.status = JobStatus.COMPLETED
        mock_job.progress = 100
        mock_job.error_message = None
        mock_job.created_at = "2025-12-18T10:00:00Z"
        mock_job.updated_at = "2025-12-18T10:05:00Z"
        mock_job.completed_at = "2025-12-18T10:05:00Z"

        mock_db.query.return_value.filter.return_value.first.return_value = mock_job

        task_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/video/jobs/{task_id}")

        assert response.status_code == 200

        data = response.json()
        assert "task_id" in data
        assert "status" in data
        assert "progress" in data

    def test_get_job_status_not_found(self, client):
        """Test GET /jobs/{task_id} for non-existent job."""
        # This should fail until we implement the endpoint
        task_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/video/jobs/{task_id}")

        # Expect 401 Unauthorized without authentication
        assert response.status_code == 401

    @patch('app.api.v1.endpoints.video.get_current_user')
    @patch('app.api.v1.endpoints.video.get_current_workspace_member')
    @patch('app.api.v1.endpoints.video.get_db')
    def test_get_job_status_job_not_found_with_auth(
        self,
        mock_get_db,
        mock_workspace_member,
        mock_current_user,
        client,
        sample_user
    ):
        """Test job status retrieval for non-existent job with authentication."""
        # This should fail until we implement the endpoint
        mock_current_user.return_value = sample_user
        mock_workspace_member.return_value = MagicMock()
        mock_db = AsyncMock()
        mock_get_db.return_value = mock_db

        # Mock no job found
        mock_db.query.return_value.filter.return_value.first.return_value = None

        task_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/video/jobs/{task_id}")

        assert response.status_code == 404

    def test_generate_script_invalid_request(self, client):
        """Test POST /generate/script with invalid request data."""
        # This should fail until we implement the endpoint
        invalid_request = {
            "product_id": "invalid-uuid",
            "mode": "invalid-mode",
            "target_duration": 5  # Too short
        }

        response = client.post("/api/v1/video/generate/script", json=invalid_request)

        # Expect 422 Unprocessable Entity due to validation errors
        assert response.status_code == 422

        errors = response.json()["detail"]
        assert any("product_id" in str(error) for error in errors)
        assert any("mode" in str(error) for error in errors)
        assert any("target_duration" in str(error) for error in errors)

    def test_generate_script_missing_required_fields(self, client):
        """Test POST /generate/script with missing required fields."""
        # This should fail until we implement the endpoint
        incomplete_request = {
            "product_id": str(uuid.uuid4())
            # Missing mode and target_duration
        }

        response = client.post("/api/v1/video/generate/script", json=incomplete_request)

        # Expect 422 Unprocessable Entity due to missing fields
        assert response.status_code == 422

        errors = response.json()["detail"]
        assert any("mode" in str(error) for error in errors)
        assert any("target_duration" in str(error) for error in errors)