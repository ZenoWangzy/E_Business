"""
Video Script & Storyboard Generation Celery Task - Background worker for AI video generation.
Story 4.2: Script & Storyboard AI Service

Enhanced implementation with VideoService integration and Redis status updates.
"""

from datetime import datetime, timezone
from celery.exceptions import SoftTimeLimitExceeded
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.core.logger import get_logger, log_task_event
from app.db.session import get_db_context
from app.models.video import VideoGenerationJob, VideoProject, JobStatus
from app.services.video_service import VideoService, VideoRenderService, VideoGenerationError

settings = get_settings()
logger = get_logger(__name__)


@celery_app.task(
    name="app.tasks.video_tasks.generate_script_and_storyboard_task",
    bind=True,
    soft_time_limit=600,  # 10 minutes soft limit
    time_limit=660,        # 11 minutes hard limit
    autoretry_for=(VideoGenerationError,),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=3,
    retry_backoff_max=300,  # 5 minutes max backoff
)
def generate_script_and_storyboard_task(self, job_id: str, params: dict) -> dict:
    """
    Celery task for AI video script and storyboard generation.

    Enhanced with:
    - SoftTimeLimitExceeded handling
    - Redis status publishing
    - VideoService integration
    - Database context management

    Args:
        job_id: UUID string of the VideoGenerationJob
        params: Generation parameters including mode, duration, product_id

    Returns:
        dict with task_id, status, and generation results
    """
    task_id = self.request.id
    logger.info(f"Starting video script generation task {task_id} for job {job_id}")

    try:
        with get_db_context() as db:
            # Initialize video service
            video_service = VideoService(db)

            # Process the generation request (async method -> run in a fresh loop)
            import asyncio
            result = asyncio.run(video_service.process_script_generation(job_id, params))

            log_task_event(
                logger,
                task_id,
                "completed",
                "video_script_task_completed",
                job_id=job_id,
                script_segments=len(result.get("script", [])),
                storyboard_scenes=len(result.get("storyboard", []))
            )

            return {
                "task_id": task_id,
                "job_id": job_id,
                "status": "completed",
                "result": result
            }

    except SoftTimeLimitExceeded:
        logger.error(f"Video script generation task {task_id} timed out")

        # Update job status to failed due to timeout
        with get_db_context() as db:
            job = db.query(VideoGenerationJob).filter_by(task_id=job_id).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = "Task timeout - generation took too long"
                job.completed_at = datetime.now(timezone.utc)
                db.commit()

        log_task_event(
            logger,
            task_id,
            "timeout",
            "video_script_task_timeout",
            job_id=job_id
        )

        return {
            "task_id": task_id,
            "job_id": job_id,
            "status": "failed",
            "error": "Task timeout - generation took too long"
        }

    except VideoGenerationError as e:
        logger.error(f"Video script generation task {task_id} failed: {str(e)}")

        log_task_event(
            logger,
            task_id,
            "failed",
            "video_script_task_failed",
            job_id=job_id,
            error=str(e)
        )

        # Retry logic - this will trigger retry_backoff
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying video script generation task {task_id} (attempt {self.request.retries + 1})")
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))  # Exponential backoff

        return {
            "task_id": task_id,
            "job_id": job_id,
            "status": "failed",
            "error": str(e)
        }

    except Exception as e:
        logger.error(f"Unexpected error in video script generation task {task_id}: {str(e)}")

        # Update job status to failed
        with get_db_context() as db:
            job = db.query(VideoGenerationJob).filter_by(task_id=job_id).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = f"Unexpected error: {str(e)}"
                job.completed_at = datetime.now(timezone.utc)
                db.commit()

        log_task_event(
            logger,
            task_id,
            "error",
            "video_script_task_unexpected_error",
            job_id=job_id,
            error=str(e)
        )

        return {
            "task_id": task_id,
            "job_id": job_id,
            "status": "failed",
            "error": f"Unexpected error: {str(e)}"
        }


@celery_app.task(
    name="app.tasks.video_tasks.render_video_task",
    bind=True,
    soft_time_limit=900,
    time_limit=960,
)
def render_video_task(self, job_id: str) -> dict:
    """Celery task that invokes VideoRenderService for Story 4.3.

    Args:
        job_id: UUID string (VideoGenerationJob.id)
    Returns: dict with task_id, job_id, status
    """
    task_id = self.request.id
    logger.info(f"Starting video render task {task_id} for job {job_id}")

    try:
        # Use sync DB context to create an AsyncSession when calling async service via loop
        with get_db_context() as db_sync:
            # Import here to avoid circulars
            import asyncio
            from sqlalchemy.ext.asyncio import AsyncSession
            from app.db.session import AsyncSessionLocal

            async def run():
                async with AsyncSessionLocal() as adb:  # type: AsyncSession
                    service = VideoRenderService(adb)
                    result = await service.process_render(job_id)
                    return result

            result = asyncio.run(run())

        log_task_event(
            logger,
            task_id,
            "completed",
            "video_render_task_completed",
            job_id=job_id,
            status=result.get("status")
        )
        return {
            "task_id": task_id,
            "job_id": job_id,
            "status": result.get("status", "completed"),
            "result": result,
        }

    except Exception as e:
        logger.error(f"Video render task {task_id} failed: {e}")
        log_task_event(
            logger,
            task_id,
            "failed",
            "video_render_task_failed",
            job_id=job_id,
            error=str(e)
        )
        return {
            "task_id": task_id,
            "job_id": job_id,
            "status": "failed",
            "error": str(e),
        }


@celery_app.task(
    name="app.tasks.video_tasks.cleanup_expired_video_jobs",
    bind=True,
)
def cleanup_expired_video_jobs(self):
    """
    Periodic task to clean up expired video generation jobs.

    This task should be scheduled to run periodically (e.g., daily)
    to clean up jobs that have been in pending state for too long.
    """
    from datetime import datetime, timezone, timedelta

    logger.info("Starting cleanup of expired video generation jobs")

    try:
        with get_db_context() as db:
            # Find jobs that have been pending for more than 24 hours
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)

            expired_jobs = db.query(VideoGenerationJob).filter(
                VideoGenerationJob.status == JobStatus.PENDING,
                VideoGenerationJob.created_at < cutoff_time
            ).all()

            for job in expired_jobs:
                job.status = JobStatus.FAILED
                job.error_message = "Job expired due to inactivity"
                job.completed_at = datetime.now(timezone.utc)

                # Also update associated video project
                video_project = db.query(VideoProject).filter_by(id=job.video_project_id).first()
                if video_project:
                    video_project.status = "failed"
                    video_project.error_message = "Generation job expired due to inactivity"

                logger.info(f"Marked expired video generation job {job.id} as failed")

            db.commit()

            logger.info(f"Cleaned up {len(expired_jobs)} expired video generation jobs")

    except Exception as e:
        logger.error(f"Error during cleanup of expired video jobs: {str(e)}")

    return {
        "status": "completed",
        "cleaned_jobs": len(expired_jobs) if 'expired_jobs' in locals() else 0
    }


