# E_Business 实施计划 (Implementation Plan)

本文档基于 `epics.md` 定义的需求和 `architecture.md` 定义的架构，详细规划了 `E_Business` 项目的实施步骤。

## 实施策略 (Implementation Strategy)

*   **阶段性交付**: 按照 Epic 顺序进行开发（Epic 1 -> Epic 5）。
*   **Dev-Story 工作流**: 每个 User Story 作为一个独立的开发单元，包含 "编写测试 -> 实现代码 -> 通过测试" 的循环。
*   **Branching**: `main` 为稳定分支，每个 Epic 开 `feature/epic-x` 分支，每个 Story 开 `feat/story-x.y` 分支。

---

## Phase 1: 基础设施 (Epic 1: The Foundation)
**目标**: 建立多租户 SaaS 基础，实现注册、登录、工作空间隔离及文件上传。

### Story 1.1: 环境初始化 (Environment Initialization)
- **前端**: 初始化 Next.js 14 (App Router), TailwindCSS, Shadcn/UI。
- **后端**: 初始化 FastAPI (Async), Poetry, Alembic, Pydantic。
- **Infra**: 编写 `docker-compose.yml` (PostgreSQL, Redis, MinIO)。
- **DB**: 定义基础 User/Workspace 模型，运行首次 Migration。

### Story 1.2: 用户认证 (Auth & Security)
- **前端**: 集成 NextAuth.js v5，配置 Login/Register 页面。
- **后端**: 实现 JWT 生成与验证依赖 (Dependency)，密码 Hashing (Bcrypt)。
- **API**: `/auth/login`, `/auth/register` (如果 NextAuth 使用自定义后端认证)。

### Story 1.3: 工作空间管理 (Workspace/Multi-tenancy)
- **DB**: 完成 `workspaces` 和 `workspace_users` 表设计。
- **后端**: 实现 Tenant 中间件 (`X-Workspace-ID` header 处理)。
- **前端**: 实现工作空间创建向导，邀请链接生成 UI。

### Story 1.4: 智能文件上传 (Smart Upload)
- **前端**: 开发 `SmartDropzone` 组件，集成 `pdf.js` 和 `mammoth.js`。
- **流程**: 拖拽 -> 客户端预解析 -> 显示预览 -> 准备上传。

### Story 1.5: 资产存储 (MinIO Storage)
- **后端**: 集成 `boto3` 或 `minio` 客户端，实现 Presigned URL 生成接口。
- **前端**: 使用 Presigned URL 直传文件到 MinIO。
- **DB**: 记录文件元数据 (`file_key`, `size`, `type`) 到 `assets` 表。

### Story 1.6: 产品分类 (Category Selection)
- **DB**: 简单的 `project_context` 表或字段更新。
- **前端**: 分类选择 UI (Wizard Step 2)。

---

## Phase 2: 核心功能 (Epic 2: Visual Asset Studio)
**目标**: 实现图片生成核心链路，交付"核心价值"。

### Story 2.1: 风格选择与触发 (Style & Trigger)
- **前端**: 风格卡片组件 (CSS Gradients preview)。
- **后端**: `/generate/image` 接口，接收参数并发布任务。

### Story 2.2: 异步生成 Worker (Celery/Redis)
- **后端**: 配置 Celery Worker。定义 `generate_images_task`。
- **Stub**: 这一步先 Mock AI API 调用，专注于流程跑通（Redis 状态流转）。
- **SSE**: 实现 Server-Sent Events 接口，前端实时接收进度。

### Story 2.3: 结果预览与编辑 (Preview & Editor)
- **前端**: `SVGPreviewCard` 组件，实现拖拽排序 (dnd-kit)。
- **交互**: 点击卡片进入编辑模式（简单文本修改）。

### Story 2.4: 参考图附件 (Ref Configuration)
- **前端**: 在卡片上增加"上传参考图"按钮。
- **后端**: 更新任务参数，支持 `image_reference_url`。

### Story 2.5: 长图拼接 (Canvas Stitcher)
- **前端**: 使用 HTML5 Canvas API，将所有卡片垂直绘制。
- **输出**: `toDataURL` 导出 PNG 下载。

---

## Phase 3: 文案能力 (Epic 3: Copywriting Studio)
**目标**: 利用 LLM 生成营销文案。

### Story 3.1: 文案工作台 UI
- **前端**: Tab 页布局 (Titles, Selling Points, FAQ)。
- **State**: 管理当前的 generation context。

### Story 3.2: AI 文案服务 (LLM Integration)
- **后端**: 集成 LLM 客户端 (OpenAI/Anthropic SDK)。
- **Prompt**: 设计针对电商的 Prompt 模板。
- **API**: `/generate/copy` 接口。

### Story 3.3: 交互与导出
- **前端**: 复制到剪贴板功能 (`navigator.clipboard`)。

---

## Phase 4: 视频能力 (Epic 4: Video Studio)
**目标**: 扩展多媒体生成。

### Story 4.1: 视频模式选择
- **前端**: 视频类型选择器，时长选择器。

### Story 4.2: 脚本与分镜 (Scripting)
- **后端**: 视频脚本生成 Chain (LLM -> Script JSON)。

### Story 4.3: 视频渲染引擎 (Rendering)
- **后端**: 集成 ffmpeg (或外部 API) 进行图片+音频合成。
- **Task**: 长耗时异步任务处理。

### Story 4.4: 预览与 TTS
- **后端**: TTS 服务集成 (OpenAI Audio / EdgeTTS)。
- **前端**: 视频播放器组件。

---

## Phase 5: SaaS 成熟化 (Epic 5: Admin & Subscription)
**目标**: 商业化与管理。

### Story 5.1: 配额系统 (Quota)
- **DB**: `user_subscriptions`, `usage_records` 表。
- **Middleware**: API 请求计数与拦截 (`402` Payment Required)。

### Story 5.2: 用户仪表盘
- **前端**: Settings 页面，展示 Usage Progress Bar。

### Story 5.3: 管理员统计
- **API**: `/admin/stats` (这是聚合查询，注意性能)。
- **前端**: Admin 布局，Chart.js 图表。

### Story 5.4: 任务重试与管理
- **API**: `/admin/tasks/{id}/retry`。
- **Celery**: 重新入队逻辑。
