#!/usr/bin/env python3
"""Test complete Video Generation workflow via API."""
import sys
import time
sys.path.insert(0, '/Users/ZenoWang/Documents/project/E_Business/backend')

import requests

USER_EMAIL = "apitest2@ebusiness.com"
USER_PASSWORD = "testpass123"
WORKSPACE_ID = "79fdeca4-b744-4f95-8682-83ca4460e67f"
PRODUCT_ID = "886734d7-66a7-49ea-b907-71b9002adf33"

API_BASE = "http://localhost:8000/api/v1"

def test_video_workflow():
    """Test complete video generation workflow."""
    # 1. Login
    print("=" * 60)
    print("Step 1: Login")
    print("=" * 60)
    login_response = requests.post(
        f'{API_BASE}/auth/login',
        json={'email': USER_EMAIL, 'password': USER_PASSWORD}
    )

    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(login_response.text)
        return

    token_data = login_response.json()
    token = token_data.get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    print(f"✅ Login successful")
    print(f"Token: {token[:50]}...")

    # 2. Generate script
    print("\n" + "=" * 60)
    print("Step 2: Generate Video Script")
    print("=" * 60)
    script_response = requests.post(
        f'{API_BASE}/video/generate/script?workspace_id={WORKSPACE_ID}',
        headers=headers,
        json={
            'product_id': PRODUCT_ID,
            'mode': 'creative_ad',
            'target_duration': 30
        }
    )

    if script_response.status_code not in [200, 202]:
        print(f"❌ Script generation failed: {script_response.status_code}")
        print(script_response.text)
        return

    script_data = script_response.json()
    task_id = script_data.get('task_id')
    print(f"✅ Script generation started")
    print(f"Task ID: {task_id}")

    # Import for database query
    import asyncio
    from sqlalchemy import select
    from app.models.video import VideoProject, VideoGenerationJob
    from app.db.base import async_session_maker

    # Wait for script generation to complete
    print("\nWaiting for script generation...")
    project_id = None
    for i in range(15):
        time.sleep(2)
        status_response = requests.get(
            f'{API_BASE}/video/jobs/{task_id}?workspace_id={WORKSPACE_ID}',
            headers=headers
        )
        status_data = status_response.json()
        print(f"  [{i*2}s] Status: {status_data.get('status')}, Progress: {status_data.get('progress')}%")

        if status_data.get('status') == 'completed':
            print("✅ Script generation completed!")

            # Query database for project_id
            async def get_project_id():
                async with async_session_maker() as db:
                    from sqlalchemy import func
                    result = await db.execute(
                        select(VideoProject).where(
                            VideoProject.workspace_id == WORKSPACE_ID,
                            VideoProject.product_id == PRODUCT_ID
                        ).order_by(VideoProject.created_at.desc()).limit(1)
                    )
                    project = result.scalar_one_or_none()
                    return str(project.id) if project else None

            project_id = asyncio.run(get_project_id())
            print(f"Project ID: {project_id}")
            break
        elif status_data.get('status') == 'failed':
            print(f"❌ Script generation failed: {status_data.get('error_message')}")
            return

    if not project_id:
        print("❌ No project_id found")
        return

    # 3. Trigger render
    print("\n" + "=" * 60)
    print("Step 3: Trigger Video Render")
    print("=" * 60)
    render_response = requests.post(
        f'{API_BASE}/video/workspaces/{WORKSPACE_ID}/render/{project_id}',
        headers=headers,
        json={}  # RenderRequest is empty but body is required
    )

    if render_response.status_code not in [200, 202]:
        print(f"❌ Render trigger failed: {render_response.status_code}")
        print(render_response.text)
        return

    render_data = render_response.json()
    render_job_id = render_data.get('job_id')
    print(f"✅ Render triggered successfully")
    print(f"Render Job ID: {render_job_id}")

    # 4. Monitor render progress
    print("\n" + "=" * 60)
    print("Step 4: Monitor Render Progress")
    print("=" * 60)
    for i in range(30):
        time.sleep(2)
        status_response = requests.get(
            f'{API_BASE}/video/workspaces/{WORKSPACE_ID}/render/jobs/{render_job_id}',
            headers=headers
        )

        if status_response.status_code == 200:
            status_data = status_response.json()
            print(f"  [{i*2}s] Status: {status_data.get('status')}, Progress: {status_data.get('progress')}%")

            if status_data.get('status') == 'completed':
                print("\n✅ Video generation COMPLETED!")
                print(f"Results: {status_data.get('raw_results')}")
                break
            elif status_data.get('status') == 'failed':
                print(f"\n❌ Video generation FAILED: {status_data.get('error_message')}")
                break
        elif status_response.status_code == 401:
            # Token expired, get new token
            print("  Token expired, refreshing...")
            login_response = requests.post(
                f'{API_BASE}/auth/login',
                json={'email': USER_EMAIL, 'password': USER_PASSWORD}
            )
            token = login_response.json().get('access_token')
            headers = {'Authorization': f'Bearer {token}'}
        else:
            print(f"  [{i*2}s] Error checking status: {status_response.status_code}")

    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print("✅ Complete video generation workflow test finished!")

if __name__ == "__main__":
    test_video_workflow()
