# Story 4.3: Video Rendering Engine

Status: Done 

## Story

**As a** System,
**I want** to render the final MP4 video file from the generated script and storyboard,
**So that** the user has a deliverable asset to download and share.

## Acceptance Criteria

### AC1: Video Rendering Service
**Given** a `VideoProject` with a complete `script` and `storyboard`
**When** the render task is triggered
**Then** the service delegates to the configured provider (mock/runway/pika/custom) via a provider pattern
**And** persists minimal results to the job record (URLs, provider metadata)

### AC2: Audio Composition
Audio再合成属于 Story 4.4（TTS/音轨再生成）。本故事仅要求将已有脚本/分镜合成为视频；TTS 再生将在 4.4 完成。

### AC3: Asynchronous Rendering & Progress
**Given** rendering is heavy
**When** the render is running
**Then** it runs in Celery and publishes progress to Redis channel `task_updates:{task_id}` with payload `{status, progress, message, timestamp}`
**And** handles timeouts和异常并记录结构化日志。

### AC4: Output Management（当前 Mock 阶段）
Mock Provider 返回占位 MP4 URL；真实上传到 MinIO 与持久化 `Video` 记录将在 4.4 收尾。

### AC5: Error Handling
失败时更新 `VideoGenerationJob.status=FAILED`，填写 `error_message`，并通过 Redis 推送失败消息。

## 已实现（对齐代码）
- Provider 模式与服务编排
  - `app/services/video_service.py`
    - `VideoRenderService.process_render(job_id)`：加载 Job/Project，发布进度，选择 Provider，落库结果。
    - `MockVideoProvider.render(...)`：模拟 5–10s 阶段化进度（10/30/60/90/100），返回占位 URL。
  - 进度发布：Redis channel `task_updates:{task_id}`，payload: `{status, progress, message, timestamp}`。
- Celery 任务
  - `app/tasks/video_tasks.py:render_video_task(job_id)`：创建异步会话调用 `VideoRenderService`。
  - 同文件修正了异步调用与日志记录（避免 coroutine 未执行、日志签名错误）。
- API 与 Schemas
  - `POST /api/v1/video/workspaces/{workspace_id}/render/{project_id}` → `RenderTaskCreatedResponse{job_id, task_id, status}`
  - `GET  /api/v1/video/workspaces/{workspace_id}/render/jobs/{job_id}` → `RenderJobStatusResponse{status, progress, video_urls, ...}`
  - 模型/模式：`app/models/video.py`、`app/schemas/video.py`
- 配置（`app/core/config.py`）
  - `video_generation_provider`, `runwayml_api_key`, `pika_api_key`, `custom_video_api_url`
  - `video_api_request_timeout`, `video_api_retry_attempts`, `video_api_retry_delay`
- 测试（已补最小用例）
  - 单元：`test_video_render_service.py`（Mock Provider 完成态与进度）、`test_video_render_api.py`（触发/查询接口）
  - E2E smoke（可选，需 Redis+DB）：`test_video_render_e2e.py`，默认跳过，设置 `E2E_SMOKE=1` 启用。

## 端到端调用示例（Mock）
- 触发渲染
```bash
curl -X POST \
  "http://localhost:8000/api/v1/video/workspaces/{workspace_id}/render/{project_id}" \
  -H "Content-Type: application/json" \
  -d '{}'
# 202 Accepted → {"job_id":"...","task_id":"...","status":"processing"}
```
- 轮询状态
```bash
curl "http://localhost:8000/api/v1/video/workspaces/{workspace_id}/render/jobs/{job_id}"
# 200 OK → {"status":"completed","progress":100,"video_urls":["https://example.com/mock-videos/{task_id}.mp4"], ...}
```
- Redis 进度（发布示例）
```json
{
  "status": "processing",
  "progress": 60,
  "message": "Rendering frames (mock)",
  "timestamp": "2025-12-18T10:00:00Z"
}
```

