```
---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2025-12-12'
inputDocuments:
  - /Users/ZenoWang/Documents/project/E_Business/docs/prd.md
  - /Users/ZenoWang/Documents/project/E_Business/docs/ux-design-specification.md
  - /Users/ZenoWang/Documents/project/E_Business/docs/analysis/product-brief-E_Business-2025-12-12.md
workflowType: 'architecture'
lastStep: 1
project_name: 'E_Business'
user_name: 'ZenoWang'
date: '2025-12-12'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## 项目背景分析 (Project Context Analysis)

### 需求概览 (Requirements Overview)

**功能性需求 (Functional Requirements):**
本系统是一个专注于 AI 图像生成的 B2B SaaS 平台。
-   **身份与访问 (Identity & Access)**: 多租户架构 (工作空间)，基于角色的访问控制 (拥有者/助理)。
-   **核心工作流 (Core Workflow)**: 上传 (图片/文档) -> 解析 -> AI 生成 (选择风格) -> 预览 -> 导出。
-   **资产管理 (Asset Mgmt)**: 大文件图片存储，简单的标注/编辑功能。
-   **商业化 (Business)**: 订阅分级，用量追踪/配额限制。
-   **管理后台 (Admin)**: 系统监控，用户管理，任务重试。

**非功能性需求 (Non-Functional Requirements):**
-   **异步处理 (Asynchronous Processing)**: 处理耗时的 AI 任务 (<30秒 目标对于 HTTP 请求来说仍然很长，必须使用异步)。
-   **数据隔离 (Data Isolation)**: 租户数据的严格逻辑隔离。
-   **可扩展性 (Scalability)**: 100 并发用户 (起步适中，但需要水平扩展的基础)。
-   **可靠性 (Reliability)**: 针对外部 AI 调用的健壮错误处理和重试机制。

**规模与复杂度 (Scale & Complexity):**
-   主要领域: B2B SaaS / AI 工具
-   复杂度等级: 中等 (Medium)
-   预估架构组件: ~10-15 个 (前端, API 网关, 认证, 核心服务, AI Worker (Image & Video), 数据库, 对象存储, 支付, 管理后台, 通知)

### 技术约束与依赖 (Technical Constraints & Dependencies)

-   **外部 AI API**: 关键依赖。架构必须处理故障、延迟，并确保 API 密钥的安全管理。
-   **Brownfield 环境**: 存在现有的 "Website front end"。架构需要明确是重用还是替换它。
-   **基于浏览器**: 桌面优先 (Desktop-first) 的 Web 应用交付。

### 识别到的横切关注点 (Cross-Cutting Concerns Identified)

-   **多租户 (Multi-Tenancy)**: 租户 ID 在所有层级中的穿透。
-   **任务管理 (Job Management)**: AI 任务的异步队列。
-   **可观测性 (Observability)**: 生成失败的链路追踪 (用户错误 vs 系统错误 vs API 错误)。
-   **配额管理 (Quota Management)**: 针对昂贵的 AI 调用强制执行订阅限制。

## 起步模板评估 (Starter Template Evaluation)

### 主要技术领域 (Primary Technology Domain)
**全栈 Web 应用 (分离式架构)**
基于您明确的“前后端分离”需求，我们不使用单一的一体化框架，而是分别为前端和后端选择最佳的起步模板。

### 选定的起步方案 (Selected Starter Options)

我们将手动初始化两个并行的服务，构建一个类似 Monorepo 的结构：

*   根目录 `/E_Business`
    *   `/frontend` (Next.js)
    *   `/backend` (FastAPI)

#### 1. 前端 (Frontend): Next.js App Router
**选择理由:** 符合您的明确要求。Next.js 提供了比 Vite 更强大的路由和服务端能力。由于您的现有代码是 React + Tailwind + Radix UI，可以非常顺滑地迁移到 Next.js。

**初始化命令:**
```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint
# 随后安装 shadcn-ui 以匹配现有风格
npx shadcn-ui@latest init
```

**架构决策:**
-   **路由**: App Router (Next.js 14+)
-   **样式**: Tailwind CSS (与现有项目一致，方便迁移)
-   **组件库**: shadcn/ui (与现有项目一致)
-   **迁移策略**: 将 `Website front end/src/components` 中的 UI 组件逐步搬运至 Next.js，重写页面逻辑以适应 SSR/Server Actions。

#### 2. 后端 (Backend): FastAPI
**选择理由:** 您习惯使用 Python，且 FastAPI 是目前 Python 生态中构建高性能异步 API (尤其是 AI 应用) 的首选。

**建议结构 (基于最佳实践):**
-   使用 `poetry` 或 `venv` 进行依赖管理。
-   使用 `SQLAlchemy` (Async) 或 `Tortoise-ORM` 连接 Postgres。
-   使用 `Pydantic` 进行数据校验。

**初始化结构:**
```bash
mkdir backend && cd backend
python -m venv venv
pip install fastapi uvicorn sqlalchemy asyncpg pydantic-settings
```

#### 3. 数据库 (Database): PostgreSQL
**选择理由:** 明确的偏好，且适合处理结构化业务数据。

**本地运行:**
-   建议使用 Docker 运行本地 Postgres，方便管理和清理。
```bash
docker run --name e_business_db -e POSTGRES_PASSWORD=secret -d -p 5432:5432 postgres
```

### 综合架构评估

这种架构结合了 **Next.js** 的前端体验优势和 **FastAPI** 的 Python AI 生态优势。如果您需要进行复杂的 AI 处理（如图像生成），Python 后端可以直接集成相关库，非常高效。

## 核心架构决策 (Core Architectural Decisions)

### 决策优先级分析 (Decision Priority Analysis)

**关键决策 (Critical Decisions):**
-   **认证方案**: NextAuth.js v5 (Beta) - 追求开发速度与 Next.js 的深度集成。
-   **AI 异步处理**: Celery v5.6 + Redis - 追求强大的任务队列和 Streaming 体验。
-   **文件存储**: MinIO (Docker) - 本地 S3 兼容存储，方便迁移。

### 认证与安全 (Authentication & Security)

**决策**: 采用 NextAuth.js (Auth.js) v5 (Beta)
**理由**:
-   与 Next.js App Router 完美集成。
-   支持 OAuth (Google/GitHub) 开箱即用，极大简化 MVP 开发。
-   Token 在后端 (FastAPI) 进行无状态验证 (Stateless Verification)。

### AI 任务与通信 (AI Task & Communication)

**决策**: Celery v5.6 + Redis + Streaming UI
**架构模式**:
1.  **提交任务**: FastAPI 接收请求 -> 将任务推送到 Redis 队列 -> 返回 `task_id`。
2.  **异步执行**: Celery Worker 从 Redis 获取任务 -> 调用 AI 模型进行生成。
3.  **状态反馈 (Streaming)**:
    -   Celery Worker 在执行过程中，实时写入中间状态/思考步骤到 Redis (Pub/Sub 或 Key 更新)。
    -   前端通过 **Server-Sent Events (SSE)** 或 **WebSocket** 连接 FastAPI，订阅 `task_id` 的频道。
    -   FastAPI 将 Redis 中的实时状态推送到前端，实现 "Thinking..." 打字机效果。

**特定于视频的增强:**
-   **长时任务**: 视频生成可能需要 2-5 分钟。Celery 的 timeout 设置必须增加。
-   **Webhook 回调**: 优选异步 Webhook 方式接收 AI 供应商的完成通知，而不是轮询。

### 数据与文件存储 (Data & File Storage)

**数据库**: PostgreSQL (Docker)
-   使用 `asyncpg` + `SQLAlchemy` (Async) 进行高性能异步读写。

**文件存储**: MinIO (Docker)
-   **本地开发**: 运行 MinIO 容器，模拟 AWS S3 API。
-   **生产环境**: 可无缝切换到 AWS S3 / 阿里云 OSS，代码无需修改。
-   **流程**: 图片生成后 -> 存入 MinIO -> 获取预签名 URL (Presigned URL) -> 返回给前端。

### 基础设施 (Infrastructure)

**本地 MVP 运行环境 (Dev):**
使用 `docker-compose.yml` 编排以下服务：
-   PostgreSQL
-   Redis (消息队列/缓存)
-   MinIO (对象存储)
-   FastAPI (API Server + Celery Worker)

## 实现模式与一致性规则 (Implementation Patterns & Consistency Rules)

为防止前后端分离开发中常见的冲突，所有 Agent 必须严格遵守以下模式：

### 1. 命名与数据格式 (Naming & Data Format)

**规则**: **前端 CamelCase，后端 SnakeCase (自动转换)**
*   **后端开发 (FastAPI)**: Python 代码 (变量、数据库字段) **必须** 使用 `snake_case`。
*   **API 输出**: 配置 Pydantic 使用 `alias_generator` 将输出自动转换为 `camelCase`。
*   **前端开发 (Next.js)**: TypeScript 代码 **必须** 使用 `camelCase`。

**示例:**
```python
# Backend (Pydantic)
class UserSchema(BaseModel):
    first_name: str  # Python use snake_case
    class Config:
        alias_generator = to_camel  # API JSON outputs: "firstName"
