# Story 4.3: Video Rendering Engine

Status: ready-for-dev

## Story

**As a** System,
**I want** to render the final MP4 video file from the generated script and storyboard,
**So that** the user has a deliverable asset to download and share.

## Acceptance Criteria

### AC1: Video Rendering Service
**Given** A `VideoProject` with a complete `script` and `storyboard`
**When** The `render_video` task is triggered
**Then** It should call the external Video Generation API (e.g., RunwayML, Pika, or custom API endpoint)
**And** It should pass the storyboard, script, and assets to the API for video composition
**And** It should handle API-specific parameters for transitions and effects
**And** It should download and store the generated MP4 file from the API response

### AC2: Audio Composition
**Given** A rendering task
**When** Processing audio
**Then** It should call the external TTS API (e.g., OpenAI TTS, ElevenLabs, or Azure Speech) for voice generation
**And** The video generation API will handle audio mixing (voiceover + background music) automatically
**And** It should pass audio preferences (ducking, volume levels) to the video API
**And** The API will ensure audio-visual synchronization

### AC3: Asynchronous Rendering & Progress
**Given** The rendering process is computationally intensive
**When** The render is running
**Then** It must run in a Celery worker to avoid blocking the API
**And** It should publish granular progress updates to Redis (e.g., "Rendering scene 1/5...", "Encoding...")
**And** It should handle timeouts gracefully (rendering can take minutes)

### AC4: Output Management
**Given** The render is complete
**When** The file is ready
**Then** The MP4 file should be uploaded to MinIO storage
**And** The public/presigned URL should be saved to the `VideoProject` record
**And** The project status should update to `COMPLETED`
**And** The user should receive a notification (via the existing progress socket)

### AC5: Error Handling
**Given** A rendering failure (e.g., asset missing, ffmpeg error)
**When** The worker catches the exception
**Then** It should log the detailed error
**And** It should update the job status to `FAILED` with a user-friendly error message
**And** It should clean up any temporary files created during the process

## Tasks / Subtasks

- [ ] **1. Dependencies & Configuration**
  - [ ] Add API client libraries to `backend/pyproject.toml`:
    - [ ] `httpx>=0.25.0` (async HTTP client for API calls)
    - [ ] `openai>=1.3.0` (for OpenAI TTS API if used)
  - [ ] Configure API endpoints and credentials in `backend/app/core/config.py`
  - [ ] Set up retry policies and rate limiting for API calls

- [ ] **2. Core Rendering Service**
  - [ ] Update `backend/app/services/video_service.py`:
    - [ ] Add `render_video_project(job_id)` method
    - [ ] Implement `_call_video_generation_api(storyboard, script, assets)`
    - [ ] Implement `_handle_api_response_and_download(response)`
    - [ ] Implement `_poll_generation_status(job_id)` for async APIs
    - [ ] Implement `_upload_final_video(file_path)`

- [ ] **3. Mock Rendering Implementation**
  - [ ] Implement `_mock_render_video` for dev mode:
    - [ ] Simulate processing time (5-10s)
    - [ ] Return a static placeholder video URL
    - [ ] Emit realistic progress events
  - [ ] Support multiple mock providers (RunwayML, Pika, Custom API)

- [ ] **4. API Endpoint Integration**
  - [ ] Update `backend/app/api/v1/endpoints/video.py`:
    - [ ] Add `POST /render/{project_id}` endpoint
    - [ ] Integrate with Celery task `render_video_task`

- [ ] **5. Testing & Validation**
  - [ ] Unit Tests (`backend/app/tests/services/test_video_render.py`):
    - [ ] Test mock rendering flow
    - [ ] Test error handling for missing assets
    - [ ] Test progress emission sequence
  - [ ] Integration Tests:
    - [ ] Verify full flow from render request to DB update

## Dev Notes

### Technical Implementation Guide

#### Rendering Pipeline (API-based)
1.  **Preparation**: Collect storyboard URLs, script text, and asset metadata.
2.  **API Request**: Format and send request to video generation API:
    - storyboard scenes with timing
    - script segments for TTS
    - asset URLs (images, background music)
    - style and transition preferences
