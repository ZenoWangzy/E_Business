"""
[IDENTITY]: Video Generation Schemas
DTOs for AI Video Creation workflows (Scripting -> Storyboard -> Rendering).

[INPUT]:
- VideoProjectCreate (Mode, Duration).
- ScriptGenerationRequest.
- RenderRequest.
- AudioRegenerationParams.

[LINK]:
- VideoRouter -> ../api/v1/endpoints/video.py
- VideoModel -> ../models/video.py

[OUTPUT]: VideoProjectResponse, ScriptAndStoryboardResponse.
[POS]: /backend/app/schemas/video.py

[PROTOCOL]:
1. `ScriptSegment` and `StoryboardScene` have rigorous validation (min duration > 0).
2. `RenderRequest` is empty for now but reserved for future override parameters.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import List, Dict, Optional

from pydantic import BaseModel, Field


class VideoMode(str, Enum):
    """Video generation modes."""
    CREATIVE_AD = "creative_ad"
    FUNCTIONAL_INTRO = "functional_intro"


class ScriptSegment(BaseModel):
    """Individual script segment with text and duration."""
    text: str = Field(..., description="The spoken text for this segment")
    duration: float = Field(..., gt=0, description="Duration in seconds")

    model_config = {
        "json_schema_extra": {
            "example": {
                "text": "欢迎来到未来科技",
                "duration": 3.0
            }
        }
    }


class StoryboardScene(BaseModel):
    """Individual storyboard scene with visual description."""
    scene_index: int = Field(..., ge=1, description="Scene order in the storyboard")
    duration: float = Field(..., gt=0, description="Scene duration in seconds")
    visual_prompt: str = Field(..., description="Visual description for image generation")
    transition: str = Field(..., description="Transition to next scene (fade, cut, slide, etc.)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "scene_index": 1,
                "duration": 3.0,
                "visual_prompt": "产品特写镜头，展示精美的设计细节",
                "transition": "fade"
            }
        }
    }


class ScriptAndStoryboardResponse(BaseModel):
    """Response containing generated script and storyboard."""
    script: List[ScriptSegment] = Field(..., description="List of script segments")
    storyboard: List[StoryboardScene] = Field(..., description="List of storyboard scenes")
    total_duration: float = Field(..., gt=0, description="Total video duration in seconds")

    model_config = {
        "json_schema_extra": {
            "example": {
                "script": [
                    {"text": "欢迎体验革命性的产品", "duration": 2.0},
                    {"text": "它将改变您的生活方式", "duration": 3.0}
                ],
                "storyboard": [
                    {
                        "scene_index": 1,
                        "duration": 2.0,
                        "visual_prompt": "产品包装特写，灯光柔和",
                        "transition": "fade"
                    },
                    {
                        "scene_index": 2,
                        "duration": 3.0,
                        "visual_prompt": "产品在实际使用场景中",
                        "transition": "cut"
                    }
                ],
                "total_duration": 5.0
            }
        }
    }


class VideoProjectCreate(BaseModel):
    """Request schema for creating a new video project."""
    product_id: uuid.UUID = Field(..., description="Product ID to generate video for")
    mode: VideoMode = Field(..., description="Video generation mode")
    target_duration: int = Field(..., ge=15, le=60, description="Target video duration in seconds")

    model_config = {
        "json_schema_extra": {
            "example": {
                "product_id": "123e4567-e89b-12d3-a456-426614174000",
                "mode": "creative_ad",
                "target_duration": 30
            }
        }
    }


class VideoProjectResponse(BaseModel):
    """Response schema for video project information."""
    id: uuid.UUID
    product_id: uuid.UUID
    mode: VideoMode
    target_duration: int
    status: str
    script: Optional[List[ScriptSegment]] = None
    storyboard: Optional[List[StoryboardScene]] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True
    }


class ScriptGenerationRequest(BaseModel):
    """Request schema for script and storyboard generation."""
    product_id: uuid.UUID = Field(..., description="Product ID to generate video for")
    mode: VideoMode = Field(..., description="Video generation mode")
    target_duration: int = Field(..., ge=15, le=60, description="Target video duration in seconds")

    model_config = {
        "json_schema_extra": {
            "example": {
                "product_id": "123e4567-e89b-12d3-a456-426614174000",
                "mode": "creative_ad",
                "target_duration": 30
            }
        }
    }


class TaskCreatedResponse(BaseModel):
    """Response schema for task creation."""
    task_id: str = Field(..., description="Celery task ID for tracking progress")
    status: str = Field(..., description="Initial task status")

    model_config = {
        "json_schema_extra": {
            "example": {
                "task_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "processing"
            }
        }
    }


class JobStatusResponse(BaseModel):
    """Response schema for job status queries."""
    task_id: str
    status: str
    progress: int = Field(..., ge=0, le=100, description="Progress percentage")
    message: Optional[str] = None
    error_message: Optional[str] = None
    result: Optional[ScriptAndStoryboardResponse] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True
    }


class VideoGenerationError(BaseModel):
    """Error response for video generation failures."""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Detailed error message")
    details: Optional[Dict] = Field(None, description="Additional error details")

    model_config = {
        "json_schema_extra": {
            "example": {
                "error": "GenerationFailed",
                "message": "AI service returned invalid JSON format",
                "details": {
                    "raw_response": "Some malformed text...",
                    "attempt": 2
                }
            }
        }
    }


# ---------- Story 4.3: Video Rendering Schemas ----------

class RenderRequest(BaseModel):
    """Request schema for triggering video render."""
    pass  # Currently no extra params (script comes from project). Expandable later.

    model_config = {
        "json_schema_extra": {
            "example": {}
        }
    }


class RenderTaskCreatedResponse(BaseModel):
    """Response for render task creation."""
    job_id: str = Field(..., description="VideoGenerationJob ID tracking the render")
    task_id: str = Field(..., description="Celery task ID for tracking progress")
    status: str = Field(..., description="Initial task status")

    model_config = {
        "json_schema_extra": {
            "example": {
                "job_id": "123e4567-e89b-12d3-a456-426614174000",
                "task_id": "123e4567-e89b-12d3-a456-426614174001",
                "status": "processing"
            }
        }
    }


class RenderJobStatusResponse(BaseModel):
    """Response for render job status queries."""
    job_id: str
    task_id: str
    status: str
    progress: int = Field(..., ge=0, le=100)
    video_urls: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True
    }


# ---------- Story 4.4: Video Preview & TTS Schemas ----------

class AudioRegenerationParams(BaseModel):
    """Request schema for audio track regeneration."""
    voice_id: str = Field(..., description="TTS voice ID (e.g., 'nova', 'alloy', 'echo')")
    speed: float = Field(1.0, ge=0.5, le=2.0, description="Playback speed multiplier")
    volume: float = Field(1.0, ge=0.0, le=1.0, description="Volume level")

    model_config = {
        "json_schema_extra": {
            "example": {
                "voice_id": "nova",
                "speed": 1.0,
                "volume": 1.0
            }
        }
    }


class AudioRegenerationResponse(BaseModel):
    """Response for audio regeneration request."""
    task_id: str = Field(..., description="Celery task ID for tracking progress")
    status: str = Field(..., description="Initial task status")
    estimated_cost: Optional[float] = Field(None, description="Estimated API cost in USD")

    model_config = {
        "json_schema_extra": {
            "example": {
                "task_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "processing",
                "estimated_cost": 0.015
            }
        }
    }


class VideoResponse(BaseModel):
    """Response schema for Video model."""
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    status: str
    video_url: Optional[str] = None
    duration: Optional[float] = None
    file_size: Optional[int] = None
    quality: str
    progress: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }

