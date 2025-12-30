"""
[IDENTITY]: Video Production Pipeline API
Orchestrates Scripting, Storyboarding, Rendering, and Audio.

[INPUT]:
- Stage Requests (Script/Render/TTS).

[LINK]:
- Task_Orchestrator -> ../../../tasks/video_tasks.py
- Service_Billing -> ../../../services/billing_service.py
- Model_Project -> ../../../models/video.py

[OUTPUT]: TaskIDs (Async) or Project State.
[POS]: /backend/app/api/v1/endpoints/video.py

[PROTOCOL]:
1. Multi-Stage Pipeline: Script -> Storyboard -> Render -> Audio.
2. Separate Quota/Credit checks for each expensive stage.
3. Strict Workspace Isolation for all assets and jobs.
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.api.deps import get_db, CurrentUser, CurrentWorkspaceMember, check_video_quota
from app.services.billing_service import BillingService
from app.models.video import VideoProject, VideoGenerationJob, VideoMode, VideoProjectStatus
from app.models.image import JobStatus
from app.models.product import Product
from app.schemas.video import (
    ScriptGenerationRequest,
    TaskCreatedResponse,
    JobStatusResponse,
    VideoProjectResponse,
    ScriptAndStoryboardResponse,
    VideoGenerationError,
    RenderRequest,
    RenderTaskCreatedResponse,
    RenderJobStatusResponse,
    AudioRegenerationParams,
    AudioRegenerationResponse,
)
from app.tasks.video_tasks import generate_script_and_storyboard_task, render_video_task

router = APIRouter(prefix="/video", tags=["video"])


@router.post(
    "/generate/script",
    response_model=TaskCreatedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(check_video_quota)]
)
async def generate_script_and_storyboard(
    request: ScriptGenerationRequest,
    member: CurrentWorkspaceMember,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db)
):
    """
    触发 AI 视频脚本和分镜板生成任务。

    Creates a generation job and queues it for async processing via Celery.
    Returns immediately with a task_id for status polling.

    Args:
        request: Script generation parameters (product_id, mode, target_duration)
        member: Current workspace member (for multi-tenant isolation)
        current_user: Current authenticated user
        db: Database session

    Returns:
        TaskCreatedResponse with task_id and initial status

    Raises:
        HTTPException: If product not found or validation fails
    """
    try:
        # Verify product exists and user has access
        product_result = await db.execute(
            select(Product).where(
                Product.id == request.product_id,
                Product.workspace_id == member.workspace_id
            )
        )
        product = product_result.scalar_one_or_none()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found or access denied"
            )

        # Create video project
        video_project = VideoProject(
            workspace_id=member.workspace_id,
            user_id=current_user.id,
            product_id=request.product_id,
            mode=request.mode,
            target_duration=request.target_duration,
            status=VideoProjectStatus.PENDING
        )

        db.add(video_project)
        await db.flush()  # Get the ID

        # Create generation job
        job = VideoGenerationJob(
            workspace_id=member.workspace_id,
            user_id=current_user.id,
            video_project_id=video_project.id,
            task_id=uuid.uuid4(),
            status=JobStatus.PENDING,
            generation_config={
                "mode": request.mode.value,
                "target_duration": request.target_duration,
                "product_id": str(request.product_id)
            }
        )

        db.add(job)
        await db.commit()
        await db.refresh(video_project)
        await db.refresh(job)

        # Queue async task
        task = generate_script_and_storyboard_task.delay(
            str(job.task_id),
            request.dict()
        )

        # Deduct billing credits (AC2: Video = 20 credits)
        billing_service = BillingService(db)
        await billing_service.deduct_credits(str(member.workspace_id), 20)

        return TaskCreatedResponse(
            task_id=str(job.task_id),
            status="processing"
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create generation task: {str(e)}"
        )


@router.post(
    "/workspaces/{workspace_id}/render/{project_id}",
    response_model=RenderTaskCreatedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(check_video_quota)]
)
async def trigger_video_render(
    workspace_id: UUID,
    project_id: UUID,
    request: RenderRequest,
    member: CurrentWorkspaceMember,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db)
):
    """触发视频渲染任务（Story 4.3）。

    - 校验项目归属与可见性
    - 创建 VideoGenerationJob（渲染）
    - 异步排队 Celery 任务
    - 返回 job_id/task_id 以便轮询
    """
    try:
        # Verify project exists in workspace
        project_result = await db.execute(
            select(VideoProject).where(
                VideoProject.id == project_id,
                VideoProject.workspace_id == member.workspace_id,
            )
        )
        project = project_result.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=404, detail="Video project not found or access denied")

        # Create render job
        job = VideoGenerationJob(
            workspace_id=member.workspace_id,
            user_id=current_user.id,
            video_project_id=project.id,
            task_id=uuid.uuid4(),
            status=JobStatus.PENDING,
            generation_config={
                "project_id": str(project.id),
                "mode": project.mode.value,
                "target_duration": project.target_duration,
            },
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)

        # Enqueue Celery render task
        async_task = render_video_task.delay(str(job.id))

        # Deduct billing credits (AC2: Render = 20 credits)
        billing_service = BillingService(db)
        await billing_service.deduct_credits(str(workspace_id), 20)

        return RenderTaskCreatedResponse(
            job_id=str(job.id),
            task_id=str(job.task_id),
            status="processing",
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to queue render: {e}")


@router.get(
    "/workspaces/{workspace_id}/render/jobs/{job_id}",
    response_model=RenderJobStatusResponse
)
async def get_render_job_status(
    workspace_id: UUID,
    job_id: UUID,
    member: CurrentWorkspaceMember,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db)
):
    """查询渲染任务状态（Story 4.3）。"""
    try:
        job_result = await db.execute(
            select(VideoGenerationJob).where(
                VideoGenerationJob.id == job_id,
                VideoGenerationJob.workspace_id == member.workspace_id,
            )
        )
        job = job_result.scalar_one_or_none()
        if not job:
            raise HTTPException(status_code=404, detail="Render job not found or access denied")

        return RenderJobStatusResponse(
            job_id=str(job.id),
            task_id=str(job.task_id),
            status=job.status.value,
            progress=job.progress,
            video_urls=(job.raw_results or [{}])[0].get("video_urls", []) if job.raw_results else [],
            error_message=job.error_message,
            created_at=job.created_at,
            updated_at=job.updated_at,
            completed_at=job.completed_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get render job status: {e}")


@router.get(
    "/jobs/{task_id}",
    response_model=JobStatusResponse
)
async def get_script_generation_job_status(
    task_id: str,
    member: CurrentWorkspaceMember,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db)
):
    """
    获取视频脚本生成任务状态。

    Args:
        task_id: Celery task ID
        member: Current workspace member
        current_user: Current authenticated user
        db: Database session

    Returns:
        JobStatusResponse with current status, progress, and results

    Raises:
        HTTPException: If job not found or access denied
    """
    try:
        # Verify job exists and user has access
        job_result = await db.execute(
            select(VideoGenerationJob).where(
                VideoGenerationJob.task_id == UUID(task_id),
                VideoGenerationJob.workspace_id == member.workspace_id
            )
        )
        job = job_result.scalar_one_or_none()

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Generation job not found or access denied"
            )

        # Get associated video project for additional context
        video_project_result = await db.execute(
            select(VideoProject).where(VideoProject.id == job.video_project_id)
        )
        video_project = video_project_result.scalar_one_or_none()

        response_data = {
            "task_id": task_id,
            "status": job.status.value,
            "progress": job.progress,
            "error_message": job.error_message,
            "created_at": job.created_at.isoformat(),
            "updated_at": job.updated_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None
        }

        # Include result if job is completed and has script/storyboard
        if (
            job.status == JobStatus.COMPLETED and
            video_project and
            video_project.script and
            video_project.storyboard
        ):
            # Convert database JSON to proper response format
            script_segments = []
            for segment in video_project.script:
                script_segments.append({
                    "text": segment["text"],
                    "duration": segment["duration"]
                })

            storyboard_scenes = []
            for scene in video_project.storyboard:
                storyboard_scenes.append({
                    "scene_index": scene["scene_index"],
                    "duration": scene["duration"],
                    "visual_prompt": scene["visual_prompt"],
                    "transition": scene["transition"]
                })

            response_data["result"] = ScriptAndStoryboardResponse(
                script=script_segments,
                storyboard=storyboard_scenes,
                total_duration=sum(seg["duration"] for seg in script_segments)
            )

        return JobStatusResponse(**response_data)

    except HTTPException:
        raise
    except ValueError as e:
        # Handle invalid UUID format
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid task ID format: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get job status: {str(e)}"
        )


@router.get(
    "/projects/{project_id}",
    response_model=VideoProjectResponse
)
async def get_video_project(
    project_id: UUID,
    member: CurrentWorkspaceMember,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db)
):
    """
    获取视频项目详情。

    Args:
        project_id: Video project ID
        member: Current workspace member
        current_user: Current authenticated user
        db: Database session

    Returns:
        VideoProjectResponse with project details

    Raises:
        HTTPException: If project not found or access denied
    """
    try:
        # Verify project exists and user has access
        project_result = await db.execute(
            select(VideoProject).where(
                VideoProject.id == project_id,
                VideoProject.workspace_id == member.workspace_id
            )
        )
        project = project_result.scalar_one_or_none()

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video project not found or access denied"
            )

        response_data = {
            "id": project.id,
            "product_id": project.product_id,
            "mode": project.mode.value,
            "target_duration": project.target_duration,
            "status": project.status.value,
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat(),
            "completed_at": project.completed_at.isoformat() if project.completed_at else None
        }

        # Include script and storyboard if available
        if project.script and project.storyboard:
            script_segments = []
            for segment in project.script:
                script_segments.append({
                    "text": segment["text"],
                    "duration": segment["duration"]
                })

            storyboard_scenes = []
            for scene in project.storyboard:
                storyboard_scenes.append({
                    "scene_index": scene["scene_index"],
                    "duration": scene["duration"],
                    "visual_prompt": scene["visual_prompt"],
                    "transition": scene["transition"]
                })

            response_data["script"] = script_segments
            response_data["storyboard"] = storyboard_scenes

        return VideoProjectResponse(**response_data)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get video project: {str(e)}"
        )


@router.get(
    "/projects",
    response_model=list[VideoProjectResponse]
)
async def list_video_projects(
    member: CurrentWorkspaceMember,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0
):
    """
    获取当前工作空间的所有视频项目列表。

    Args:
        member: Current workspace member
        current_user: Current authenticated user
        db: Database session
        limit: Maximum number of results to return
        offset: Number of results to skip

    Returns:
        List of VideoProjectResponse objects

    Raises:
        HTTPException: If database query fails
    """
    try:
        # Get projects for current workspace with pagination
        projects_result = await db.execute(
            select(VideoProject)
            .where(VideoProject.workspace_id == member.workspace_id)
            .order_by(VideoProject.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        projects = projects_result.scalars().all()

        response_data = []
        for project in projects:
            project_data = {
                "id": project.id,
                "product_id": project.product_id,
                "mode": project.mode.value,
                "target_duration": project.target_duration,
                "status": project.status.value,
                "created_at": project.created_at.isoformat(),
                "updated_at": project.updated_at.isoformat(),
                "completed_at": project.completed_at.isoformat() if project.completed_at else None
            }

            # Include script and storyboard if available
            if project.script and project.storyboard:
                script_segments = []
                for segment in project.script:
                    script_segments.append({
                        "text": segment["text"],
                        "duration": segment["duration"]
                    })

                storyboard_scenes = []
                for scene in project.storyboard:
                    storyboard_scenes.append({
                        "scene_index": scene["scene_index"],
                        "duration": scene["duration"],
                        "visual_prompt": scene["visual_prompt"],
                        "transition": scene["transition"]
                    })

                project_data["script"] = script_segments
                project_data["storyboard"] = storyboard_scenes

            response_data.append(VideoProjectResponse(**project_data))

        return response_data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list video projects: {str(e)}"
        )


# ---------- Story 4.4: Video Preview & TTS Integration Endpoints ----------

@router.post(
    "/projects/{project_id}/regenerate-audio",
    response_model=AudioRegenerationResponse,
    status_code=status.HTTP_202_ACCEPTED
)
async def regenerate_audio_track(
    project_id: UUID,
    params: AudioRegenerationParams,
    member: CurrentWorkspaceMember,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db)
):
    """
    触发视频音频重新生成 (Story 4.4).

    Allows users to regenerate the audio track with different TTS settings
    without re-rendering the entire video.

    Args:
        project_id: Video project ID
        params: Audio regeneration parameters (voice_id, speed, volume)
        member: Current workspace member
        current_user: Current authenticated user
        db: Database session

    Returns:
        AudioRegenerationResponse with task_id and status
    """
    try:
        # Verify project exists and user has access
        project_result = await db.execute(
            select(VideoProject).where(
                VideoProject.id == project_id,
                VideoProject.workspace_id == member.workspace_id
            )
        )
        project = project_result.scalar_one_or_none()

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video project not found or access denied"
            )

        # Get the video associated with this project
        from app.models.video import Video, VideoAudioTrack
        video_result = await db.execute(
            select(Video).where(
                Video.project_id == project_id,
                Video.workspace_id == member.workspace_id
            )
        )
        video = video_result.scalar_one_or_none()

        if not video or not video.video_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No rendered video found. Please render the video first."
            )

        # Create audio track record
        audio_track = VideoAudioTrack(
            video_id=video.id,
            workspace_id=member.workspace_id,
            voice_id=params.voice_id,
            speed=params.speed,
            volume=params.volume,
            provider="openai"
        )
        db.add(audio_track)
        await db.commit()
        await db.refresh(audio_track)

        # Queue Celery task for audio regeneration
        from app.tasks.video_tasks import audio_regeneration_task
        
        task = audio_regeneration_task.delay(
            video_id=str(video.id),
            audio_track_id=str(audio_track.id),
            original_video_url=video.video_url,
            audio_path=""  # Will be generated by the task using TTS
        )

        # Estimate cost based on script length (rough estimate: $0.015 per 1000 chars)
        estimated_cost = 0.015  # TODO: Calculate from script length

        return AudioRegenerationResponse(
            task_id=task.id,
            status="processing",
            estimated_cost=estimated_cost
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue audio regeneration: {str(e)}"
        )


@router.get(
    "/videos/{video_id}/download",
    status_code=status.HTTP_200_OK
)
async def download_video(
    video_id: UUID,
    member: CurrentWorkspaceMember,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db)
):
    """
    下载渲染完成的视频 (Story 4.4).

    Returns a redirect to the MinIO signed URL for video download.

    Args:
        video_id: Video ID
        member: Current workspace member
        current_user: Current authenticated user
        db: Database session

    Returns:
        Redirect to MinIO download URL
    """
    try:
        from app.models.video import Video
        from app.core.storage import get_minio_client
        from datetime import timedelta

        # Verify video exists and user has access
        video_result = await db.execute(
            select(Video).where(
                Video.id == video_id,
                Video.workspace_id == member.workspace_id
            )
        )
        video = video_result.scalar_one_or_none()

        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found or access denied"
            )

        if not video.video_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Video URL not available yet"
            )

        # Generate MinIO signed URL for secure download
        minio = get_minio_client()
        
        # Extract object name from video_url (assuming they follow consistent pattern)
        # If video_url is already a signed URL, redirect directly
        # Otherwise, generate a new signed URL
        if "X-Amz-Signature" in video.video_url:
            # Already a signed URL, redirect directly
            download_url = video.video_url
        else:
            # Generate new signed URL
            # Parse the object name from the URL
            object_name = f"workspaces/{video.workspace_id}/videos/{video.id}/output.mp4"
            download_url = minio.generate_presigned_download_url(
                object_name,
                expires=timedelta(hours=1)
            )

        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=download_url)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download video: {str(e)}"
        )