```

### 2. 类型同步 (Type Synchronization)

**规则**: **OpenAPI 驱动的自动生成 (Single Source of Truth)**
*   **后端**: 仅仅修改 Pydantic Model，**不要** 手动修改前端类型。
*   **前端**: 运行 `npm run gen:api` 命令。该命令会拉取 `http://localhost:8000/openapi.json` 并使用 `openapi-typescript` 重新生成前端 TS 类型定义。

### 3. API 交互模式 (API Interaction)

**规则**: **扁平化 RESTful 响应 (Flat Response)**
*   **成功 (200)**: 直接返回数据对象 (JSON)。不要包裹在 `{ data: ... }` 中。
*   **错误 (4xx/5xx)**: 返回标准 HTTP 错误结构 `{ detail: "Error message" }`。
*   **前端处理**: 使用 HTTP Status Code 判断成功/失败。

**反模式 (禁止使用):**
❌ `{ code: 200, message: "success", data: { ... } }` (禁止自定义状态码封装)

### 4. 目录结构一致性 (Directory Structure)

**后端 (backend/)**
```
/app
  /api          # 路由定义 (Routes)
  /schemas      # Pydantic 模型 (Data Transfer Objects)
  /models       # SQLAlchemy 模型 (Database Tables)
  /services     # 业务逻辑 (Business Logic)
  /core         # 配置与工具 (Config)
```

