# Story 1.5: Asset Storage Service (MinIO Integration)

Status: ready-for-dev

## Story

As a System,
I want to securely store uploaded files in object storage with workspace isolation,
So that they can be accessed by AI workers later and serve as the foundation for content generation.

## Acceptance Criteria

### 核心存储功能 (Core Storage Functionality)
1. **Given** A user has selected a file to upload in their workspace
2. **When** The upload action is triggered from the frontend component
3. **Then** The backend should generate a Presigned URL for MinIO upload
4. **And** The frontend should upload the file binary directly to MinIO using the presigned URL
5. **And** The backend should record the file metadata (path, size, type, workspace_id) in the `assets` table
6. **And** The asset should be associated with the current Workspace for multi-tenant isolation

### 文件访问和安全性 (File Access and Security)
7. **Given** An AI worker needs to access an uploaded file
8. **When** The worker requests the file
9. **Then** The system should generate a presigned URL with appropriate expiration
10. **And** The URL should only grant access to files within the worker's authorized workspace
11. **And** All file operations must maintain workspace isolation and prevent cross-tenant data access

### 存储路径组织 (Storage Path Organization)
12. **Given** Multiple workspaces exist in the system
13. **When** Files are uploaded to MinIO
14. **Then** Files should be organized using workspace-scoped paths: `workspaces/{workspace_id}/assets/{asset_id}`
15. **And** Each workspace should have its own logical bucket/folder structure
16. **And** File naming should use UUIDs to prevent conflicts and ensure security

### 错误处理和恢复 (Error Handling and Recovery)
17. **Given** MinIO service is temporarily unavailable
18. **When** Upload attempts occur
19. **Then** The system should:
    - Queue upload requests for retry with exponential backoff
    - Return clear error messages to the user
    - Maintain file state in 'pending_upload' status
    - Log errors with full context for debugging

20. **Given** A file upload fails midway
21. **When** The failure is detected
22. **Then** The system should:
    - Clean up any partial uploads from MinIO
    - Mark the asset record as 'failed' with error details
    - Allow user to retry the upload
    - Implement automatic retry for transient errors

### 性能和可扩展性 (Performance and Scalability)
23. **Given** Large files (up to 50MB) need to be uploaded
24. **When** Upload occurs
25. **Then** The system should support:
    - Multipart upload for files > 5MB
    - Parallel upload streams for multiple files
    - Progress tracking during upload
    - Bandwidth throttling to prevent service overload

### 数据完整性 (Data Integrity)
26. **Given** A file has been successfully uploaded
27. **When** The upload completes
28. **Then** The system must:
    - Verify the uploaded file checksum matches the original
    - Store the checksum in the asset metadata
    - Implement periodic integrity checks for stored files
    - Log any detected corruption for admin review

## Tasks / Subtasks

### Phase 1: MinIO 服务集成和配置
- [ ] **Backend: MinIO 客户端配置** (AC: 1-6)
  - [ ] 安装 `minio` Python SDK: `pip install minio==7.2.0`
  - [ ] 创建 `backend/app/core/storage.py` 配置 MinIO 连接
  - [ ] 配置环境变量: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY
  - [ ] 实现连接池和健康检查机制

- [ ] **Backend: Presigned URL 生成服务** (AC: 1-4)
  - [ ] 创建 `backend/app/services/storage_service.py`
  - [ ] 实现 `generate_upload_url(workspace_id, asset_id, filename)` 方法
  - [ ] 实现 `generate_download_url(workspace_id, asset_id)` 方法
  - [ ] 添加 URL 过期时间配置（默认15分钟）

### Phase 2: 数据模型和 API 端点
- [ ] **Backend: Asset 模型增强**
  - [ ] 扩展 `backend/app/models/asset.py` 添加存储相关字段
  - [ ] 添加字段: `storage_path`, `file_checksum`, `storage_status`
  - [ ] 实现数据库迁移脚本
  - [ ] 添加索引优化查询性能

- [ ] **Backend: 文件上传 API 实现** (AC: 1-6)
  - [ ] 创建 `backend/app/api/v1/endpoints/storage.py`
  - [ ] 实现 `POST /api/v1/workspaces/{workspace_id}/assets/upload/presigned` 端点
  - [ ] 实现 `POST /api/v1/workspaces/{workspace_id}/assets/confirm` 端点
  - [ ] 添加多租户权限验证中间件

- [ ] **Backend: 文件访问 API 实现** (AC: 7-11)
  - [ ] 实现 `GET /api/v1/workspaces/{workspace_id}/assets/{asset_id}/url` 端点
  - [ ] 实现批量获取多个文件 URL 的端点
  - [ ] 添加 AI Worker 专用的访问控制
  - [ ] 实现访问日志记录

### Phase 3: 前端集成和优化
- [ ] **Frontend: MinIO 直接上传集成**
  - [ ] 更新 `frontend/src/lib/api/assets.ts` 添加 presigned URL 上传
  - [ ] 实现 `uploadToMinIO(file, presignedUrl, onProgress)` 函数
  - [ ] 添加上传进度回调和取消功能
  - [ ] 集成到 SmartDropzone 组件

