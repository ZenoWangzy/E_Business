# Story 4.2: Script & Storyboard AI Service

Status: ready-for-dev

## Story

**As a** Developer,
**I want** the system to automatically generate a video script and storyboard from product context,
**So that** the video has a coherent narrative structure and visual plan before rendering.

## Acceptance Criteria

### AC1: AI Generation Service Structure
**Given** A `VideoService` class is initialized
**When** The `generate_script_and_storyboard` method is called with a `video_project_id`
**Then** It should retrieve the `VideoProject` and associated `Product` context (name, description, selling points)
**And** It should support both `mock` and `real` execution modes based on `settings.AI_MOCK_MODE`
**And** It should handle errors gracefully using custom exceptions (`VideoGenerationError`)

### AC2: Script Generation (Text-to-Speech Prep)
**Given** A generation request for a specific mode ("Creative Ad" or "Functional Intro")
**When** The AI generates the script
**Then** The output should be a structured list of dialogue/narration segments
**And** The total estimated duration of the spoken text must match the target duration (15s or 30s)
**And** The tone of the script must match the selected mode (e.g., "Energetic" for Ad, "Professional" for Intro)
**And** The script should be saved to the database associated with the video project

### AC3: Storyboard Generation (Visual Plan)
**Given** The script segments are generated
**When** The AI generates the storyboard
**Then** It should produce a corresponding list of visual scenes for each script segment
**And** Each scene should contain:
  - `scene_index`: Order in sequence
  - `duration`: Duration of this specific scene
  - `visual_prompt`: Description of what should be shown (for image gen or asset selection)
  - `transition`: Recommended transition type (e.g., "fade", "cut")
**And** The sum of scene durations must equal the total video duration

### AC4: Asynchronous Processing & Progress
**Given** The generation task is running
**When** Detailed steps are executed (e.g., "Generating script...", "Planning scenes...")
**Then** The service should publish real-time progress updates to Redis
**And** The frontend should receive these updates via the existing SSE/WebSocket mechanism
**And** progress should go from 0% to 100% upon completion

### AC5: Data Persistence
**Given** The generation is successful
**When** The process completes
**Then** The structured `script` and `storyboard` JSON data should be stored in the `VideoProject` table (or related tables)
**And** The project status should actomatically update to `SCRIPT_READY`
**And** Critical metadata (model used, token usage) should be logged for usage tracking

## Tasks / Subtasks

- [ ] **1. Database Schema & Models**
  - [ ] Update `backend/app/models/video.py`:
    - [ ] Add `VideoProject` model (if not exists) with fields: `script` (JSON), `storyboard` (JSON), `status` (Enum)
    - [ ] Add `VideoGenerationJob` (consistent with `ImageGenerationJob`) for tracking async tasks
  - [ ] Create Pydantic schemas in `backend/app/schemas/video.py`:
    - [ ] `ScriptSegment` (text, duration)
    - [ ] `StoryboardScene` (visual_description, transition)
    - [ ] `VideoProjectUpdate`
  - [ ] Generate and apply Alembic migration

- [ ] **2. Core Service Implementation**
  - [ ] Create/Update `backend/app/services/video_service.py`:
    - [ ] Implement `VideoService` class
    - [ ] Add `process_script_generation(job_id, params)` method
    - [ ] Implement `_generate_mock_script_and_storyboard` for testing
    - [ ] Implement `_generate_real_script_and_storyboard` using LLM (e.g., OpenAI)
    - [ ] Implement `_save_generation_result` and `_publish_progress`
  - [ ] Ensure Redis integration matches `ImageService` pattern

- [ ] **3. LLM Prompt Engineering**
  - [ ] Create prompt templates in `backend/app/core/prompts/video.py`:
    - [ ] `CREATIVE_AD_PROMPT`: Optimized for high-energy, persuasive copy
    - [ ] `FUNCTIONAL_INTRO_PROMPT`: Optimized for clear, informative explanation
  - [ ] Ensure prompts strictly enforce JSON output format for parsing reliability

- [ ] **4. API Endpoint Integration**
  - [ ] Update `backend/app/api/v1/endpoints/video.py`:
    - [ ] Add `POST /generate/script` endpoint
    - [ ] Integrate with `Celery` worker to offload task
    - [ ] Return `task_id` for polling/subscription