**前端 (frontend/)**
```
/app            # Next.js App Router 页面

## 项目结构与边界 (Project Structure & Boundaries)

### 完整项目目录结构 (Complete Project Directory Structure)

```text
/E_Business (Project Root)
├── docker-compose.yml          # Infrastructure orchestration (DB, Redis, MinIO)
├── .env                        # Shared environment variables (Secrets)
├── README.md                   # Project documentation entry point
├── /frontend                   # [Next.js] User Interface Application
│   ├── package.json
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   ├── components.json         # shadcn/ui config
│   ├── .env.local              # Frontend-specific env
│   └── src
│       ├── app                 # Next.js App Router (Pages & Routes)
│       │   ├── (auth)          # Authentication routes group
│       │   ├── (dashboard)     # Protected dashboard routes group
│       │   ├── api             # Frontend BFF API (e.g., Auth handlers)
│       │   ├── globals.css     # Global styles
│       │   └── layout.tsx      # Root layout
│       ├── components
│       │   ├── ui              # shadcn/ui reusable atoms
│       │   ├── business        # Domain-specific components
│       │   └── layout          # Header, Sidebar, Footer
│       ├── lib
│       │   ├── api             # Auto-generated API client (OpenAPI)
│       │   └── utils.ts        # CN util for tailwind
│       └── types               # Frontend TypeScript definitions
├── /backend                    # [FastAPI] Core Logic & API
│   ├── pyproject.toml          # Python dependencies (Poetry)
│   ├── alembic.ini             # DB Migration config
│   ├── .env                    # Backend-specific env
│   └── app
│       ├── main.py             # App entry point
│       ├── worker.py           # Celery worker entry point
│       ├── api                 # API Route Controllers
│       │   ├── v1              # Versioned API
│       │   └── deps.py         # Dependency Injection (Auth, DB)
│       ├── core                # Core config, security, events
│       ├── models              # SQLAlchemy ORM Models (DB Tables)
│       ├── schemas             # Pydantic Schemas (Request/Response)
│       ├── services            # Business Logic Layer
│       │   ├── copy_service.py # AI Text Generation (Module 1)
│       │   ├── image_service.py # AI Image Generation (Module 2)
│       │   ├── video_service.py # AI Video Generation (Module 3)
│       │   └── storage.py      # MinIO/S3 Logic
│       └── db                  # Database connection & session
└── /docs                       # Project Documentation (Architecture, PRD)
```

### 架构边界定义 (Architectural Boundaries)

**API 边界 (API Boundaries):**
*   **External API**: `http://localhost:8000/api/v1` (FastAPI). 仅供前端调用。
*   **Frontend BFF**: `http://localhost:3000/api/auth` (Next.js). 处理 OAuth 回调和 Session 管理。
*   **Auth Boundary**: 所有 `/api/v1/*` (除登录/注册) 均受 `deps.get_current_user` 保护。

