[根目录](../../CLAUDE.md) > **backend**

# 变更记录 (Changelog)
- 2025-12-15: 初始化backend模块文档

# 模块职责

Backend模块是E_Business平台的核心API服务，负责：
- 用户认证与授权
- 工作空间管理（多租户支持）
- 资源文件管理（上传、存储、检索）
- AI生成任务调度与管理
- 异步任务处理（图片/视频生成）

# 入口与启动

## 主要入口文件
- **应用入口**: `/backend/app/main.py`
- **配置管理**: `/backend/app/core/config.py`
- **数据库迁移**: `/backend/alembic/`

## 启动方式
```bash
# 激活虚拟环境
source venv/bin/activate

# 开发模式启动
uvicorn app.main:app --reload --port 8000

# 生产模式启动
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

# 对外接口

## API端点结构
```
/api/v1/
├── auth/           # 认证相关
│   ├── login
│   ├── logout
│   └── me
├── workspaces/     # 工作空间管理
│   ├── GET /workspaces
│   ├── POST /workspaces
│   └── GET /workspaces/{id}
└── assets/         # 资源管理
    ├── POST /assets/upload
    ├── GET /assets
    └── GET /assets/{id}/download
```

## 关键服务实现
- **认证服务**: `/backend/app/api/v1/endpoints/auth.py`
- **工作空间服务**: `/backend/app/api/v1/endpoints/workspaces.py`
- **资源管理服务**: `/backend/app/api/v1/endpoints/assets.py`
- **文件存储服务**: `/backend/app/services/file_storage.py`

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
```

# 数据模型

## 核心模型定义
- **User**: 用户模型 (`/backend/app/models/user.py`)
- **Workspace**: 工作空间模型
- **Asset**: 资源文件模型 (`/backend/app/models/asset.py`)
- **AuditLog**: 审计日志模型 (`/backend/app/models/audit.py`)

## 数据库Schema
- 迁移文件位置: `/backend/alembic/versions/`
- 初始迁移: 创建users、workspaces、assets表
- 支持多租户数据隔离

# 测试与质量

## 测试结构
```
tests/
├── unit/           # 单元测试
│   ├── test_auth.py
│   ├── test_models.py
│   └── test_config.py
├── integration/    # 集成测试
│   └── test_multi_tenancy.py
└── performance/    # 性能测试
    └── test_upload_performance.py
```

## 运行测试
```bash
# 运行所有测试
pytest

# 运行测试并生成覆盖率报告
pytest --cov=app

# 运行特定测试
pytest tests/unit/test_auth.py
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
   3. 在API中调用task.delay()异步执行

## Q: 如何实现多租户数据隔离？
A: 所有查询都需要包含workspace_id过滤
   使用中间件自动设置当前工作空间上下文

# 相关文件清单

## 核心应用文件
- `app/main.py` - FastAPI应用入口
- `app/core/config.py` - 配置管理
- `app/core/security.py` - 安全相关工具
- `app/api/deps.py` - 依赖注入

## API端点
- `app/api/v1/endpoints/auth.py` - 认证接口
- `app/api/v1/endpoints/workspaces.py` - 工作空间接口
- `app/api/v1/endpoints/assets.py` - 资源管理接口

## 数据层
- `app/db/base.py` - 数据库基类
- `app/models/` - SQLAlchemy模型
- `app/schemas/` - Pydantic模式
- `alembic/` - 数据库迁移

## 服务层
- `app/services/file_storage.py` - 文件存储服务
- `app/services/rate_limiter.py` - 速率限制
- `app/services/audit.py` - 审计服务
- `app/core/celery_app.py` - Celery配置

## 测试文件
- `tests/conftest.py` - 测试配置
- `tests/unit/` - 单元测试
- `tests/integration/` - 集成测试
- `tests/performance/` - 性能测试