@celery_app.task(
    name="app.tasks.video_tasks.audio_regeneration_task",
    bind=True,
    queue='video_generation',
    soft_time_limit=300,  # 5 minutes soft limit
    time_limit=330,        # 5.5 minutes hard limit
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=2,
)
def audio_regeneration_task(self, video_id: str, audio_track_id: str, original_video_url: str, audio_path: str) -> dict:
    """
    Celery task for audio track regeneration (Story 4.4).

    Performs FFmpeg remuxing of video with new audio track and uploads to MinIO.

    Args:
        video_id: Video ID
        audio_track_id: Audio track ID
        original_video_url: URL of original video
        audio_path: Path to new audio file

    Returns:
        dict with task_id, status, and result
    """
    task_id = self.request.id
    logger.info(f"Starting audio regeneration task {task_id} for video {video_id}")

    try:
        import asyncio
        import redis
        import json
        import os
        import tempfile
        import urllib.request

        # Redis client for progress updates
        redis_client = redis.from_url(settings.redis_url)

        def publish_progress(progress: int, message: str):
            """Publish progress update to Redis."""
            try:
                payload = {
                    "status": "processing" if progress < 100 else "completed",
                    "progress": progress,
                    "message": message,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                redis_client.publish(f"task_updates:{task_id}", json.dumps(payload))
                logger.debug(f"Published progress: {progress}% - {message}")
            except Exception as e:
                logger.warning(f"Failed to publish progress: {e}")

        # Initial progress
        publish_progress(0, "Starting audio remuxing...")

        with get_db_context() as db:
            from app.models.video import Video, VideoAudioTrack
            from app.core.storage import get_minio_client
            from datetime import timedelta

            publish_progress(10, "Loading video and audio track...")

            # Load video and audio track
            video = db.query(Video).filter_by(id=video_id).first()
            audio_track = db.query(VideoAudioTrack).filter_by(id=audio_track_id).first()

            if not video or not audio_track:
                raise Exception("Video or AudioTrack not found")

            # Load VideoProject to get script
            from app.models.video import VideoProject
            video_project = db.query(VideoProject).filter_by(id=video.project_id).first()
            if not video_project or not video_project.script:
                raise Exception("VideoProject or script not found")

            publish_progress(15, "Generating TTS audio...")

            # Generate TTS audio from script
            script_text = ""
            for segment in video_project.script:
                script_text += segment.get("text", "") + " "

            if not script_text.strip():
                raise Exception("No script text found in project")

            # Generate TTS using OpenAI or mock based on settings
            if settings.ai_mock_mode:
                # Mock TTS generation for development
                logger.info("Using mock TTS generation")
                audio_path = self._generate_mock_tts_sync(script_text)
            else:
                # Real TTS generation using OpenAI
                logger.info(f"Generating OpenAI TTS: voice={audio_track.voice_id}, speed={audio_track.speed}")
                audio_path = self._generate_openai_tts_sync(
                    script_text,
                    audio_track.voice_id,
                    audio_track.speed
                )

            publish_progress(30, "Downloading original video...")

            # Download original video to temporary file
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_video:
                urllib.request.urlretrieve(original_video_url, temp_video.name)
                local_video_path = temp_video.name

            publish_progress(40, "Remuxing video with new audio...")

            # Perform FFmpeg remuxing (synchronous subprocess call)
            import subprocess
            remuxed_path = local_video_path.replace('.mp4', '_remuxed.mp4')
            if remuxed_path == local_video_path:
                remuxed_path = local_video_path + '_remuxed.mp4'
            
            try:
                # FFmpeg command: copy video stream, replace audio with AAC
                cmd = [
                    'ffmpeg', '-y',
                    '-i', local_video_path,
                    '-i', audio_path,
                    '-c:v', 'copy',  # Copy video without re-encoding
                    '-c:a', 'aac',   # Convert audio to AAC
                    '-b:a', '128k',
                    '-map', '0:v:0',  # Map video from first input
                    '-map', '1:a:0',  # Map audio from second input
                    '-movflags', 'faststart',
                    remuxed_path
                ]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                if result.returncode != 0:
                    logger.error(f"FFmpeg error: {result.stderr}")
                    raise Exception(f"FFmpeg failed: {result.stderr}")
            except subprocess.TimeoutExpired:
                raise Exception("FFmpeg processing timeout")
            except FileNotFoundError:
                raise Exception("FFmpeg not found in system PATH")

            publish_progress(70, "Uploading to MinIO...")

            # Upload to MinIO
            minio = get_minio_client()
            object_name = f"workspaces/{video.workspace_id}/videos/{video_id}/audio_regenerated_{audio_track_id}.mp4"

            with open(remuxed_path, 'rb') as f:
                file_data = f.read()
                minio.put_object(
                    object_name,
                    file_data,
                    len(file_data),
                    content_type="video/mp4"
                )

            # Generate signed URL
            signed_url = minio.generate_presigned_download_url(
                object_name,
                expires=timedelta(days=7)
            )

            publish_progress(90, "Updating database...")

            # Update video with new URL
            video.video_url = signed_url
            video.status = "completed"
            video.progress = 100
            db.commit()

            # Update audio track with file info
            audio_track.audio_url = signed_url
            audio_track.duration = video.duration
            audio_track.file_size = len(file_data)
            db.commit()

            publish_progress(100, "Audio regeneration completed!")

            # Cleanup temporary files
            try:
                os.unlink(local_video_path)
                os.unlink(remuxed_path)
                if os.path.exists(audio_path):
                    os.unlink(audio_path)
            except Exception as cleanup_error:
                logger.warning(f"Cleanup error: {cleanup_error}")

            log_task_event(
                logger,
                task_id,
                "completed",
                "audio_regeneration_task_completed",
                video_id=video_id,
                audio_track_id=audio_track_id
            )

            return {
                "task_id": task_id,
                "video_id": video_id,
                "audio_track_id": audio_track_id,
                "status": "completed",
                "video_url": signed_url
            }

    except SoftTimeLimitExceeded:
        logger.error(f"Audio regeneration task {task_id} timed out")

        log_task_event(
            logger,
            task_id,
            "timeout",
            "audio_regeneration_task_timeout",
            video_id=video_id
        )

        return {
            "task_id": task_id,
            "video_id": video_id,
            "status": "failed",
            "error": "Task timeout - audio regeneration took too long"
        }

    except Exception as e:
        logger.error(f"Audio regeneration task {task_id} failed: {str(e)}")

        log_task_event(
            logger,
            task_id,
            "error",
            "audio_regeneration_task_error",
            video_id=video_id,
            error=str(e)
        )

        # Retry logic
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying audio regeneration task {task_id} (attempt {self.request.retries + 1})")
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))

        return {
            "task_id": task_id,
            "video_id": video_id,
            "status": "failed",
            "error": str(e)
        }

    @staticmethod
    def _generate_openai_tts_sync(text: str, voice_id: str, speed: float) -> str:
        """Generate TTS audio using OpenAI API (synchronous for Celery).
        
        Args:
            text: Text to convert to speech
            voice_id: OpenAI voice ID (nova, alloy, echo, shimmer)
            speed: Speech speed multiplier (0.25-4.0)
        
        Returns:
            Path to generated audio file
        """
        import tempfile
        import os
        from openai import OpenAI
        
        client = OpenAI(api_key=settings.openai_api_key)
        
        # Create temporary file for audio
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
            temp_path = temp_file.name
        
        try:
            # Generate speech
            response = client.audio.speech.create(
                model="tts-1",
                voice=voice_id,
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
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            raise Exception(f"TTS generation failed: {str(e)}")
    
    @staticmethod
    def _generate_mock_tts_sync(text: str) -> str:
        """Generate mock TTS audio for development/testing.
        
        Args:
            text: Text to convert (ignored in mock)
        
        Returns:
            Path to mock audio file
        """
        import tempfile
        import wave
        import numpy as np
        
        # Create temporary WAV file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_path = temp_file.name
        
        try:
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
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            raise Exception(f"Mock TTS generation failed: {str(e)}")