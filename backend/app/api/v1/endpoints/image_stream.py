"""
SSE (Server-Sent Events) endpoint for real-time image generation status updates.
"""

import json
import asyncio
from typing import AsyncGenerator
from uuid import UUID

import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import get_db
from app.models.image import ImageGenerationJob, JobStatus
from app.api.deps import get_current_user, get_current_workspace_member

router = APIRouter()


async def get_redis_client() -> redis.Redis:
    """Get Redis client instance."""
    settings = get_settings()
    return redis.from_url(settings.redis_url, decode_responses=True)


async def generate_sse_data(job_id: str, event_type: str, data: dict) -> str:
    """Generate SSE formatted data."""
    sse_data = {
        "taskId": job_id,
        "event": event_type,
        "data": data,
        "timestamp": asyncio.get_event_loop().time()
    }

    return f"event: {event_type}\ndata: {json.dumps(sse_data)}\n\n"


async def listen_to_redis_updates(job_id: str) -> AsyncGenerator[str, None]:
    """
    Listen to Redis Pub/Sub for job updates and convert to SSE format.
    """
    redis_client = await get_redis_client()
    pubsub = redis_client.pubsub()

    try:
        # Subscribe to the job's update channel
        channel = f"task_updates:{job_id}"
        await pubsub.subscribe(channel)

        # Send initial status
        yield await generate_sse_data(job_id, "status", {
            "status": "connected",
            "message": "Connected to task updates"
        })

        # Listen for updates
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    # Parse the message from Redis
                    task_data = json.loads(message["data"])

                    # Convert to SSE format
                    if task_data.get("status") == JobStatus.COMPLETED:
                        # For completed jobs, fetch the full job details with results
                        yield await generate_sse_data(job_id, "completed", {
                            "status": "completed",
                            "progress": 100,
                            "message": "Generation completed successfully",
                            "results": task_data.get("result_urls", [])
                        })
                        break
                    elif task_data.get("status") == JobStatus.FAILED:
                        yield await generate_sse_data(job_id, "error", {
                            "status": "failed",
                            "message": task_data.get("error_message", "Generation failed"),
                            "progress": task_data.get("progress", 0)
                        })
                        break
                    else:
                        # For processing updates
                        yield await generate_sse_data(job_id, "progress", {
                            "status": task_data.get("status", "processing"),
                            "progress": task_data.get("progress", 0),
                            "message": task_data.get("message", "Processing...")
                        })

                except json.JSONDecodeError:
                    # Skip malformed messages
                    continue

    except Exception as e:
        # Send error message if something goes wrong
        yield await generate_sse_data(job_id, "error", {
            "status": "error",
            "message": f"Stream error: {str(e)}"
        })
    finally:
        # Clean up Redis connection
        await pubsub.close()
        await redis_client.close()


@router.get(
    "/workspaces/{workspace_id}/stream/{task_id}",
    tags=["images"],
    summary="Stream real-time updates for image generation task"
)
async def stream_job_status(
    workspace_id: UUID,
    task_id: UUID,
    current_user = Depends(get_current_user),
    member = Depends(get_current_workspace_member),
    db: AsyncSession = Depends(get_db)
) -> StreamingResponse:
    """
    Stream real-time updates for an image generation task using Server-Sent Events.

    Args:
        workspace_id: The workspace ID
        task_id: The task ID to stream updates for
        current_user: Current authenticated user
        member: Current workspace member
        db: Database session

    Returns:
        StreamingResponse with SSE data

    Raises:
        HTTPException: If job not found or access denied
    """

    # Verify the job exists and belongs to the workspace
    stmt = (
        select(ImageGenerationJob)
        .where(
            ImageGenerationJob.task_id == task_id,
            ImageGenerationJob.workspace_id == workspace_id
        )
    )
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or access denied"
        )

    # Create SSE response
    async def event_stream():
        async for data in listen_to_redis_updates(str(task_id)):
            yield data

        # Send final close event
        yield await generate_sse_data(str(task_id), "close", {
            "status": "closed",
            "message": "Stream closed"
        })

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )