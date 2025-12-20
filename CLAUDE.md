# 变更记录 (Changelog)
- 2025-12-20: 架构师自适应初始化v2.0，更新模块结构图、索引和覆盖率报告，新增bmad-custom-src和.serena配置模块
- 2025-12-19: 深度扫描更新，补充AI生成、计费系统等模块信息
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
- **状态管理**: React Query (TanStack Query) + Zustand
- **认证**: NextAuth.js v5 (Beta)
- **类型安全**: TypeScript

### 后端
- **框架**: FastAPI (Python 3.11+)
- **数据库**: PostgreSQL (Async SQLAlchemy)
- **任务队列**: Celery + Redis
- **文件存储**: MinIO (S3兼容)
- **认证**: JWT Token (与NextAuth集成)
- **AI集成**: OpenAI API + Mock模式

### 基础设施
- **容器化**: Docker + Docker Compose
- **消息队列**: Redis
- **对象存储**: MinIO
- **异步任务**: Celery Workers
- **语义搜索**: mgrep (Mixedbread)

## 系统架构图

```mermaid
graph TB
    subgraph "前端层"
        A[Next.js Frontend]
        A1[认证页面]
        A2[工作空间管理]
        A3[文件上传组件]
        A4[向导式生成器]
        A5[编辑器界面]
    end

    subgraph "API层"
        B[FastAPI Gateway]
        B1[认证API]
        B2[工作空间API]
        B3[资源管理API]
        B4[AI生成API]
        B5[计费配额API]
    end

    subgraph "服务层"
        C[用户认证服务]
        D[工作空间服务]
        E[资源管理服务]
        F[AI生成服务]
        G[计费服务]
        H[存储服务]
    end

    subgraph "任务处理"
        I[Celery Workers]
        J[Redis Queue]
        I1[图片生成Worker]
        I2[视频生成Worker]
        I3[文案生成Worker]
    end

    subgraph "存储层"
        K[PostgreSQL]
        L[MinIO对象存储]
        M[Redis缓存]
    end

    subgraph "外部服务"
        N[OpenAI API]
        O[其他AI供应商]
    end

    A --> B
    A1 --> B1
    A2 --> B2
    A3 --> B3
    A4 --> B4
    A5 --> B5

    B --> C
    B --> D
    B --> E
    B --> F
    B --> G
    B --> H

    F --> J
    J --> I
    I --> I1
    I --> I2
    I --> I3
    I1 --> N
    I2 --> N
    I3 --> N
    I --> L

    C --> K
    D --> K
    E --> K
    E --> L
    G --> K
    H --> L
```

## ✨ 模块结构图

```mermaid
graph TD
    A["(根) E_Business"] --> B["backend"];
    A --> C["frontend"];
    A --> D["docs"];
    A --> E["Website_frontend"];
    A --> F["netlify-deploy"];
    A --> G["mgrep"];
    A --> H["bmad-custom-src"];
    A --> I[".serena"];

    B --> J["app"];
    J --> K["api"];
    J --> L["core"];
    J --> M["models"];
    J --> N["services"];
    J --> O["tasks"];

    C --> P["src"];
    P --> Q["app"];
    P --> R["components"];
    P --> S["lib"];
    P --> T["hooks"];
    P --> U["stores"];

    D --> V["sprint-artifacts"];
    D --> W["项目文档"];

    click B "./backend/CLAUDE.md" "查看 backend 模块文档"
    click C "./frontend/CLAUDE.md" "查看 frontend 模块文档"
    click D "./docs/CLAUDE.md" "查看 docs 模块文档"
    click E "./Website_frontend/CLAUDE.md" "查看 Website_frontend 模块文档"
    click F "./netlify-deploy/CLAUDE.md" "查看 netlify-deploy 模块文档"
    click G "./mgrep/README.md" "查看 mgrep 模块文档"
```

## 模块索引

| 模块路径 | 技术栈 | 职责描述 | 入口文件 | 测试覆盖 | 状态 |
|---------|--------|----------|----------|----------|------|
| [backend](./backend/CLAUDE.md) | FastAPI + Python | API后端，处理业务逻辑、AI集成和异步任务 | `/backend/app/main.py` | Pytest + Factory Boy | ✅ 开发中 |
| [frontend](./frontend/CLAUDE.md) | Next.js + TypeScript | React前端应用，提供完整用户界面 | `/frontend/src/app/layout.tsx` | Jest + Playwright | ✅ 开发中 |
| [Website_frontend](./Website_frontend/CLAUDE.md) | React + Vite | 旧版前端，UI组件资源库 | `/Website_frontend/src/main.tsx` | - | 🔄 维护模式 |
| [docs](./docs/CLAUDE.md) | Markdown | 项目文档、PRD、Sprint管理 | `/docs/prd.md` | - | ✅ 活跃 |
| [netlify-deploy](./netlify-deploy/CLAUDE.md) | 静态HTML | 静态演示版本，纯前端实现 | `/netlify-deploy/index.html` | - | 🎯 演示版 |
| [mgrep](./mgrep/README.md) | TypeScript | 语义搜索工具，代码库探索 | `/mgrep/README.md` | Bats | 🔧 工具 |
| [bmad-custom-src](./bmad-custom-src/) | YAML | BMad自定义配置源 | `/bmad-custom-src/custom.yaml` | - | ⚙️ 配置 |
| [.serena](./.serena/) | YAML | Serena项目配置 | `/.serena/project.yml` | - | ⚙️ 配置 |

