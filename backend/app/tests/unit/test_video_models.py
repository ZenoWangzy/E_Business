"""
Unit tests for video generation models and schemas.
Story 4.2: Script & Storyboard AI Service
"""

import pytest
import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import List, Dict, Optional

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base


class TestVideoModels:
    """Test video generation models."""

    @pytest.fixture
    def in_memory_db(self):
        """Create in-memory SQLite database for testing."""
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(engine)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()
        yield session
        session.close()

    def test_video_mode_enum_creation(self):
        """Test VideoMode enum can be created."""
        # This should fail until we implement the enum
        from app.models.video import VideoMode

        assert VideoMode.CREATIVE_AD == "creative_ad"
        assert VideoMode.FUNCTIONAL_INTRO == "functional_intro"

    def test_video_project_status_enum_creation(self):
        """Test VideoProjectStatus enum can be created."""
        # This should fail until we implement the enum
        from app.models.video import VideoProjectStatus

        assert VideoProjectStatus.PENDING == "pending"
        assert VideoProjectStatus.SCRIPT_READY == "script_ready"
        assert VideoProjectStatus.COMPLETED == "completed"
        assert VideoProjectStatus.FAILED == "failed"

    def test_video_project_model_creation(self, in_memory_db):
        """Test VideoProject model can be created."""
        # This should fail until we implement the model
        from app.models.video import VideoProject, VideoMode

        workspace_id = uuid.uuid4()
        user_id = uuid.uuid4()
        product_id = uuid.uuid4()

        project = VideoProject(
            workspace_id=workspace_id,
            user_id=user_id,
            product_id=product_id,
            mode=VideoMode.CREATIVE_AD,
            target_duration=30,
            status="pending"
        )

        in_memory_db.add(project)
        in_memory_db.commit()

        retrieved = in_memory_db.query(VideoProject).first()
        assert retrieved is not None
        assert retrieved.workspace_id == workspace_id
        assert retrieved.mode == VideoMode.CREATIVE_AD
        assert retrieved.target_duration == 30

    def test_video_generation_job_model_creation(self, in_memory_db):
        """Test VideoGenerationJob model can be created."""
        # This should fail until we implement the model
        from app.models.video import VideoGenerationJob, JobStatus

        workspace_id = uuid.uuid4()
        user_id = uuid.uuid4()
        video_project_id = uuid.uuid4()
        task_id = uuid.uuid4()

        job = VideoGenerationJob(
            workspace_id=workspace_id,
            user_id=user_id,
            video_project_id=video_project_id,
            task_id=task_id,
            status=JobStatus.PENDING,
            progress=0
        )

        in_memory_db.add(job)
        in_memory_db.commit()

        retrieved = in_memory_db.query(VideoGenerationJob).first()
        assert retrieved is not None
        assert retrieved.task_id == task_id
        assert retrieved.status == JobStatus.PENDING
        assert retrieved.progress == 0

    def test_json_fields_support_complex_data(self, in_memory_db):
        """Test JSON fields can store complex script and storyboard data."""
        # This should fail until we implement JSON fields
        from app.models.video import VideoProject, VideoMode

        workspace_id = uuid.uuid4()
        user_id = uuid.uuid4()
        product_id = uuid.uuid4()

        script_data = [
            {"text": "欢迎来到未来", "duration": 3.0},
            {"text": "产品展示", "duration": 5.0}
        ]

        storyboard_data = [
            {
                "scene_index": 1,
                "visual_prompt": "产品特写",
                "transition": "fade",
                "duration": 3.0
            },
            {
                "scene_index": 2,
                "visual_prompt": "产品使用场景",
                "transition": "cut",
                "duration": 5.0
            }
        ]

        project = VideoProject(
            workspace_id=workspace_id,
            user_id=user_id,
            product_id=product_id,
            mode=VideoMode.FUNCTIONAL_INTRO,
            target_duration=15,
            script=script_data,
            storyboard=storyboard_data
        )

        in_memory_db.add(project)
        in_memory_db.commit()

        retrieved = in_memory_db.query(VideoProject).first()
        assert retrieved is not None
        assert len(retrieved.script) == 2
        assert retrieved.script[0]["text"] == "欢迎来到未来"
        assert retrieved.script[0]["duration"] == 3.0
        assert len(retrieved.storyboard) == 2
        assert retrieved.storyboard[0]["scene_index"] == 1
        assert retrieved.storyboard[0]["transition"] == "fade"


class TestVideoSchemas:
    """Test video-related Pydantic schemas."""

    def test_script_segment_schema_creation(self):
        """Test ScriptSegment schema can be created."""
        # This should fail until we implement the schema
        from app.schemas.video import ScriptSegment

        segment = ScriptSegment(text="欢迎体验", duration=2.5)
        assert segment.text == "欢迎体验"
        assert segment.duration == 2.5

    def test_storyboard_scene_schema_creation(self):
        """Test StoryboardScene schema can be created."""
        # This should fail until we implement the schema
        from app.schemas.video import StoryboardScene

        scene = StoryboardScene(
            scene_index=1,
            duration=3.0,
            visual_prompt="产品展示特写",
            transition="fade"
        )
        assert scene.scene_index == 1
        assert scene.duration == 3.0
        assert scene.visual_prompt == "产品展示特写"
        assert scene.transition == "fade"

    def test_script_and_storyboard_response_schema(self):
        """Test ScriptAndStoryboardResponse schema validation."""
        # This should fail until we implement the schema
        from app.schemas.video import (
            ScriptSegment,
            StoryboardScene,
            ScriptAndStoryboardResponse
        )

        script = [
            ScriptSegment(text="开场", duration=2.0),
            ScriptSegment(text="介绍", duration=3.0)
        ]

        storyboard = [
            StoryboardScene(
                scene_index=1,
                duration=2.0,
                visual_prompt="场景1",
                transition="fade"
            ),
            StoryboardScene(
                scene_index=2,
                duration=3.0,
                visual_prompt="场景2",
                transition="cut"
            )
        ]

        response = ScriptAndStoryboardResponse(
            script=script,
            storyboard=storyboard,
            total_duration=5.0
        )

        assert len(response.script) == 2
        assert len(response.storyboard) == 2
        assert response.total_duration == 5.0
        assert response.script[0].duration + response.script[1].duration == response.total_duration