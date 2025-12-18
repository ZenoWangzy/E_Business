"""
Video script and storyboard generation service.

Handles AI-powered video script and storyboard generation with mock/real mode support.
Story 4.2: Script & Storyboard AI Service
"""

import json
import uuid
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

import numpy as np
import redis
import openai
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logger import get_logger, log_task_event
from app.core.prompts.video import get_video_prompt_template
from app.models.video import VideoProject, VideoGenerationJob, VideoMode, VideoProjectStatus
from app.models.image import JobStatus

settings = get_settings()
logger = get_logger(__name__)

# Redis client for publishing status updates
redis_client = redis.from_url(settings.redis_url)


class VideoGenerationError(Exception):
    """Custom exception for video generation errors."""
    pass


class VideoService:
    """Service for handling AI video script and storyboard generation."""

    def __init__(self, db: Session):
        """Initialize the service with database session."""
        self.db = db

    async def process_script_generation(self, job_id: str, params: Dict) -> Dict:
        """Process a video script and storyboard generation request.

        Args:
            job_id: The generation job ID
            params: Generation parameters including product_id, mode, duration

        Returns:
            Dict with generated script and storyboard

        Raises:
            VideoGenerationError: If generation fails
        """
        logger.info(f"Starting video script generation for job {job_id}")
        start_time = time.time()

        try:
            # 1. Get the generation job and associated video project
            job = self.db.query(VideoGenerationJob).filter_by(task_id=job_id).first()
            if not job:
                raise VideoGenerationError(f"Generation job {job_id} not found")

            video_project = self.db.query(VideoProject).filter_by(id=job.video_project_id).first()
            if not video_project:
                raise VideoGenerationError(f"Video project {job.video_project_id} not found")

            # Update job status to processing
            job.status = JobStatus.PROCESSING
            job.started_at = datetime.now(timezone.utc)
            self.db.commit()

            # 2. Update video project status
            video_project.status = VideoProjectStatus.PROCESSING
            video_project.started_at = datetime.now(timezone.utc)
            self.db.commit()

            await self._publish_progress(job_id, 10, "Initializing generation...")

            # 3. Get product context
            product = video_project.product
            context = {
                "name": product.name,
                "description": product.description or "",
                "selling_points": product.selling_points or [],
                "category": product.category.value if product.category else "",
                "target_audience": product.target_audience or ""
            }

            await self._publish_progress(job_id, 20, "Generating script...")

            # 4. Generate script and storyboard based on mode
            mode = VideoMode(params.get("mode", "creative_ad"))
            duration = params.get("duration", 30)

            if settings.ai_mock_mode:
                logger.info(f"Using mock generation mode for job {job_id}")
                result = await self._generate_mock_script_and_storyboard(context, mode, duration)
                model_used = "mock"
                token_usage = {"prompt_tokens": 0, "completion_tokens": 0}
            else:
                logger.info(f"Using real AI generation mode for job {job_id}")
                result = await self._generate_real_script_and_storyboard(context, mode, duration)
                model_used = settings.openai_model
                token_usage = getattr(result, '_token_usage', {"prompt_tokens": 0, "completion_tokens": 0})

            await self._publish_progress(job_id, 80, "Finalizing results...")

            # 5. Save results to database
            await self._save_generation_result(
                project=video_project,
                script=result["script"],
                storyboard=result["storyboard"],
                model_used=model_used,
                token_usage=token_usage
            )

            await self._publish_progress(job_id, 90, "Updating job status...")

            # 6. Update job status
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now(timezone.utc)
            job.progress = 100
            self.db.commit()

            # 7. Log task completion
            duration_sec = time.time() - start_time
            log_task_event(
                logger,
                job_id,
                "completed",
                "video_script_generation_completed",
                duration=duration_sec,
                mode=mode.value,
                script_segments=len(result["script"]),
                storyboard_scenes=len(result["storyboard"])
            )

            await self._publish_progress(job_id, 100, "Generation completed successfully")

            logger.info(f"Video script generation completed for job {job_id} in {duration_sec:.2f}s")
            return result

        except Exception as e:
            logger.error(f"Video script generation failed for job {job_id}: {str(e)}")

            # Update job status to failed
            job = self.db.query(VideoGenerationJob).filter_by(task_id=job_id).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = str(e)
                job.completed_at = datetime.now(timezone.utc)
                self.db.commit()

                # Update video project status
                video_project = self.db.query(VideoProject).filter_by(id=job.video_project_id).first()
                if video_project:
                    video_project.status = VideoProjectStatus.FAILED
                    video_project.error_message = str(e)
                    self.db.commit()

            await self._publish_progress(job_id, 0, f"Generation failed: {str(e)}")
            raise VideoGenerationError(f"Script generation failed: {str(e)}")

    async def _generate_mock_script_and_storyboard(
        self,
        context: Dict,
        mode: VideoMode,
        duration: int
    ) -> Dict:
        """Generate mock script and storyboard for development/testing.

        Args:
            context: Product context including name, description, selling points
            mode: Video generation mode (creative_ad or functional_intro)
            duration: Target video duration in seconds

        Returns:
            Dict with script and storyboard data
        """
        if mode == VideoMode.CREATIVE_AD:
            script_data = [
                {"text": f"✨ 想象一下，{context['name']}正在改变您的生活！", "duration": duration * 0.2},
                {"text": f"🎯 这不仅仅是一个产品，这是一个革命性的解决方案", "duration": duration * 0.3},
                {"text": f"💫 凭借{context['selling_points'][0] if context['selling_points'] else '卓越品质'}，我们重新定义了标准", "duration": duration * 0.3},
                {"text": f"🚀 {context['name']} - 未来已来！", "duration": duration * 0.2}
            ]
            storyboard_data = [
                {"scene_index": 1, "duration": duration * 0.2, "visual_prompt": f"{context['name']}产品精美展示，柔和的光线突出设计细节", "transition": "fade"},
                {"scene_index": 2, "duration": duration * 0.3, "visual_prompt": f"产品在实际使用场景中，展示{context['selling_points'][0] if context['selling_points'] else '核心功能'}", "transition": "cut"},
                {"scene_index": 3, "duration": duration * 0.3, "visual_prompt": f"特写镜头展示产品的高级材质和精密工艺", "transition": "slide"},
                {"scene_index": 4, "duration": duration * 0.2, "visual_prompt": f"{context['name']}品牌Logo和产品并排展示，优雅的背景", "transition": "fade"}
            ]
        else:  # FUNCTIONAL_INTRO
            script_data = [
                {"text": f"欢迎了解{context['name']}，这是一款{context.get('category', '创新')}产品", "duration": duration * 0.25},
                {"text": f"主要特点：{context['selling_points'][0] if context['selling_points'] else '高性能设计'}", "duration": duration * 0.25},
                {"text": f"适用场景：{context.get('target_audience', '专业人士和个人用户')}", "duration": duration * 0.25},
                {"text": f"{context['description'][:50]}...", "duration": duration * 0.25}
            ]
            storyboard_data = [
                {"scene_index": 1, "duration": duration * 0.25, "visual_prompt": f"{context['name']}产品全景展示，清晰的功能分区", "transition": "fade"},
                {"scene_index": 2, "duration": duration * 0.25, "visual_prompt": f"产品功能演示，重点展示{context['selling_points'][0] if context['selling_points'] else '主要功能'}", "transition": "cut"},
                {"scene_index": 3, "duration": duration * 0.25, "visual_prompt": f"不同应用场景的使用案例展示", "transition": "slide"},
                {"scene_index": 4, "duration": duration * 0.25, "visual_prompt": f"产品规格和特性信息图表", "transition": "fade"}
            ]

        return {
            "script": script_data,
            "storyboard": storyboard_data
        }

    async def _generate_real_script_and_storyboard(
        self,
        context: Dict,
        mode: VideoMode,
        duration: int
    ) -> Dict:
        """Generate real script and storyboard using OpenAI.

        Args:
            context: Product context including name, description, selling points
            mode: Video generation mode (creative_ad or functional_intro)
            duration: Target video duration in seconds

        Returns:
            Dict with script and storyboard data

        Raises:
            VideoGenerationError: If AI generation fails
        """
        try:
            # Get appropriate prompt template
            prompt_template = get_video_prompt_template(mode.value)

            # Format prompt with context
            segments = max(2, min(4, duration // 8))  # 2-4 segments based on duration
            prompt = prompt_template.format(
                name=context["name"],
                description=context["description"],
                selling_points=", ".join(context["selling_points"][:3]),  # Limit to top 3
                duration=duration,
                segments=segments,
                category=context.get("category", ""),
                target_audience=context.get("target_audience", "")
            )

            # Call OpenAI API
            client = openai.OpenAI(api_key=settings.openai_api_key)

            response = client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": "你是一个专业的视频脚本编剧，必须严格按照指定的JSON格式返回结果。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=settings.video_temperature,
                max_tokens=settings.video_max_tokens
            )

            # Parse response
            content = response.choices[0].message.content.strip()

            # Store token usage
            response._token_usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }

            
            try:
                result = json.loads(content)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse OpenAI response as JSON: {content[:200]}...")
                raise VideoGenerationError(f"Invalid AI response format: {str(e)}")

            # Validate response structure
            if not isinstance(result, dict) or "script" not in result or "storyboard" not in result:
                raise VideoGenerationError("AI response missing required fields: script and storyboard")

            # Validate script segments
            if not isinstance(result["script"], list):
                raise VideoGenerationError("Script must be a list")

            for segment in result["script"]:
                if not isinstance(segment, dict) or "text" not in segment or "duration" not in segment:
                    raise VideoGenerationError("Invalid script segment format")

            # Validate storyboard scenes
            if not isinstance(result["storyboard"], list):
                raise VideoGenerationError("Storyboard must be a list")

            for scene in result["storyboard"]:
                required_fields = ["scene_index", "duration", "visual_prompt", "transition"]
                if not isinstance(scene, dict) or not all(field in scene for field in required_fields):
                    raise VideoGenerationError("Invalid storyboard scene format")

            return result

        except Exception as e:
            if isinstance(e, VideoGenerationError):
                raise
            logger.error(f"OpenAI API error: {str(e)}")
            raise VideoGenerationError(f"AI generation failed: {str(e)}")

    async def _publish_progress(self, task_id: str, progress: int, message: str) -> None:
        """Publish progress update to Redis.

        Args:
            task_id: The task ID
            progress: Progress percentage (0-100)
            message: Progress message
        """
        try:
            channel = f"task_updates:{task_id}"
            payload = {
                "status": "processing" if progress < 100 else "completed",
                "progress": progress,
                "message": message,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            redis_client.publish(channel, json.dumps(payload))
            logger.debug(f"Published progress for task {task_id}: {progress}% - {message}")

        except Exception as e:
            logger.error(f"Failed to publish progress for task {task_id}: {str(e)}")
            # Don't raise exception - progress publishing is not critical

    async def _save_generation_result(
        self,
        project: VideoProject,
        script: List[Dict],
        storyboard: List[Dict],
        model_used: str,
        token_usage: Dict
    ) -> None:
        """Save generation results to video project.

        Args:
            project: VideoProject to update
            script: Generated script data
            storyboard: Generated storyboard data
            model_used: AI model used
            token_usage: Token usage statistics
        """
        try:
            # Update video project with results
            project.script = script
            project.storyboard = storyboard
            project.status = VideoProjectStatus.SCRIPT_READY
            project.model_used = model_used
            project.token_usage = token_usage
            project.completed_at = datetime.now(timezone.utc)

            self.db.commit()
            self.db.refresh(project)

            logger.info(f"Saved generation results for video project {project.id}")

        except Exception as e:
            logger.error(f"Failed to save generation results: {str(e)}")
            raise VideoGenerationError(f"Failed to save results: {str(e)}")

    async def regenerate_audio_track(
        self,
        project_id: str,
        params: Dict
    ) -> Dict[str, Any]:
        """Regenerate audio track for a video with new TTS settings (Story 4.4).

        Args:
            project_id: Video project ID
            params: Audio regeneration parameters (voice_id, speed, volume)

        Returns:
            Dict with task_id and status

        Raises:
            VideoGenerationError: If regeneration fails
        """
        logger.info(f"Starting audio regeneration for project {project_id}")

        try:
            # 1. Load video project
            video_project = self.db.query(VideoProject).filter_by(id=project_id).first()
            if not video_project:
                raise VideoGenerationError(f"Video project {project_id} not found")

            # 2. Check if video project has script and storyboard
            if not video_project.script or not video_project.storyboard:
                raise VideoGenerationError("Video project must have script before audio regeneration")

            # 3. Get current video (if exists)
            from app.models.video import Video, VideoAudioTrack
            current_video = self.db.query(Video).filter_by(project_id=project_id).first()
            if not current_video:
                raise VideoGenerationError("No video found for this project. Render video first.")

            # 4. Extract TTS parameters
            voice_id = params.get("voice_id", "nova")
            speed = params.get("speed", 1.0)
            volume = params.get("volume", 1.0)

            logger.info(f"Audio regeneration params: voice={voice_id}, speed={speed}, volume={volume}")

            # 5. Extract script text from project
            script_text = ""
            for segment in video_project.script:
                script_text += segment.get("text", "") + " "

            if not script_text.strip():
                raise VideoGenerationError("No script text found in project")

            # 6. Generate TTS audio
            logger.info("Generating TTS audio...")
            if settings.ai_mock_mode:
                # Mock TTS generation for development
                audio_path = await self._generate_mock_tts_audio(script_text, voice_id, speed)
            else:
                # Real TTS generation using OpenAI
                audio_path = await self._generate_openai_tts_audio(script_text, voice_id, speed)

            # 7. Apply audio processing (volume adjustment)
            if volume != 1.0:
                logger.info(f"Adjusting audio volume to {volume}...")
                audio_path = await self._adjust_audio_volume(audio_path, volume)

            # 8. Create VideoAudioTrack record
            audio_track = VideoAudioTrack(
                video_id=current_video.id,
                workspace_id=video_project.workspace_id,
                voice_id=voice_id,
                speed=speed,
                volume=volume,
                provider="openai" if not settings.ai_mock_mode else "mock",
                audio_url=audio_path if not settings.ai_mock_mode else None
            )
            self.db.add(audio_track)
            self.db.commit()
            self.db.refresh(audio_track)

            # 9. Queue Celery task for video remuxing
            from app.tasks.video_tasks import audio_regeneration_task
            from celery import current_app

            task = audio_regeneration_task.delay(
                video_id=str(current_video.id),
                audio_track_id=str(audio_track.id),
                original_video_url=current_video.video_url,
                audio_path=audio_path
            )

            logger.info(f"Audio regeneration queued with task_id: {task.id}")

            return {
                "task_id": task.id,
                "status": "queued",
                "message": "Audio regeneration task queued successfully"
            }

        except Exception as e:
            logger.error(f"Audio regeneration failed for project {project_id}: {str(e)}")
            raise VideoGenerationError(f"Audio regeneration failed: {str(e)}")

    async def _generate_openai_tts_audio(self, text: str, voice_id: str, speed: float) -> str:
        """Generate TTS audio using OpenAI API.

        Args:
            text: Text to convert to speech
            voice_id: OpenAI voice ID (nova, alloy, echo, shimmer)
            speed: Speech speed multiplier (0.25-4.0)

        Returns:
            Path to generated audio file

        Raises:
            VideoGenerationError: If TTS generation fails
        """
        import tempfile
        import os
        from openai import AsyncOpenAI

        try:
            client = AsyncOpenAI(api_key=settings.openai_api_key)

            # Map frontend voice IDs to OpenAI voice models
            voice_mapping = {
                "nova": "nova",
                "alloy": "alloy",
                "echo": "echo",
                "shimmer": "shimmer"
            }

            openai_voice = voice_mapping.get(voice_id, "nova")

            logger.info(f"Generating OpenAI TTS audio: voice={openai_voice}, speed={speed}")

            # Create temporary file for audio
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
                temp_path = temp_file.name

            # Generate speech
            response = await client.audio.speech.create(
                model="tts-1",
                voice=openai_voice,
                input=text,
                speed=speed,
                response_format="mp3"
            )

            # Save to temporary file
            response.stream_to_file(temp_path)

            logger.info(f"TTS audio generated successfully: {temp_path}")
            return temp_path

        except Exception as e:
            logger.error(f"OpenAI TTS generation failed: {str(e)}")
            # Clean up temp file if it exists
            if 'temp_path' in locals() and os.path.exists(temp_path):
                os.unlink(temp_path)
            raise VideoGenerationError(f"TTS generation failed: {str(e)}")

    async def _generate_mock_tts_audio(self, text: str, voice_id: str, speed: float) -> str:
        """Generate mock TTS audio for development/testing.

        Args:
            text: Text to convert to speech (ignored in mock)
            voice_id: Voice ID (ignored in mock)
            speed: Speech speed (ignored in mock)

        Returns:
            Path to mock audio file
        """
        import tempfile
        import os
        import wave
        import struct
        import numpy as np

        try:
            logger.info(f"Generating mock TTS audio for development")

            # Create temporary WAV file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_path = temp_file.name

            # Generate a simple sine wave as mock audio
            duration = 2.0  # 2 seconds of mock audio
            sample_rate = 22050
            frequency = 440  # A4 note

            # Generate sine wave
            t = np.linspace(0, duration, int(sample_rate * duration), False)
            wave_data = np.sin(frequency * 2 * np.pi * t)

            # Convert to 16-bit integers
            wave_data = (wave_data * 32767).astype(np.int16)

            # Write WAV file
            with wave.open(temp_path, 'w') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(wave_data.tobytes())

            logger.info(f"Mock TTS audio generated: {temp_path}")
            return temp_path

        except Exception as e:
            logger.error(f"Mock TTS generation failed: {str(e)}")
            # Clean up temp file if it exists
            if 'temp_path' in locals() and os.path.exists(temp_path):
                os.unlink(temp_path)
            raise VideoGenerationError(f"Mock TTS generation failed: {str(e)}")

    async def _adjust_audio_volume(self, audio_path: str, volume: float) -> str:
        """Adjust audio volume using pydub.

        Args:
            audio_path: Path to input audio file
            volume: Volume multiplier (0.0-1.0)

        Returns:
            Path to volume-adjusted audio file

        Raises:
            VideoGenerationError: If audio processing fails
        """
        import tempfile
        import os
        from pydub import AudioSegment

        try:
            logger.info(f"Adjusting audio volume to {volume}")

            # Load audio file
            audio = AudioSegment.from_file(audio_path)

            # Adjust volume (in dB)
            if volume <= 0:
                # Mute
                adjusted_audio = audio - 100  # Reduce by 100dB (essentially mute)
            else:
                # Convert linear volume to dB
                db_change = 20 * np.log10(volume)
                adjusted_audio = audio + db_change

            # Create output path
            output_path = audio_path.replace('.mp3', '_adjusted.mp3').replace('.wav', '_adjusted.wav')
            if output_path == audio_path:
                output_path = audio_path + '_adjusted'

            # Export adjusted audio
            adjusted_audio.export(output_path, format=os.path.splitext(output_path)[1][1:])

            logger.info(f"Audio volume adjusted: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Audio volume adjustment failed: {str(e)}")
            raise VideoGenerationError(f"Audio processing failed: {str(e)}")

    async def fast_remux_video(self, video_path: str, audio_path: str, output_path: str = None) -> str:
        """Fast remux video with new audio using FFmpeg (stream copy).

        Args:
            video_path: Path to input video file
            audio_path: Path to new audio file
            output_path: Optional output path (auto-generated if None)

        Returns:
            Path to remuxed video file

        Raises:
            VideoGenerationError: If FFmpeg processing fails
        """
        import os
        import ffmpeg

        try:
            logger.info(f"Fast remuxing video: {video_path} + {audio_path}")

            if output_path is None:
                output_path = video_path.replace('.mp4', '_remuxed.mp4')
                if output_path == video_path:
                    output_path = video_path + '_remuxed.mp4'

            # Fast remux: copy video stream, replace audio
            (
                ffmpeg
                .input(video_path)
                .output(
                    output_path,
                    vcodec='copy',  # Copy video without re-encoding
                    acodec='aac',   # Convert audio to AAC
                    audio_bitrate='128k'
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )

            # Verify output file exists
            if not os.path.exists(output_path):
                raise VideoGenerationError("FFmpeg failed to create output file")

            # Get file size
            file_size = os.path.getsize(output_path)
            logger.info(f"Video remuxed successfully: {output_path} ({file_size:,} bytes)")

            return output_path

        except ffmpeg.Error as e:
            logger.error(f"FFmpeg error: {e.stderr.decode()}")
            raise VideoGenerationError(f"FFmpeg processing failed: {str(e)}")
        except Exception as e:
            logger.error(f"Video remuxing failed: {str(e)}")
            raise VideoGenerationError(f"Video processing failed: {str(e)}")



"""
Below: Story 4.3 - Core Rendering Service (Task 2)
Adds provider abstraction and a mock provider stub for video rendering.
Task 3 will implement the mock provider behavior (delay, progress, URL).
"""
from dataclasses import dataclass
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


@dataclass
class RenderResult:
    """Lightweight result container for a render action."""
    status: str
    video_urls: List[str]
    extra: Dict[str, Any]


class VideoProvider:
    """Abstract provider definition for video rendering backends."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def render(self, *, job: VideoGenerationJob, project: VideoProject) -> RenderResult:  # pragma: no cover - interface
        raise NotImplementedError


class MockVideoProvider(VideoProvider):
    """Mock provider used for development and tests.

    Implements simulated processing (5–10s), progress events, and returns a
    placeholder URL. Intended for local development and CI.
    """

    async def render(self, *, job: VideoGenerationJob, project: VideoProject) -> RenderResult:
        import asyncio
        import random

        task_id = str(job.task_id)
        channel = f"task_updates:{task_id}"

        async def publish(progress: int, message: str) -> None:
            payload = {
                "status": "processing" if progress < 100 else "completed",
                "progress": progress,
                "message": message,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            try:
                redis_client.publish(channel, json.dumps(payload))
            except Exception as e:
                logger.warning(f"Failed to publish progress to Redis: {e}")

        total_seconds = random.uniform(5.0, 10.0)
        steps = [10, 30, 60, 90, 100]
        messages = {
            10: "Queuing render (mock)",
            30: "Preparing assets (mock)",
            60: "Rendering frames (mock)",
            90: "Encoding video (mock)",
            100: "Completed (mock)",
        }
        interval = total_seconds / (len(steps) - 1)

        # Simulate staged progress
        for p in steps:
            job.progress = p
            await self.db.commit()
            await publish(p, messages.get(p, "Processing"))
            if p < 100:
                await asyncio.sleep(interval)

        # Produce a placeholder URL for downstream consumers
        placeholder_url = f"https://example.com/mock-videos/{task_id}.mp4"
        return RenderResult(
            status="completed",
            video_urls=[placeholder_url],
            extra={
                "provider": "mock",
                "simulated_duration_s": round(total_seconds, 2),
            },
        )


# ---------------------------------------------------------------------------
# HTTP-based Provider Base Class (Story 4.3 expansion)
# ---------------------------------------------------------------------------
import httpx
import io
from app.core.storage import get_minio_client


class BaseHTTPVideoProvider(VideoProvider):
    """Base class for HTTP-based video generation APIs (Runway, Pika, Custom).

    Provides:
    - Async httpx client with configurable timeout/retries
    - MinIO upload helper for persisting returned videos
    - Progress publishing helpers
    """

    api_base_url: str = ""
    api_key_header: str = "Authorization"

    def __init__(self, db: AsyncSession, api_key: str = ""):
        super().__init__(db)
        self.api_key = api_key
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            timeout = httpx.Timeout(settings.video_api_request_timeout, connect=30.0)
            self._client = httpx.AsyncClient(timeout=timeout)
        return self._client

    async def _close_client(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    def _auth_headers(self) -> Dict[str, str]:
        if not self.api_key:
            return {}
        return {self.api_key_header: f"Bearer {self.api_key}"}

    async def _upload_video_to_minio(
        self,
        workspace_id: str,
        job_id: str,
        video_bytes: bytes,
        filename: str = "output.mp4",
    ) -> str:
        """Upload video bytes to MinIO and return presigned download URL."""
        minio = get_minio_client()
        object_name = f"workspaces/{workspace_id}/videos/{job_id}/{filename}"
        minio.put_object(
            object_name,
            io.BytesIO(video_bytes),
            len(video_bytes),
            content_type="video/mp4",
        )
        # Generate long-lived presigned URL (7 days)
        from datetime import timedelta
        url = minio.generate_presigned_download_url(object_name, expires=timedelta(days=7))
        logger.info(f"Uploaded video to MinIO: {object_name}")
        return url

    async def _download_video_from_url(self, url: str) -> bytes:
        """Download video from external URL."""
        client = await self._get_client()
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content

    # Subclasses must implement render()


class RunwayVideoProvider(BaseHTTPVideoProvider):
    """RunwayML Gen-2/Gen-3 API provider (placeholder)."""

    api_base_url = "https://api.runwayml.com"
    api_key_header = "Authorization"

    def __init__(self, db: AsyncSession):
        super().__init__(db, api_key=settings.runwayml_api_key)

    async def render(self, *, job: VideoGenerationJob, project: VideoProject) -> RenderResult:
        # TODO: Implement actual Runway API call
        # 1. POST /v1/generations with storyboard images
        # 2. Poll status until complete
        # 3. Download video and upload to MinIO
        raise NotImplementedError("RunwayML provider not yet implemented")


class PikaVideoProvider(BaseHTTPVideoProvider):
    """Pika Labs API provider (placeholder)."""

    api_base_url = "https://api.pika.art"
    api_key_header = "X-API-Key"

    def __init__(self, db: AsyncSession):
        super().__init__(db, api_key=settings.pika_api_key)

    async def render(self, *, job: VideoGenerationJob, project: VideoProject) -> RenderResult:
        raise NotImplementedError("Pika provider not yet implemented")


class CustomAPIVideoProvider(BaseHTTPVideoProvider):
    """Custom/self-hosted video API provider."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, api_key="")
        self.api_base_url = settings.custom_video_api_url

    async def render(self, *, job: VideoGenerationJob, project: VideoProject) -> RenderResult:
        raise NotImplementedError("Custom API provider not yet implemented")


# ---------------------------------------------------------------------------
# VideoRenderService (updated with provider routing)
# ---------------------------------------------------------------------------
class VideoRenderService:
    """Service orchestrating video rendering via configured provider."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def process_render(self, job_id: str) -> Dict[str, Any]:
        """Main entrypoint that updates job status and delegates to provider."""
        job_uuid = uuid.UUID(str(job_id))
        job = await self.db.get(VideoGenerationJob, job_uuid)
        if not job:
            raise ValueError(f"VideoGenerationJob {job_id} not found")

        # Load associated project with workspace isolation
        project_result = await self.db.execute(
            select(VideoProject).where(
                VideoProject.id == job.video_project_id,
                VideoProject.workspace_id == job.workspace_id,
            )
        )
        project = project_result.scalar_one_or_none()
        if not project:
            raise ValueError(
                f"VideoProject {job.video_project_id} not found in workspace {job.workspace_id}"
            )

        # Transition to processing
        job.status = JobStatus.PROCESSING
        job.started_at = datetime.now(timezone.utc)
        await self.db.commit()

        await self._publish_progress(str(job.task_id), 5, "Video render requested; preparing provider...")
        log_task_event(logger, str(job.task_id), "started", "Video render started")

        provider = self._get_provider()
        await self._publish_progress(str(job.task_id), 15, f"Provider selected: {settings.video_generation_provider}")

        # Delegate to provider
        try:
            result = await provider.render(job=job, project=project)
        except Exception as e:
            # Failure path
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            await self.db.commit()

            await self._publish_progress(str(job.task_id), 0, f"Failed: {e}")
            log_task_event(logger, str(job.task_id), "failed", f"Render failed: {e}")
            raise

        # Persist minimal results (even in stub form) to unblock later steps
        job.raw_results = [
            {
                "status": result.status,
                "video_urls": result.video_urls,
                "extra": result.extra,
            }
        ]
        job.progress = 20 if result.status == "queued" else 100
        if result.status == "completed":
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now(timezone.utc)
            await self._publish_progress(str(job.task_id), 100, "Video render complete")
            log_task_event(logger, str(job.task_id), "completed", "Video render completed")
        else:
            # Still in progress (expected for Task 2 stub)
            await self._publish_progress(str(job.task_id), job.progress, "Video render queued (mock)")

        await self.db.commit()

        return {
            "status": job.status.value,
            "progress": job.progress,
            "job_id": str(job.id),
            "task_id": str(job.task_id),
            "results": job.raw_results,
        }

    def _get_provider(self) -> VideoProvider:
        provider = (settings.video_generation_provider or "mock").lower()
        if provider == "mock":
            return MockVideoProvider(self.db)
        elif provider == "runway":
            return RunwayVideoProvider(self.db)
        elif provider == "pika":
            return PikaVideoProvider(self.db)
        elif provider == "custom":
            return CustomAPIVideoProvider(self.db)
        # Default fallback
        logger.warning(f"Unknown provider '{provider}', falling back to mock")
        return MockVideoProvider(self.db)

    async def _publish_progress(self, task_id: str, progress: int, message: str) -> None:
        """Publish progress updates to Redis (same channel pattern as copy service)."""
        channel = f"task_updates:{task_id}"
        payload = {
            "status": "processing" if progress < 100 else "completed",
            "progress": progress,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        try:
            redis_client.publish(channel, json.dumps(payload))
        except Exception as e:
            logger.warning(f"Failed to publish progress to Redis: {e}")