- [ ] **5. Testing & Validation**
  - [ ] Unit Tests (`backend/app/tests/services/test_video_service.py`):
    - [ ] Test mock generation flow
    - [ ] Test error handling and status updates
    - [ ] Test JSON parsing robustness
  - [ ] Integration Tests:
    - [ ] Verify database persistence of complex JSON structures
    - [ ] Verify Redis progress publication

## Dev Notes

### Technical Implementation Guide

#### Service Pattern (Consistent with ImageService)
```python
# backend/app/services/video_service.py

class VideoService:
    def process_script_generation(self, job_id: str, params: Dict) -> Dict:
        # 1. Fetch Job & Context
        # 2. Update Status -> Processing
        # 3. Generate (Mock or Real)
        # 4. Save to DB
        # 5. Publish Completion
        pass
```

#### JSON Output Structure (Strict enforcement required)
The LLM must return strict JSON to ensure the UI can render the storyboard editor.
```json
{
  "script": [
    { "text": "Welcome to the future of...", "duration": 3.0 },
    { "text": "Note how the sleek design...", "duration": 4.0 }
  ],
  "storyboard": [
    { "scene_index": 1, "visual_prompt": "Close up of product X", "transition": "fade" },
    { "scene_index": 2, "visual_prompt": "Product X in lifestyle setting", "transition": "cut" }
  ]
}
```

#### Dependency Guardrails
- **Libraries**: Use `openai` (latest stable) for LLM calls if not using a standardized wrapper.
- **Async**: Ensure all DB operations within the async worker use the synchronous `Session` or properly handle async context if using `asyncio` loop in Celery (standard Celery is sync, so use sync `Session`).
- **Error Handling**: Catch `json.JSONDecodeError` specifically for LLM output parsing failures and implement a retry logic or fallback.
- **Celery Task Configuration**: Set `soft_time_limit=600` and `time_limit=660` for video generation tasks (longer than image generation due to complexity).
- **Concurrency**: Limit concurrent video generation tasks to prevent system overload (configure in Celery worker settings).

#### Previous Story Intelligence (from ImageService)
- **Redis Pub/Sub**: Reuse the existing `redis_client` from `app.core.config`. Do not create a new connection pool manually.
- **Job Tracking**: Use the standard `JobStatus` Enum (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`).
- **Mock Mode**: Crucial for frontend development. `settings.AI_MOCK_MODE` must be respected.

### Architecture Compliance
- **Backend**: Python `snake_case` strictly.
- **DB**: Use `JSON` type for `script` and `storyboard` columns in Postgres (SQLAlchemy `JSON`).
- **Logging**: Use `app.core.logger` for consistent log format.

### Performance & Monitoring
- **Large Data Handling**: Consider streaming video metadata processing to manage memory usage efficiently.
- **Monitoring Metrics**: Track video generation duration, success rate, token usage, and system resource utilization.
- **Health Checks**: Implement `/health/video` endpoint to monitor video service availability and performance.
- **Scaling Strategy**: Design for horizontal scaling by ensuring stateless service instances and using Redis for coordination.

### References
- [Architecture: AI Task & Communication](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md#ai-task--communication)
- [Service Pattern: ImageService](file:///Users/ZenoWang/Documents/project/E_Business/backend/app/services/image_service.py)
- [Epic 4 Requirements](file:///Users/ZenoWang/Documents/project/E_Business/docs/epics.md#epic-4-multimedia---ai-video-studio)

## Dev Agent Record

### Context Reference
- **Analysis**: Analyzed `ImageService` pattern to ensure consistency in async task handling and Redis communication.
- **Pattern**: Reused `JobStatus`, `logging`, and `Mock/Real` toggle patterns.

### Completion Notes List
- [x] Story validation completed (A- grade, 95% ready)
- [x] Performance optimization guidance added
- [x] Monitoring and scaling considerations documented
- [ ] Database migration created and applied
- [ ] Service implementation with 100% test coverage for mock mode
- [ ] API endpoint callable and returning task_id
- [ ] Redis progress updates verified
- [ ] Performance testing completed
- [ ] Monitoring dashboards configured
