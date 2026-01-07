#!/usr/bin/env python3
"""Get video project ID from task ID."""
import asyncio
import sys
sys.path.insert(0, '/Users/ZenoWang/Documents/project/E_Business/backend')

from sqlalchemy import select
from app.models.video import VideoProject
from app.db.base import async_session_maker

PRODUCT_ID = "886734d7-66a7-49ea-b907-71b9002adf33"

async def get_project():
    async with async_session_maker() as db:
        # Find project by product_id
        result = await db.execute(
            select(VideoProject).where(
                VideoProject.product_id == PRODUCT_ID
            ).order_by(VideoProject.created_at.desc())
        )
        project = result.scalar_one_or_none()

        if project:
            print(f"Project ID: {project.id}")
            print(f"Status: {project.status}")
            print(f"Product ID: {project.product_id}")
            print(f"Mode: {project.mode}")
        else:
            print("No project found for this product")

if __name__ == "__main__":
    asyncio.run(get_project())