# 运行与开发

## 开发环境启动

1. **启动基础服务**:
```bash
docker-compose up -d postgres redis minio
```

2. **启动后端**:
```bash
cd backend
source venv/bin/activate  # 或使用 uvicorn
uvicorn app.main:app --reload --port 8000

# 启动Celery Workers
celery -A app.core.celery_app worker --loglevel=info --queues=default,image_generation
```

3. **启动前端**:
```bash
cd frontend
npm install
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
AI_MOCK_MODE=true  # 开发模式使用Mock响应
OPENAI_API_KEY=your_openai_key  # 生产环境
```

前端 (`.env.local`):
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
API_BASE_URL=http://localhost:8000
```

# 测试策略

## 前端测试
- **单元测试**: Jest + Testing Library
- **集成测试**: React Query测试工具
- **E2E测试**: Playwright
- **测试命令**:
  - `npm run test` - 单元测试
  - `npm run test:e2e` - E2E测试
  - `npm run test:coverage` - 覆盖率报告

## 后端测试
- **单元测试**: Pytest + Pytest-asyncio
- **集成测试**: TestContainers + 实际数据库
- **工厂测试**: Factory Boy生成测试数据
- **性能测试**: 专用性能测试套件
- **测试命令**:
  - `pytest` - 运行所有测试
  - `pytest --cov=app` - 带覆盖率
  - `pytest tests/unit/` - 单元测试
  - `pytest tests/integration/` - 集成测试

# 编码规范

## 命名约定
- **前端**: 使用 `camelCase`
- **后端**: Python代码使用 `snake_case`，API输出自动转换为 `camelCase`
- **数据库**: 表名使用复数snake_case，字段名snake_case

## 类型同步
- 使用OpenAPI作为单一数据源
- 前端通过 `npm run gen:api` 自动生成类型定义（待实现）

## API交互模式
- 成功响应(200): 直接返回数据对象
- 错误响应(4xx/5xx): 返回 `{ detail: "Error message" }`
- 认证: 使用JWT Token和Cookie双重机制

# AI使用指引

## 核心工具策略：mgrep (语义搜索)
本项目已集成 `mgrep`。在探索代码库、查找逻辑或定位Bug时，**必须优先使用 mgrep**，而非传统的 `grep` 或 `find`。

### 为什么使用 mgrep？
- **语义理解**: 使用自然语言描述意图（如 "查找订单状态流转逻辑"）
- **跨栈搜索**: 本项目包含 Next.js 和 Python，mgrep 能更好地理解跨语言的业务逻辑关联
- **多模态**: 支持代码、文档、图片等多种文件类型的语义搜索

### 操作准则
1. **默认首选**: 总是先尝试使用 `mgrep`
2. **查询技巧**:
   - ❌ 避免: 仅搜索关键词
   - ✅ 推荐: 搜索意图和上下文（如 "how orders are created and validated"）
   - ✅ 具体用法: `mgrep "where do we set up auth?"`
3. **多模态**: 利用 mgrep 同时检索代码和 `docs/` 目录下的 Markdown 文档

## 开发建议
1. 先查看相关模块的CLAUDE.md文档了解具体职责
2. 遵循已定义的编码规范和模式
3. 优先阅读现有测试用例了解预期行为
4. 注意多租户架构下的数据隔离要求
5. 使用Mock模式进行开发，生产环境切换到真实AI API

## 常见任务
- **添加新功能**: 使用 mgrep 搜索现有类似功能的实现模式，在前后端同时实现
- **数据库变更**: 使用Alembic迁移，先编写迁移文件再运行
- **新增API端点**: 在FastAPI中添加路由，更新Pydantic schemas
- **UI组件开发**: 优先使用shadcn/ui组件，保持一致性
- **添加新的AI生成任务**: 创建新的Celery task，配置队列和重试机制

# Sprint状态概览

根据最新扫描，当前开发进度：
- ✅ **已完成**: 基础设施搭建、用户认证、工作空间管理
- 🔄 **进行中**: 智能文件上传、图片生成、文案生成、视频生成
- ⏳ **待开始**: 计费配额系统、SaaS成熟度功能

详细进度请查看 [docs/sprint-artifacts/sprint-status.yaml](./docs/sprint-artifacts/sprint-status.yaml)

# 覆盖率报告

- **总文件数**: ~950个文件
- **已扫描**: 890个文件
- **覆盖率**: 93.7%
- **关键模块**: 全部覆盖
- **缺口**: 主要是配置文件和测试辅助文件

# 下一步建议

1. **优先级1**: 完成智能文件上传组件的MinIO集成
2. **优先级2**: 实现AI生成Worker的错误处理和重试机制
3. **优先级3**: 添加计费和配额中间件
4. **优先级4**: 完善API文档和组件库文档

# 项目配置说明

## BMad配置 (bmad-custom-src)
- **语言支持**: TypeScript (主要), Python (后端)
- **项目名称**: E_Business
- **忽略规则**: 遵循 .gitignore
- **只读模式**: 关闭

## Serena配置 (.serena)
- **代码**: my-custom-bmad
- **名称**: ZenoWang-Custom-BMad
- **默认选中**: 是