# Story 2.2: AI Generation Worker (Celery/Redis)

Status: done

## Story

As a **Developer**,
I want a **robust asynchronous worker to handle image generation**,
so that **the user interface doesn't freeze during long-running AI tasks and can receive real-time progress updates**.

## Acceptance Criteria

### 1. Celery Worker Configuration
**Given** The backend application is starting
**When** The Celery worker process is launched
**Then** It should connect successfully to the Redis broker
**And** It should register the defined image generation tasks
**And** It should be configured with `soft_time_limit=300` and `time_limit=330`
**And** It should support `AI_MOCK_MODE=true` env var to switch between Real/Mock execution
**And** It should handle transient failures automatically with `autoretry_for` and exponential `retry_backoff` strategies

### 2. Task Processing (Image Generation)
**Given** A `generate_images_task` is submitted to the Redis queue
**When** The Celery worker picks up the task
**Then** It should create a traceable context (log `job_id` and `task_id` in every log line)
**And** If `AI_MOCK_MODE` is true, it should execute simulation logic (sleep + stub response) without hitting external APIs
**And** If `AI_MOCK_MODE` is false, it should call the real `ImageService`
**And** It should handle `SoftTimeLimitExceeded` gracefully by marking the job as FAILED before the hard kill

### 3. Real-time Status Updates (Redis -> SSE Bridge)
**Given** The task is running
**When** The worker makes progress (e.g., "Starting", "Processing", "Rendering")
**Then** It should publish a JSON message to Redis channel `task_updates:{task_id}`
**And** The JSON structure MUST match frontend SSE expectations: `{ "status": "processing", "progress": 50, "message": "Rendering..." }`
**And** It should also update the permanent task state in Celery backend
**And** The status updates MUST strictly adhere to the Enum: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`

### 4. Task Completion & Persistence
**Given** The generation task completes successfully
**When** The worker finishes execution
**Then** It should save the result URLs to the `images` table using a robust DB session strategy (Context Manager)
**And** It should update the `generation_jobs` record status to `COMPLETED`
**And** It should trigger a final "Completed" event to Redis

### 5. Error Handling
**Given** The AI generation fails (API error or Timeout)
**When** An exception occurs in the worker
**Then** The worker should catch specific exceptions (including `SoftTimeLimitExceeded`)
**And** It should update the `generation_jobs` record status to `FAILED`
**And** It should save the structured error details
**And** It should publish a "Failed" event to Redis so the UI stops spinning

## Tasks / Subtasks

- [x] **1. Infrastructure & Core Helpers**
  - [x] Update `backend/app/core/celery_app.py`: Set timeouts and broker config
  - [x] Implement `backend/app/db/session.py`: Add `get_db_context()` context manager for safe Celery session handling
  - [x] Configure `backend/app/core/logger.py`: Ensure structured logging (JSON) is enabled for worker

- [x] **2. Database & Models**
  - [x] Ensure `GenerationJob` model has `status`, `result`, `error` fields
  - [x] Enforce Status Enum in model: `class JobStatus(str, Enum): PENDING, PROCESSING, COMPLETED, FAILED`
  - [x] Ensure `Image` model exists for storing results

- [x] **3. Service Layer Implementation**
  - [x] Enhance `backend/app/services/image_service.py`
    - [x] Implement `process_generation(job_id: str, params: dict)`
    - [x] Add `if settings.AI_MOCK_MODE` logic check
    - [x] Implement Simulation Logic (Stub)

- [x] **4. Celery Task Definition**
  - [x] Enhance `backend/app/tasks/image_generation.py`
    - [x] Define `generate_images_task` with `@celery_app.task(bind=True, autoretry_for=(Exception,), retry_backoff=True)`
    - [x] Implement `try/except SoftTimeLimitExceeded` block
    - [x] Implement Redis Publishing: `redis.publish(f"task_updates:{task_id}", json.dumps(...))`

- [x] **5. Docker Integration**
  - [x] Verify `docker-compose.yml` includes the worker service definition
  - [x] Ensure `AI_MOCK_MODE` is mapped in environment variables

- [x] **6. Testing**
  - [x] Create comprehensive test suites
    - [x] Test Mock Mode execution success
    - [x] Test Exception handling (Mock failure)
    - [x] Unit tests (test_celery_tasks.py, test_image_service.py)
    - [x] Integration tests (test_worker_flow.py)
    - [x] Performance tests (test_worker_performance.py)

## Dev Notes

### Architecture Patterns (MANDATORY)
- **Safe DB Sessions**: NEVER use global sessions in Celery. Use a context manager pattern:
  ```python
  @contextlib.contextmanager
  def get_db_context():
      db = SessionLocal()
      try: yield db
      finally: db.close()
  ```
- **Redis vs SSE**: The worker publishes to Redis. The API layer (FastAPI) will have an SSE endpoint that subscribes to this Redis channel. This story handles the **Publishing** side. Ensure the channel name format is consistent (`task_updates:{task_id}`).
- **Mock Mode**: This is critical for saving money and dev speed. Default it to locally, require explicit override for Prod.

### Technical Specifics
- **Timeouts**: `soft_time_limit=300`, `time_limit=330`
- **Logging**: Use `structlog` or standard logging with extra dicts for JSON output if possible, otherwise consistent string format.

### References
- [Architecture: AI Task & Communication](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md#ai-task--communication)
- [Celery Time Limits](https://docs.celeryq.dev/en/stable/userguide/workers.html#time-limits)

## Dev Agent Record

### Context Reference
- **Key Files**: `docs/epics.md`, `docs/architecture.md`, `docs/sprint-artifacts/2-1-style-selection-generation-trigger.md`
- **Previous Story**: Story 2.1 defined the trigger; this story implements the processor.

### Agent Model Used
- Antigravity (Google Deepmind)
- Configured by: Validation Agent (Quality Review)

### Code Review Record (2025-12-15)

**Issues Found & Fixed:**
| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| C1 | Critical | `test_worker_performance.py` missing `ImageGenerationJob` import | Added import |
| M1 | Medium | `psycopg2` missing for tests | Added to `pyproject.toml` |
| M2 | Medium | `_publish_status` creates new Redis client each call | Added `_get_redis_client()` singleton |
| M3 | Medium | Worker only consumes `image_generation` queue | Added `default` queue |
| L1 | Low | Tests use non-existent `params` attribute | Changed to `_test_params` |
| L2 | Low | Hardcoded Redis URL in tests | Uses `settings.redis_url` |

**Pre-existing Issues Fixed:**
- Added missing model imports to `models/__init__.py`
- Added `products`, `image_generation_jobs` relationships to `Workspace`
- Added `image_generation_jobs` relationship to `User`
- Added `products` relationship to `Asset`

**Test Results:** 15/15 unit tests passing
