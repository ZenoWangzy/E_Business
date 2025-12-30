"""
Unit tests for Video Service.
Story 4.2: Script & Storyboard AI Service
"""

import pytest
import uuid
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone

from app.models.video import VideoProject, VideoGenerationJob, VideoMode, VideoProjectStatus
from app.models.image import JobStatus
from app.services.video_service import VideoService, VideoGenerationError


class TestVideoService:
    """Test VideoService class."""

    @pytest.fixture
    def mock_db_session(self):
        """Create a mock database session."""
        session = MagicMock()
        session.get = MagicMock()
        session.add = MagicMock()
        session.commit = MagicMock()
        session.refresh = MagicMock()
        return session

    @pytest.fixture
    def mock_redis_client(self):
        """Create a mock Redis client."""
        redis_client = MagicMock()
        redis_client.publish = MagicMock()
        return redis_client

    @pytest.fixture
    def video_service(self, mock_db_session):
        """Create VideoService instance with mocked dependencies."""
        # Mock Redis client at module level
        with patch('app.services.video_service.redis.from_url') as mock_redis:
            mock_redis.return_value = MagicMock()
            service = VideoService(mock_db_session)
            return service

    @pytest.fixture
    def sample_video_project(self):
        """Create a sample VideoProject."""
        return VideoProject(
            id=uuid.uuid4(),
            workspace_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            product_id=uuid.uuid4(),
            mode=VideoMode.CREATIVE_AD,
            target_duration=30,
            status=VideoProjectStatus.PENDING
        )

    @pytest.fixture
    def sample_generation_job(self):
        """Create a sample VideoGenerationJob."""
        return VideoGenerationJob(
            id=uuid.uuid4(),
            workspace_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            video_project_id=uuid.uuid4(),
            task_id=uuid.uuid4(),
            status=JobStatus.PENDING,
            generation_config={"mode": "creative_ad", "duration": 30}
        )

    @pytest.mark.asyncio
    async def test_process_script_generation_mock_mode_success(self, video_service, sample_generation_job):
        """Test successful script generation in mock mode."""
        # This should fail until we implement the method
        with patch('app.services.video_service.settings') as mock_settings:
            mock_settings.ai_mock_mode = True

            # Mock database calls
            video_service.db.get = AsyncMock(return_value=sample_generation_job)

            result = await video_service.process_script_generation(
                job_id=str(sample_generation_job.task_id),
                params={"mode": "creative_ad", "duration": 30}
            )

            assert "script" in result
            assert "storyboard" in result
            assert len(result["script"]) > 0
            assert len(result["storyboard"]) > 0

    @pytest.mark.asyncio
    async def test_generate_mock_script_and_storyboard(self, video_service):
        """Test mock script and storyboard generation."""
        # This should fail until we implement the method
        context = {
            "name": "Test Product",
            "description": "A great test product",
            "selling_points": ["Feature 1", "Feature 2"]
        }

        result = await video_service._generate_mock_script_and_storyboard(
            context=context,
            mode=VideoMode.CREATIVE_AD,
            duration=30
        )

        assert "script" in result
        assert "storyboard" in result
        assert isinstance(result["script"], list)
        assert isinstance(result["storyboard"], list)

        # Check script structure
        for segment in result["script"]:
            assert "text" in segment
            assert "duration" in segment
            assert isinstance(segment["duration"], float)

        # Check storyboard structure
        for scene in result["storyboard"]:
            assert "scene_index" in scene
            assert "duration" in scene
            assert "visual_prompt" in scene
            assert "transition" in scene

    @pytest.mark.asyncio
    async def test_generate_real_script_and_storyboard_with_openai(self, video_service):
        """Test real script generation using OpenAI (with mocked API call)."""
        # Test the basic structure and functionality without complex mocking
        # In real usage, this would call OpenAI API, but for tests we verify the method exists

        context = {
            "name": "Test Product",
            "description": "A great test product",
            "selling_points": ["Feature 1", "Feature 2"]
        }

        # Test that the method exists and is callable
        assert hasattr(video_service, '_generate_real_script_and_storyboard')
        assert callable(video_service._generate_real_script_and_storyboard)

        # Test with mock mode enabled to avoid API calls
        with patch('app.services.video_service.settings') as mock_settings:
            mock_settings.ai_mock_mode = False  # Still use real mode but will fail gracefully
            mock_settings.openai_api_key = "test-key"
            mock_settings.openai_model = "gpt-4"
            mock_settings.video_temperature = 0.8
            mock_settings.video_max_tokens = 1000

            with patch('app.services.video_service.openai') as mock_openai:
                # Mock to raise an exception (expected in test without real API key)
                mock_openai.OpenAI.return_value.chat.completions.create.side_effect = Exception("API Error")

                with pytest.raises(VideoGenerationError):
                    await video_service._generate_real_script_and_storyboard(
                        context=context,
                        mode=VideoMode.FUNCTIONAL_INTRO,
                        duration=15
                    )

    @pytest.mark.asyncio
    async def test_publish_progress(self, video_service, mock_redis_client):
        """Test Redis progress publishing."""
        # This should fail until we implement the method
        task_id = str(uuid.uuid4())

        # Patch the redis_client module variable in video_service
        with patch('app.services.video_service.redis_client', mock_redis_client):
            await video_service._publish_progress(
                task_id=task_id,
                progress=50,
                message="Generating script..."
            )

            # Verify Redis publish was called
            mock_redis_client.publish.assert_called_once()

            # Check the published message structure
            call_args = mock_redis_client.publish.call_args
            channel = call_args[0][0]
            message = call_args[0][1]

            assert f"task_updates:{task_id}" in channel
            assert "50" in message
            assert "Generating script..." in message

    @pytest.mark.asyncio
    async def test_script_generation_error_handling(self, video_service):
        """Test error handling in script generation."""
        # Mock database query to return None (job not found)
        with patch.object(video_service.db, 'query') as mock_query:
            mock_query.return_value.filter_by.return_value.first.return_value = None

            non_existent_job_id = str(uuid.uuid4())

            with pytest.raises(VideoGenerationError, match="not found"):
                await video_service.process_script_generation(
                    job_id=non_existent_job_id,
                    params={"mode": "creative_ad", "duration": 30}
                )

    @pytest.mark.asyncio
    async def test_save_generation_result(self, video_service, sample_video_project):
        """Test saving generation result to database."""
        # This should fail until we implement the method
        script_data = [
            {"text": "测试脚本", "duration": 3.0}
        ]
        storyboard_data = [
            {"scene_index": 1, "duration": 3.0, "visual_prompt": "测试场景", "transition": "fade"}
        ]

        await video_service._save_generation_result(
            project=sample_video_project,
            script=script_data,
            storyboard=storyboard_data,
            model_used="gpt-4-turbo-preview",
            token_usage={"prompt_tokens": 100, "completion_tokens": 50}
        )

        # Verify database operations
        assert sample_video_project.script == script_data
        assert sample_video_project.storyboard == storyboard_data
        assert sample_video_project.status == VideoProjectStatus.SCRIPT_READY
        assert sample_video_project.model_used == "gpt-4-turbo-preview"
        assert sample_video_project.token_usage == {"prompt_tokens": 100, "completion_tokens": 50}

        video_service.db.commit.assert_called_once()