- [ ] **Frontend: 大文件处理优化** (AC: 23-25)
  - [ ] 实现文件分块上传逻辑
  - [ ] 添加并发上传管理（最大3个并发）
  - [ ] 实现断点续传功能
  - [ ] 添加上传暂停/恢复控制

### Phase 4: 错误处理和监控
- [ ] **Backend: 错误处理和重试机制** (AC: 17-22)
  - [ ] 创建 `backend/app/services/upload_queue.py` 管理失败的上传
  - [ ] 实现指数退避重试算法
  - [ ] 添加死信队列处理永久失败
  - [ ] 集成 Sentry 错误追踪

- [ ] **Backend: 数据完整性验证** (AC: 26-28)
  - [ ] 实现文件上传后自动 checksum 验证
  - [ ] 创建定时任务检查存储文件完整性
  - [ ] 实现损坏文件的自动恢复机制
  - [ ] 添加管理员通知机制

### Phase 5: 测试和部署
- [ ] **测试：全面的测试覆盖**
  - [ ] 单元测试：存储服务、API 端点、文件处理
  - [ ] 集成测试：完整的上传流程、权限隔离
  - [ ] 压力测试：并发上传、大文件处理
  - [ ] 故障测试：网络中断、MinIO 不可用

- [ ] **部署和监控**
  - [ ] 配置 MinIO Docker 容器（如果尚未配置）
  - [ ] 设置 MinIO 存储桶策略和生命周期规则
  - [ ] 配置 Prometheus 指标收集
  - [ ] 添加 Grafana 仪表盘监控存储使用情况

## Dev Notes

### 架构要求和约束
- **多租户隔离**：所有存储操作必须按 workspace_id 隔离
- **命名规范**：
  - 前端：camelCase
  - 后端：snake_case（通过 Pydantic 自动转换）
- **存储路径结构**：`workspaces/{workspace_id}/assets/{asset_id}/{filename}`
- **文件大小限制**：
  - 单文件：50MB（支持大文件）
  - 工作空间总存储：根据订阅等级限制
- **URL 过期时间**：上传 URL 1小时，下载 URL 15分钟

### MinIO 配置要求
```python
# backend/app/core/storage.py
from minio import Minio
from minio.error import S3Error
import urllib3

# 禁用 SSL 警告（仅用于开发环境）
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class MinIOClient:
    def __init__(
        self,
        endpoint: str = "localhost:9000",
        access_key: str = "minioadmin",
        secret_key: str = "minioadmin",
        secure: bool = False,
        bucket_name: str = "e-business-assets"
    ):
        self.client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure
        )
        self.bucket_name = bucket_name

        # 确保存储桶存在
        if not self.client.bucket_exists(bucket_name):
            self.client.make_bucket(bucket_name)
```

### API 端点规范
```python
# backend/app/schemas/storage.py
from pydantic import BaseModel
from typing import Optional

class PresignedUploadRequest(BaseModel):
    filename: str
    file_size: int
    content_type: str
    checksum: Optional[str] = None

class PresignedUploadResponse(BaseModel):
    upload_url: str
    asset_id: str
    expires_in: int  # seconds

class AssetConfirmation(BaseModel):
    asset_id: str
    actual_file_size: int
    actual_checksum: str
```

### 前端上传流程
```typescript
// frontend/src/lib/storage/minioUpload.ts
export interface MinioUploadConfig {
  file: File;
  workspaceId: string;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export class MinioUploader {
  async uploadFile(config: MinioUploadConfig): Promise<string> {
    // 1. 获取 presigned URL
    const presignedResponse = await fetch(
      `/api/v1/workspaces/${config.workspaceId}/assets/upload/presigned`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: config.file.name,
          file_size: config.file.size,
          content_type: config.file.type
        })
      }
    );

    const { upload_url, asset_id } = await presignedResponse.json();

    // 2. 直接上传到 MinIO
    await fetch(upload_url, {
      method: 'PUT',
      body: config.file,
      headers: { 'Content-Type': config.file.type },
      signal: config.signal
    });

    // 3. 确认上传完成
    await fetch(
      `/api/v1/workspaces/${config.workspaceId}/assets/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_id,
          actual_file_size: config.file.size
        })
      }
    );

    return asset_id;
  }
}
```

### 工作空间隔离策略
```python
# backend/app/services/storage_service.py
def get_workspace_path(workspace_id: str, asset_id: str, filename: str) -> str:
    """生成工作空间隔离的存储路径"""
    # 使用 UUID 防止路径遍历攻击
    sanitized_filename = secure_filename(filename)
    return f"workspaces/{workspace_id}/assets/{asset_id}/{sanitized_filename}"

def check_workspace_permission(user_id: str, workspace_id: str) -> bool:
    """验证用户是否有工作空间的访问权限"""
    # 实现基于角色的权限检查
    pass
```

### 错误处理最佳实践
```python
# backend/app/services/upload_queue.py
from celery import Celery
from tenacity import retry, stop_after_attempt, wait_exponential

celery_app = Celery('storage_tasks')