**组件边界 (Component Boundaries):**
*   **UI Components**: 纯展示，无业务逻辑 (`src/components/ui`).
*   **Business Components**: 包含状态和 API 调用 (`src/components/business`).
*   **Pages**: 仅作为数据获取和布局容器 (`src/app`).

**服务边界 (Service Boundaries):**
*   **FastAPI**: 处理同步 HTTP 请求，快速返回。
*   **Celery Worker**: 处理所有 > 2秒 的任务 (AI 生成、图像处理)。通过 Redis 解耦。
*   **Postgres**: 持久化结构化业务数据 (用户、订单、图片元数据).
*   **MinIO**: 持久化非结构化 Blob 数据 (图片文件).

### 需求到结构的映射 (Requirements to Structure Mapping)

**Epic: 用户管理 (User Management)**
*   **Frontend**: `src/app/(auth)/login`, `src/components/business/LoginForm`
*   **Backend API**: `backend/app/api/v1/endpoints/auth.py`
*   **Database**: `backend/app/models/user.py`

**Module 1: Smart Copy (Text)**
*   **Frontend**: `src/app/(dashboard)/copy/page.tsx`
*   **Backend API**: `backend/app/api/v1/endpoints/copy.py`
*   **Service**: `backend/app/services/copy_service.py`

**Module 2: Visual Assets (Image)**
*   **Frontend**: `src/app/(dashboard)/image/page.tsx`
*   **Backend API**: `backend/app/api/v1/endpoints/image.py`
*   **Service**: `backend/app/services/image_service.py`

**Module 3: Video Studio (Video)**
*   **Frontend**: `src/app/(dashboard)/video/page.tsx`
*   **Backend API**: `backend/app/api/v1/endpoints/video.py`
*   **Service**: `backend/app/services/video_service.py`

**Cross-Cutting: 多租户 (Multi-Tenancy)**
*   **Middleware**: `backend/app/api/deps.py` (解析 Token 中的 workspace_id)
*   **Models**: 所有业务表 (如 `Product`, `Image`) 均包含 `workspace_id` 字段。

## 架构验证结果 (Architecture Validation Results)

### 一致性与完整性验证 (Coherence & Completeness) ✅

**决策兼容性**:
-   **Next.js + FastAPI**: 通过 REST API 进行松耦合通信，技术栈无冲突。
-   **Docker Infrastructure**: 为 Next.js, FastAPI, Celery, Redis, PG 提供了统一的运行环境。