3.  **Async Polling**: If API is async, poll status endpoint every 5 seconds.
4.  **Download**: When complete, download the generated MP4 file.
5.  **Upload**: Upload to MinIO and update database.

#### API Provider Pattern
```python
class VideoProvider(ABC):
    @abstractmethod
    async def generate_video(self, request: VideoRequest) -> str:
        """Generate video and return download URL"""
        pass

class RunwayMLProvider(VideoProvider):
    """RunwayML API implementation"""

class PikaProvider(VideoProvider):
    """Pika Labs API implementation"""

class CustomAPIProvider(VideoProvider):
    """Custom or self-hosted API implementation"""
```

#### API Provider Configuration
```python
# config.py
VIDEO_GENERATION_PROVIDER = os.getenv("VIDEO_PROVIDER", "mock")  # runway, pika, custom
RUNWAYML_API_KEY = os.getenv("RUNWAYML_API_KEY")
PIKA_API_KEY = os.getenv("PIKA_API_KEY")
CUSTOM_VIDEO_API_URL = os.getenv("CUSTOM_VIDEO_API_URL")

# Rate limiting and timeout settings
API_REQUEST_TIMEOUT = 300  # 5 minutes
API_RETRY_ATTEMPTS = 3
API_RETRY_DELAY = 5  # seconds
```

#### TTS API Integration
*   **Primary**: OpenAI TTS API - High quality, cost-effective
*   **Alternative**: ElevenLabs API - Premium voice quality
*   **Design**: Pass script directly to video API, let it handle TTS

#### Example API Request Format
```json
{
  "storyboard": [
    {
      "scene_index": 1,
      "image_url": "https://storage.com/scene1.jpg",
      "duration": 3.0,
      "transition": "fade"
    }
  ],
  "script": [
    {
      "text": "Welcome to our product",
      "voice": "nova",
      "duration": 3.0
    }
  ],
  "background_music": {
    "url": "https://storage.com/music.mp3",
    "volume": 0.3,
    "duck_during_voice": true
  },
  "output": {
    "resolution": "1080p",
    "format": "mp4",
    "fps": 30
  }
}
```

### Architecture Compliance
- **Async**: Video rendering is the most CPU intensive task. strictly enforce Celery execution.
- **Storage**: Never store video files on the container. Always upload to MinIO.

### Performance & Monitoring
- **API Response Time**: Track latency for video generation API calls
- **Progress Polling**: Implement efficient polling with exponential backoff
- **Queue Management**: Monitor Celery queue length and processing time
- **Cost Tracking**: Log API usage and costs for different providers
- **Rate Limiting**: Implement per-provider rate limiting to avoid quotas
- **Health Checks**: `/health/video` endpoint to monitor API provider status

### Error Handling & Recovery
- **API Failures**: Handle 429 (rate limit), 503 (service unavailable) gracefully
- **Timeout Management**: Configurable timeouts for API calls (default 5 minutes)
- **Fallback Providers**: Support multiple video providers for redundancy
- **Retry Logic**: Implement jittered retries for transient failures
- **Partial Failures**: Handle cases where API returns but video is corrupted
- **Cost Controls**: Set daily/monthly limits to prevent runaway costs

### References
- [Architecture: AI Task & Communication](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md#ai-task--communication)
- [Epic 4 Requirements](file:///Users/ZenoWang/Documents/project/E_Business/docs/epics.md#epic-4-multimedia---ai-video-studio)

## Dev Agent Record

### Context Reference
- **Analysis**: Story 4.3 focuses on the "Assembly" phase of the video pipeline.
- **Dependencies**: Requires the `script` and `storyboard` from Story 4.2.

### Validation Results
- [x] Story validation completed (B+ grade, 75% ready)
- [x] Identified critical issue: Local rendering not suitable for API-based architecture
- [x] Redesigned for external API integration
- [x] Updated technical stack to API providers + HTTP client
- [x] Added multi-provider support and fallback strategies

### Completion Notes List
- [x] Updated dependencies (httpx, openai)
- [x] Implemented API provider pattern for flexibility
- [x] Added configuration for multiple video APIs
- [x] Documented API request/response formats
- [x] Added cost tracking and rate limiting
- [ ] API provider integration completed
- [ ] Testing with actual video APIs
- [ ] Cost analysis and budget planning