## 数据模型（摘要）
- `VideoProject`：`mode`, `target_duration`, `script`, `storyboard`, `status ∈ {pending, processing, script_ready, completed, failed}`
- `VideoGenerationJob`：`status ∈ JobStatus{pending, processing, completed, failed}`, `progress`, `raw_results[ {status, video_urls[], extra} ]`
- `Video`/`VideoAudioTrack`：为 4.4 预留（下载/音轨再生）。

## 待办与下一步
- [x] 任务1：依赖与配置（httpx、config 键）
- [x] 任务2：核心服务（Provider 模式与编排、进度发布）
- [x] 任务3：Mock 渲染实现（阶段化进度 + 占位 URL）
- [x] 任务4：API 接口 + Celery 任务接线（POST/GET 路由、`render_video_task` 调用）
- [x] 任务4收尾：E2E 冒烟（Redis+DB）与最小单测覆盖面扩展
- [x] 文档：补完整错误码与返回示例（见下）
- [ ] Provider 扩展：Runway/Pika/Custom 实装与 MinIO 上传入库（可选，后续 Epic）

## 错误码与返回结构（草案）
- 202 Accepted：渲染任务入队成功（`RenderTaskCreatedResponse`）
- 200 OK：查询任务成功（`RenderJobStatusResponse`）
- 400 Bad Request：如视频 URL 尚不可用（下载接口）；或无效参数
- 401 Unauthorized：未认证
- 404 Not Found：工程/任务不在工作空间或不存在
- 500 Internal Server Error：任务入队/执行异常（`detail` 含错误消息）

## 本地验证步骤（Mock）
1) 启动依赖（Repo 根目录）：`docker compose up -d`
2) 启动服务（backend/）：
   - API：`uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`
   - Celery Worker：`celery -A app.core.celery_app.celery_app worker -l info`
3) 按上面 cURL 触发与轮询；观察 Worker 日志与 Redis 渠道消息。
4) 可选：执行最小单测与 E2E 冒烟（需环境就绪）。

## 参考与对齐
- 设计与提示词：`app/core/prompts/video.py`
- 服务实现：`app/services/video_service.py`
- 任务：`app/tasks/video_tasks.py`
- API：`app/api/v1/endpoints/video.py`
- 配置：`app/core/config.py`
- 模型：`app/models/video.py`

## Senior Developer Review (AI)

**Reviewer**: Amelia (Dev Agent)
**Date**: 2025-12-18
**Outcome**: ✅ Approved with Minor Fixes

### 1. Acceptance Criteria Verification
- **AC1: Video Rendering Service** - ✅ Implemented (`VideoRenderService` wraps Provider pattern correctly).
- **AC2: Audio Composition** - ✅ Deferred to Story 4.4 as planned.
- **AC3: Asynchronous Rendering** - ✅ Implemented (Celery `render_video_task` + Redis pub/sub).
- **AC4: Output Management (Mock)** - ✅ Implemented (`MockVideoProvider` simulates progress and returns placeholder URL).
- **AC5: Error Handling** - ✅ Implemented (Try/catch blocks in service and task, status updates to FAILED).

### 2. Code Quality & Architecture
- **Structure**: Follows `Service -> Provider` pattern well. Clean separation of concerns.
- **Router**: ✅ Registered in `app/main.py`.
- **Tests**: ✅ 8/8 tests passed (Unit + API). Coverage includes mock provider flow and dependency overrides.

### 3. Issues Found
**LOW Severity**:
- `datetime.utcnow()` is deprecated. Found usage in:
  - `app/core/logger.py`
  - `app/services/image_service.py` (and potentially other older services)
  - _Recommendation_: Replace with `datetime.now(timezone.utc)`.

**MEDIUM/HIGH Severity**:
- None found. Core logic is solid.

### 4. Next Steps
- [ ] Fix `datetime.utcnow()` deprecation warnings.
- [ ] Proceed to Story 4.4.