**需求覆盖**:
-   **异步 AI**: Celery + Redis 完美覆盖了 PRD 中的 "30s 生成时间" 挑战。
-   **数据安全**: 明确的 API 边界和依赖注入 (deps.py) 确保了多租户数据的隔离。

### 填补缺口 (Gap Analysis & Resolution)

**开发环境路由 (Dev Proxy)**:
-   **问题**: 前端 (3000) 调用 后端 (8000) 存在跨域问题。
-   **解决**: 在 `next.config.mjs` 中配置 `rewrites` 规则，代理 `/api/v1` 请求到后端。

### 实施准备度 (Implementation Readiness)

**整体状态**: **READY FOR IMPLEMENTATION (就绪)**
AI Agent 已具备开始编码所需的所有信息：
1.  **地基**: Docker Compose 文件内容。
2.  **骨架**: 前后端目录树。
3.  **规则**: 命名与类型同步模式。

**第一步优先任务**:
初始化项目仓库，创建前端和后端的基础脚手架。

## 架构完成总结 (Architecture Completion Summary)

### 工作流完成情况 (Workflow Completion)

**架构决策工作流**: COMPLETED ✅
**总步骤数**: 8
**完成日期**: 2025-12-12
**文档位置**: /Users/ZenoWang/Documents/project/E_Business/docs/architecture.md

### 最终交付成果 (Final Architecture Deliverables)

**📋 完整架构文档**
*   所有架构决策均已记录具体版本 (Next.js 14, FastAPI, Celery 5.6)
*   确保 AI Agent 一致性的实现模式 (Naming, Type Sync)
*   完整的前后端 Monorepo 项目结构
*   一致性与完整性验证通过

**🏗️ 实施就绪基础 (Implementation Ready Foundation)**
*   **3** 个关键技术栈决策 (Frontend, Backend, Infra)
*   **4** 个核心一致性模式 (Naming, Type, API, Process)
*   **1** 个统一的 Docker 运行环境

**📚 AI Agent 实施指南**
*   必须遵守的前后端分离开发规范
*   防止冲突的各类命名和交互规则
*   清晰的代码归属地 (Frontend vs Backend Boundaries)
*   明确的集成点与通信标准

### 实施移交 (Implementation Handoff)

**给 AI Agent 的指令:**
本架构文档是实施 **E_Business** 项目的唯一真理来源。请严格按照文档中的决策、模式和结构进行开发。

**首要实施优先级:**
执行项目初始化命令，搭建 Monorepo 骨架。

**开发顺序:**
1.  初始化项目 (Next.js + FastAPI + Docker)
2.  配置开发环境 (Env, Pre-commit, Linting)
3.  实现核心基础设施 (Auth, DB, Celery)
4.  开发业务特性 (按照 Epic 优先级)

### 质量保证清单 (Quality Assurance Checklist)

**✅ 架构一致性**
- [x] 所有决策无冲突
- [x] 技术栈兼容
- [x] 模式支持决策
- [x] 结构对齐技术栈

**✅ 需求覆盖**
- [x] 功能需求支持 (Auth, AI, Business)
- [x] 非功能需求支持 (Async, Security)
- [x] 跨切面关注点处理 (Multi-tenancy)
- [x] 集成点定义明确

**✅ 实施准备度**
- [x] 决策具体可执行
- [x] 模式防止 Agent 冲突
- [x] 结构完整无歧义
- [x] 提供了清晰示例

### 成功的项目要素 (Project Success Factors)

**🎯 清晰的决策框架**
每个技术选择都经过深思熟虑，兼顾了开发速度 (Next.js) 与 AI 能力 (FastAPI)。

**🔧 一致性保证**
通过严格的命名和交互模式，确保不同 Agent 编写的代码能无缝集成。

**🏗️ 坚实的基础**
基于 Docker 的基础设施提供了类似生产环境的开发体验，减少了环境差异带来的问题。

---

**架构状态:** READY FOR IMPLEMENTATION (就绪) ✅

**下一阶段:** 根据本文档开始具体实施。

**文档维护:** 若在实施过程中做出重大技术变更，请更新本文档。






