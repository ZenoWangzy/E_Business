# 变更记录 (Changelog)
- 2025-12-15: 初始化架构文档，建立项目结构和模块索引
- 2025-12-15: 完成 Story 2.1 (Style Selection & Generation Trigger) 开发，包括前端样式选择器、后端生成 API 和 Celery 任务集成

# 项目愿景

E_Business 是一个 AI 驱动的电子商务内容生成平台，旨在通过自动化工作流帮助商家快速生成专业的商品展示内容。核心理念是"一张图，一套店" - 让用户只需上传一张产品图片，即可生成完整的电商展示素材。

## 核心价值主张

1. **简化工作流程**: 将复杂的专业内容生成过程简化为4步自动化流程
2. **专业级输出**: 提供商业级别的图片、文案和视频质量
3. **垂直领域专注**: 专门针对电商场景优化的AI生成能力
4. **高效率提升**: 目标是将用户的内容生成效率提升5倍

# 架构总览

## 技术栈

### 前端
- **框架**: Next.js 16 (App Router)
- **UI库**: shadcn/ui + Radix UI
- **样式**: Tailwind CSS
- **状态管理**: React Query (TanStack Query)
- **认证**: NextAuth.js v5 (Beta)

### 后端
- **框架**: FastAPI (Python 3.11+)
- **数据库**: PostgreSQL (Async SQLAlchemy)
- **任务队列**: Celery + Redis
- **文件存储**: MinIO (S3兼容)
- **认证**: JWT Token (与NextAuth集成)

### 基础设施
- **容器化**: Docker + Docker Compose
- **消息队列**: Redis
- **对象存储**: MinIO
- **异步任务**: Celery Workers

## 系统架构图

```mermaid
graph TB
    subgraph "前端层"
        A[Next.js Frontend]
    end

    subgraph "API层"
        B[FastAPI Gateway]
    end

    subgraph "服务层"
        C[用户认证服务]
        D[工作空间服务]
        E[资源管理服务]
        F[AI生成服务]
    end

    subgraph "任务处理"
        G[Celery Workers]
        H[Redis Queue]
    end

    subgraph "存储层"
        I[PostgreSQL]
        J[MinIO对象存储]
    end

    subgraph "外部服务"
        K[AI API供应商]
    end

    A --> B
    B --> C
    B --> D
    B --> E
    B --> F

    F --> H
    H --> G
    G --> K
    G --> J

    C --> I
    D --> I
    E --> I
    E --> J
```

## 模块索引

| 模块路径 | 技术栈 | 职责描述 | 入口文件 | 测试覆盖 |
|---------|--------|----------|----------|----------|
| [frontend](./frontend/CLAUDE.md) | Next.js + TypeScript | React前端应用，提供用户界面 | `/frontend/src/app/layout.tsx` | Jest + Playwright |
| [backend](./backend/CLAUDE.md) | FastAPI + Python | API后端，处理业务逻辑和AI集成 | `/backend/app/main.py` | Pytest |
| [Website front end](./Website%20front%20end/CLAUDE.md) | React + Vite | 旧版前端，组件待迁移 | `/Website front end/src/App.tsx` | - |
| [docs](./docs/CLAUDE.md) | Markdown | 项目文档和Sprint管理 | `/docs/prd.md` | - |
| [netlify-deploy](./netlify-deploy/CLAUDE.md) | 静态HTML | Netlify部署版本 | `/netlify-deploy/index.html` | - |

# 运行与开发

## 开发环境启动

1. **启动基础服务**:
```bash
docker-compose up -d postgres redis minio
```

2. **启动后端**:
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

3. **启动前端**:
```bash
cd frontend
npm run dev
```

## 环境变量配置

后端 (`.env`):
```env
DATABASE_URL=postgresql+asyncpg://ebusiness:ebusiness_secret@localhost:5433/ebusiness
REDIS_URL=redis://localhost:6379/0
MINIO_ENDPOINT=localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
```

前端 (`.env.local`):
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

# 测试策略

## 前端测试
- **单元测试**: Jest + Testing Library
- **E2E测试**: Playwright
- **测试命令**: `npm run test`, `npm run test:e2e`

## 后端测试
- **单元测试**: Pytest + Pytest-asyncio
- **集成测试**: TestContainers + 实际数据库
- **工厂测试**: Factory Boy生成测试数据
- **测试命令**: `pytest`, `pytest --cov=app`

# 编码规范

## 命名约定
- **前端**: 使用 `camelCase`
- **后端**: Python代码使用 `snake_case`，API输出自动转换为 `camelCase`

## 类型同步
- 使用OpenAPI作为单一数据源
- 前端通过 `npm run gen:api` 自动生成类型定义

## API交互模式
- 成功响应(200): 直接返回数据对象
- 错误响应(4xx/5xx): 返回 `{ detail: "Error message" }`

# AI使用指引

## 核心工具策略：mgrep (语义搜索)
本项目已集成 `mgrep`。在探索代码库、查找逻辑或定位Bug时，**必须优先使用 mgrep**，而非传统的 `grep` 或 `find`。

### 为什么使用 mgrep？
- **语义理解**: 你可以使用自然语言描述意图（如 "查找订单状态流转逻辑"），而不需要知道确切的变量名。
- **跨栈搜索**: 本项目包含 Next.js 和 Python，mgrep 能更好地理解跨语言的业务逻辑关联。

### 操作准则
1.  **默认首选**: 当我不提供具体文件名时，总是先尝试使用 `mgrep`。
2.  **查询技巧**: 
    - ❌ 避免: 仅搜索关键词 (如 "class Order") —— 除非我明确要求精确匹配。
    - ✅ 推荐: 搜索意图和上下文 (如 "how orders are created and validated in the backend")。
3.  **多模态**: 利用 mgrep 同时检索代码和 `docs/` 目录下的 Markdown 文档。

## 开发建议 (General)
1. 先查看相关模块的CLAUDE.md文档了解具体职责
2. 遵循已定义的编码规范和模式
3. 优先阅读现有测试用例了解预期行为
4. 注意多租户架构下的数据隔离要求

## 常见任务 (Common Tasks)
- **添加新功能**: 使用 mgrep 搜索现有类似功能的实现模式（"feature implementation pattern"），在前后端同时实现，并更新类型定义。
- **数据库变更**: 使用Alembic迁移，先编写迁移文件。
- **新增API端点**: 在FastAPI中添加路由，更新OpenAPI文档。
- **UI组件开发**: 优先使用shadcn/ui组件，保持一致性。

## 常见任务
- 添加新功能: 需要在前后端同时实现，并更新类型定义
- 数据库变更: 使用Alembic迁移，先编写迁移文件
- 新增API端点: 在FastAPI中添加路由，更新OpenAPI文档
- UI组件开发: 优先使用shadcn/ui组件，保持一致性