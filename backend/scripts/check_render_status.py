#!/usr/bin/env python3
"""Check video render job status."""
import asyncio
import sys
sys.path.insert(0, '/Users/ZenoWang/Documents/project/E_Business/backend')

from sqlalchemy import select
from app.models.video import VideoGenerationJob
from app.db.base import async_session_maker

JOB_ID = "8606327d-1cae-418e-bf1d-b82f90ed9cc8"

async def check_status():
    async with async_session_maker() as db:
        result = await db.execute(
            select(VideoGenerationJob).where(
                VideoGenerationJob.id == JOB_ID
            )
        )
        job = result.scalar_one_or_none()

        if job:
            print(f"Job ID: {job.id}")
            print(f"Status: {job.status}")
            print(f"Progress: {job.progress or 0}%")
            print(f"Raw Results: {job.raw_results}")
            print(f"Error: {job.error_message}")
        else:
            print("No job found with this ID")

if __name__ == "__main__":
    asyncio.run(check_status())