@celery_app.task(bind=True, max_retries=3)
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
def retry_failed_upload(self, asset_id: str, file_data: bytes):
    """重试失败的上传"""
    try:
        storage_service.upload_file(asset_id, file_data)
    except Exception as exc:
        # 记录重试次数
        self.request.retries += 1

        # 如果超过最大重试次数，发送到死信队列
        if self.request.retries >= 3:
            dead_letter_queue.send_task(
                'handle_permanent_failure',
                args=[asset_id, str(exc)]
            )
        raise
```

### 性能优化建议
1. **使用 CDN**：在生产环境中配置 CDN 在 MinIO 前端
2. **缓存策略**：对频繁访问的文件实现缓存
3. **压缩**：对文本文件启用 gzip 压缩
4. **生命周期管理**：自动删除过期的临时文件

### 监控指标
- 上传成功率
- 平均上传时间
- 存储空间使用率
- API 响应时间
- 错误率和类型

### 安全考虑
1. **路径遍历防护**：使用 UUID 和路径清理
2. **上传大小限制**：在 API 层和 MinIO 层双重限制
3. **文件类型验证**：使用 MIME 类型和魔数双重验证
4. **访问控制**：基于工作空间的细粒度权限

### 项目结构说明
```
backend/app/
├── core/
│   ├── storage.py              # MinIO 客户端配置
│   └── security.py             # 安全工具（已有）
├── services/
│   ├── storage_service.py      # 存储服务主逻辑
│   └── upload_queue.py         # 上传队列管理
├── models/
│   └── asset.py                # Asset 模型（需要扩展）
├── api/v1/endpoints/
│   └── storage.py              # 存储 API 端点
├── schemas/
│   └── storage.py              # 存储 Pydantic 模型
└── tasks/
    └── storage_tasks.py        # Celery 异步任务

frontend/src/
├── lib/
│   ├── storage/
│   │   ├── minioUpload.ts      # MinIO 上传逻辑
│   │   └── uploadQueue.ts      # 前端队列管理
│   └── api/
│       └── storage.ts          # 存储 API 调用
└── components/
    └── business/
        └── UploadProgress.tsx  # 上传进度组件
```

### References
- [Source: docs/epics.md#Story 1.5] - Original story requirements
- [Source: docs/architecture.md] - MinIO integration patterns
- [Source: docs/ux-design-specification.md] - User experience guidelines
- [MinIO Python SDK docs] - https://docs.min.io/docs/python-client-quickstart-guide.html
- [AWS S3 Presigned URLs] - https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html
- [Previous Story 1.4] - File upload component frontend implementation

## Dev Agent Record

### Context Reference
- **Epic**: [Epic 1 - Workspace Management and File Operations](file:///Users/ZenoWang/Documents/project/E_Business/docs/epics.md#epic-1)
- **Previous Stories**:
  - [1.4 Smart File Upload Component](file:///Users/ZenoWang/Documents/project/E_Business/docs/sprint-artifacts/1-4-smart-file-upload-component-frontend.md) - Frontend upload component
  - [1.3 Workspace Management](file:///Users/ZenoWang/Documents/project/E_Business/docs/sprint-artifacts/1-3-workspace-management-multi-tenancy.md) - Multi-tenancy foundation

### Agent Model Used
Claude Opus 4.5 (model ID: 'claude-opus-4-5-20251101')

### Debug Log References
- No debug logs generated during story creation

### Completion Notes List
- Story created with comprehensive MinIO integration details
- Multi-tenant isolation patterns included throughout
- Error handling and retry mechanisms specified
- Performance considerations for large file uploads addressed

### File List

**Backend Files**:
- `backend/app/core/storage.py` - MinIO client configuration and connection management
- `backend/app/services/storage_service.py` - Core storage service logic (presigned URLs, path management)
- `backend/app/services/upload_queue.py` - Async upload queue with retry logic
- `backend/app/models/asset.py` - Asset model with storage fields (extend existing)
- `backend/app/api/v1/endpoints/storage.py` - Storage API endpoints
- `backend/app/schemas/storage.py` - Pydantic models for storage API
- `backend/app/tasks/storage_tasks.py` - Celery tasks for async operations
- `backend/alembic/versions/add_storage_fields_to_asset.py` - Database migration

**Frontend Files**:
- `frontend/src/lib/storage/minioUpload.ts` - MinIO direct upload implementation
- `frontend/src/lib/storage/uploadQueue.ts` - Frontend upload queue manager
- `frontend/src/lib/api/storage.ts` - Storage API client functions
- `frontend/src/components/business/UploadProgress.tsx` - Upload progress component

**Test Files**:
- `backend/app/tests/test_storage_service.py` - Storage service unit tests
- `backend/app/tests/test_storage_api.py` - Storage API integration tests
- `frontend/src/lib/__tests__/minioUpload.test.ts` - Frontend upload tests

**Configuration Files**:
- `docker-compose.yml` - Update to include MinIO service (if not present)
- `.env.example` - Add MinIO environment variables example
- `backend/app/core/config.py` - Add MinIO configuration settings