[根目录](../../CLAUDE.md) > **backend**

# 变更记录 (Changelog)
- 2025-12-19: 深度扫描更新，补充AI生成、计费系统等模块信息
- 2025-12-15: 初始化backend模块文档

# 模块职责

Backend模块是E_Business平台的核心API服务，负责：
- 用户认证与授权（JWT + NextAuth集成）
- 工作空间管理（多租户支持）
- 资源文件管理（上传、存储、检索）
- AI生成任务调度与管理（图片、文案、视频）
- 异步任务处理（Celery + Redis）
- 计费与配额管理
- 审计日志记录

# 入口与启动

## 主要入口文件
- **应用入口**: `/backend/app/main.py`
- **配置管理**: `/backend/app/core/config.py`
- **数据库迁移**: `/backend/alembic/`
- **Celery配置**: `/backend/app/core/celery_app.py`

## 启动方式
```bash
# 激活虚拟环境
source venv/bin/activate  # 或 source .venv/bin/activate

# 开发模式启动
uvicorn app.main:app --reload --port 8000

# 生产模式启动
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 启动Celery Worker
celery -A app.core.celery_app worker --loglevel=info --queues=default,image_generation

# 启动Celery Beat（定时任务）
celery -A app.core.celery_app beat --loglevel=info
```

# 对外接口

## API端点结构
```
/api/v1/
├── auth/           # 认证相关
│   ├── POST /login
│   ├── POST /logout
│   └── GET /me
├── workspaces/     # 工作空间管理
│   ├── GET /workspaces
│   ├── POST /workspaces
│   ├── GET /workspaces/{id}
│   ├── POST /workspaces/{id}/invite
│   └── POST /workspaces/join
├── assets/         # 资源管理
│   ├── POST /assets/upload
│   ├── GET /assets
│   ├── GET /assets/{id}
│   └── GET /assets/{id}/download
├── images/         # AI图片生成
│   ├── POST /images/generate
│   ├── GET /images/{job_id}
│   └── GET /images/{job_id}/stream
├── copy/           # 文案生成
│   ├── POST /copy/generate
│   └── GET /copy/{task_id}
├── video/          # 视频生成
│   ├── POST /video/generate
│   └── GET /video/{task_id}
└── billing/        # 计费管理
    ├── GET /billing/usage
    └── GET /billing/limits
```

## 关键服务实现
- **认证服务**: `/backend/app/api/v1/endpoints/auth.py`
- **工作空间服务**: `/backend/app/api/v1/endpoints/workspaces.py`
- **资源管理服务**: `/backend/app/api/v1/endpoints/assets.py`
- **图片生成服务**: `/backend/app/api/v1/endpoints/image.py`
- **文案生成服务**: `/backend/app/api/v1/endpoints/copy.py`
- **视频生成服务**: `/backend/app/api/v1/endpoints/video.py`
- **计费服务**: `/backend/app/api/v1/endpoints/billing.py`

# 关键依赖与配置

## 核心依赖 (pyproject.toml)
- **fastapi**: Web框架
- **uvicorn**: ASGI服务器
- **sqlalchemy**: ORM框架（异步版本）
- **asyncpg**: PostgreSQL异步驱动
- **alembic**: 数据库迁移工具
- **celery**: 分布式任务队列
- **redis**: 消息代理和缓存
- **boto3**: AWS S3 SDK（用于MinIO）
- **pydantic**: 数据验证和序列化
- **openai**: AI API集成
- **ffmpeg-python**: 视频处理
- **edge-tts**: 语音合成

## 配置项说明
```python
# 数据库配置
database_url: str = "postgresql+asyncpg://..."

# Redis配置（用于Celery和缓存）
redis_url: str = "redis://localhost:6379/0"

# MinIO配置（对象存储）
minio_endpoint: str = "localhost:9000"
minio_bucket: str = "ebusiness-assets"

# 安全配置
secret_key: str  # JWT签名密钥
auth_secret: str  # NextAuth集成密钥

# AI配置
ai_mock_mode: bool = True  # Mock模式开关
openai_api_key: str  # OpenAI API密钥

# Celery队列配置
celery_broker_url: str = "redis://localhost:6379/0"
celery_result_backend: str = "redis://localhost:6379/0"
```

# 数据模型

## 核心模型定义
- **User**: 用户模型 (`/backend/app/models/user.py`)
  - 基本信息、认证信息
  - 工作空间关联
- **Workspace**: 工作空间模型 (`/backend/app/models/workspace.py`)
  - 多租户隔离
  - 成员管理
- **Asset**: 资源文件模型 (`/backend/app/models/asset.py`)
  - 文件元信息
  - 存储位置
- **ImageJob**: 图片生成任务 (`/backend/app/models/image.py`)
  - 任务状态
  - 生成参数
- **Copy**: 文案生成任务 (`/backend/app/models/copy.py`)
  - 内容类型
  - 生成结果
- **Video**: 视频生成任务 (`/backend/app/models/video.py`)
  - 脚本、音轨
  - 渲染状态
- **AuditLog**: 审计日志模型 (`/backend/app/models/audit.py`)
  - 操作记录
  - 变更追踪

## 数据库Schema
- 迁移文件位置: `/backend/alembic/versions/`
- 最新迁移:
  - `0010_add_billing.py` - 计费系统表
  - `20251218_add_video_generation_tables.py` - 视频生成表
  - `20251215_create_image_jobs.py` - 图片生成任务表
- 支持多租户数据隔离

# AI生成功能

## 图片生成
- **服务**: `/backend/app/services/image_service.py`
- **任务**: `/backend/app/tasks/image_generation.py`
- **队列**: `image_generation`
- **支持功能**:
  - 多风格选择
  - 参考图上传
  - 批量生成
  - 流式响应

## 文案生成
- **服务**: `/backend/app/services/copy_service.py`
- **任务**: `/backend/app/tasks/copy_tasks.py`
- **类型支持**:
  - 产品描述
  - 卖点列表
  - FAQ
  - 社交媒体文案

## 视频生成
- **服务**: `/backend/app/services/video_service.py`
- **任务**: `/backend/app/tasks/video_tasks.py`
- **功能**:
  - 脚本生成
  - 语音合成（TTS）
  - 视频渲染
  - 音频管理

# 异步任务处理

## Celery配置
- **配置文件**: `/backend/app/core/celery_app.py`
- **队列定义**:
  - `default`: 通用任务队列
  - `image_generation`: 图片生成专用队列
- **任务路由**: 自动根据任务类型分发到对应队列

## 重试机制
- 指数退避策略
- 最大重试次数配置
- 失败通知机制

# 计费与配额

## 配额中间件
- **实现**: `/backend/app/api/deps/quota.py`
- **功能**:
  - 用户配额检查
  - 使用量统计
  - 限制提醒

## 计费服务
- **服务**: `/backend/app/services/billing_service.py`
- **配置**: `/backend/app/core/billing_config.py`
- **功能**:
  - 使用量计算
  - 计费规则
  - 套餐管理

# 存储服务

## MinIO集成
- **服务**: `/backend/app/services/storage_service.py`
- **功能**:
  - 文件上传
  - 预签名URL生成
  - 多部分上传支持

## 文件处理
- **解析器**: 支持PDF、Word、Excel
- **图片处理**: 压缩、格式转换
- **安全检查**: 文件类型验证

# 测试与质量

## 测试结构
```
tests/
├── unit/           # 单元测试
│   ├── test_auth.py
│   ├── test_models.py
│   ├── test_config.py
│   ├── test_image_service.py
│   ├── test_copy_service.py
│   ├── test_video_service.py
│   └── test_billing.py
├── integration/    # 集成测试
│   ├── test_multi_tenancy.py
│   ├── test_storage_api.py
│   ├── test_image_api.py
│   ├── test_copy_integration.py
│   ├── test_video_integration.py
│   └── test_quota_middleware.py
└── performance/    # 性能测试
    ├── test_upload_performance.py
    ├── test_worker_performance.py
    └── test_video_performance.py
```

## 运行测试
```bash
# 运行所有测试
pytest

# 运行测试并生成覆盖率报告
pytest --cov=app

# 运行特定测试
pytest tests/unit/test_auth.py

# 运行性能测试
pytest tests/performance/

# 运行集成测试
pytest tests/integration/
```

## 质量工具配置
- **pytest**: 测试框架
- **pytest-asyncio**: 异步测试支持
- **pytest-cov**: 覆盖率统计
- **factory-boy**: 测试数据工厂
- **faker**: 生成测试数据

# 常见问题 (FAQ)

## Q: 如何添加新的API端点？
A: 1. 在相应的endpoints文件中添加路由处理器
   2. 更新Pydantic schemas
   3. 编写对应的测试用例
   4. 更新API文档

## Q: 如何处理数据库迁移？
A: 1. 修改模型文件
   2. 运行 `alembic revision --autogenerate -m "描述"`
   3. 检查生成的迁移文件
   4. 运行 `alembic upgrade head`

## Q: 如何配置新的Celery任务？
A: 1. 在tasks目录下创建任务函数
   2. 使用@celery_app.task装饰器
   3. 配置队列路由
   4. 在API中调用task.delay()异步执行

## Q: 如何实现多租户数据隔离？
A: 所有查询都需要包含workspace_id过滤
   使用中间件自动设置当前工作空间上下文

## Q: 如何添加新的AI生成功能？
A: 1. 创建服务类处理业务逻辑
   2. 创建Celery任务执行耗时操作
   3. 添加API端点触发任务
   4. 实现WebSocket或SSE进行进度推送

# 相关文件清单

## 核心应用文件
- `app/main.py` - FastAPI应用入口
- `app/core/config.py` - 配置管理
- `app/core/security.py` - 安全相关工具
- `app/core/celery_app.py` - Celery配置
- `app/core/database.py` - 数据库配置

## API端点
- `app/api/v1/endpoints/auth.py` - 认证接口
- `app/api/v1/endpoints/workspaces.py` - 工作空间接口
- `app/api/v1/endpoints/assets.py` - 资源管理接口
- `app/api/v1/endpoints/image.py` - 图片生成接口
- `app/api/v1/endpoints/copy.py` - 文案生成接口
- `app/api/v1/endpoints/video.py` - 视频生成接口
- `app/api/v1/endpoints/billing.py` - 计费接口

## 数据层
- `app/db/base.py` - 数据库基类
- `app/models/` - SQLAlchemy模型
- `app/schemas/` - Pydantic模式
- `alembic/` - 数据库迁移

## 服务层
- `app/services/file_storage.py` - 文件存储服务
- `app/services/image_service.py` - 图片生成服务
- `app/services/copy_service.py` - 文案生成服务
- `app/services/video_service.py` - 视频生成服务
- `app/services/billing_service.py` - 计费服务
- `app/services/audit.py` - 审计服务
- `app/services/rate_limiter.py` - 速率限制

## 任务处理
- `app/tasks/image_generation.py` - 图片生成任务
- `app/tasks/copy_tasks.py` - 文案生成任务
- `app/tasks/video_tasks.py` - 视频生成任务
- `app/tasks/billing.py` - 计费任务
- `app/tasks/invite_cleanup.py` - 邀请清理任务

## 测试文件
- `tests/conftest.py` - 测试配置
- `tests/unit/` - 单元测试
- `tests/integration/` - 集成测试
- `tests/performance/` - 性能测试