# Sprint Implementation Plan

## 项目总览
E_Business 是一个 AI 驱动的电子商务内容生成平台，核心功能是帮助商家通过自动化工作流快速生成专业的商品展示内容。

## Epic 1: The Foundation - Workspace & Content Ingestion (85% 完成)
- [x] **1.1** Environment Initialization & DB Migration (Review)
- [x] **1.2** User Authentication & Security (Done)
- [x] **1.3** Workspace Management & Multi-tenancy (Done)
- [x] **1.4** Smart File Upload Component (Done - 2025-12-17)
  > ✅ **完成内容**:
  > - 所有必需依赖已安装：react-dropzone、pdfjs-dist、mammoth、xlsx、next-intl、@sentry/nextjs、html2canvas
  > - 核心组件完整实现：SmartDropzone、FilePreview、FileList、ParsingProgress、FileUploadSection
  > - 后端支持：Asset 数据模型、API 端点
  > - 错误处理：ErrorBoundary 组件 + Sentry 集成
  > - 单元测试覆盖
- [ ] **1.5** Asset Storage Service (MinIO Integration) (Ready for Dev)
- [ ] **1.6** Product Category Selection (Ready for Dev)

## Epic 2: The Core - AI Visual Asset Studio (90% 完成)
- [x] **2.1** Style Selection & Generation Trigger (Done)
- [x] **2.2** AI Generation Worker (Celery/Redis) (Done)
- [x] **2.3** SVG Preview Card & Editor (Done)
- [x] **2.4** Reference Image Attachment (Done)
- [x] **2.5** Long Image Generation (Canvas Stitcher) (Done - 2025-12-17)
  > ✅ **完成内容**:
  > - CanvasStitcher 组件：使用 html2canvas 实现图片缝合
  > - 支持 2x 像素密度高质量输出
  > - 集成到 EditorGrid：添加"预览长图"按钮
  > - Zustand store 状态管理：处理生成进度和预览
  > - TypeScript 类型定义：canvas.ts
  > - 单元测试：12/12 通过（CanvasStitcher.test.tsx）
  > - 错误处理：完整的错误边界和重试机制
- epic-1-retrospective: optional
- epic-2-retrospective: optional

## Epic 3: Content Power - AI Copywriting Studio (0% 完成)
- [ ] **3.1** Copywriting Studio UI (Ready for Dev)
- [ ] **3.2** AI Copy Generation Service (Ready for Dev)
- [ ] **3.3** Copy Interaction & Export (Ready for Dev)

## Epic 4: Multimedia - AI Video Studio (0% 完成)
- [ ] **4.1** Video Studio UI & Mode Selection (Ready for Dev)
- [ ] **4.2** Script & Storyboard AI (Ready for Dev)
- [ ] **4.3** Video Rendering Engine (Ready for Dev)
- [ ] **4.4** Video Preview & TTS Integration (Ready for Dev)

## Epic 5: SaaS Maturity - Subscription & Admin (0% 完成)
- [ ] **5.1** Subscription Tiers & Quota Middleware (Ready for Dev)
- [ ] **5.2** User Usage Dashboard (Ready for Dev)
- [ ] **5.3** Admin Dashboard (Stats & Logs) (Ready for Dev)
- [ ] **5.4** User Management & Task Retry (Ready for Dev)

## 最近完成的工作 (2025-12-17)

### Story 2.5: Long Image Generation (Canvas Stitcher)
**文件创建/修改**:
- ✅ `frontend/src/components/business/CanvasStitcher.tsx` - 长图生成组件
- ✅ `frontend/src/types/canvas.ts` - Canvas 相关类型定义
- ✅ `frontend/src/components/business/__tests__/CanvasStitcher.test.tsx` - 单元测试
- ✅ `frontend/src/components/business/EditorGrid.tsx` - 集成长图按钮和模态框
- ✅ `frontend/src/stores/editorStore.ts` - 添加长图生成状态管理
- ✅ `frontend/src/types/editor.ts` - 更新类型定义

### Story 1.4: Smart File Upload 收尾工作
**文件创建/修改**:
- ✅ `frontend/src/components/common/ErrorBoundary.tsx` - 错误边界组件
- ✅ `frontend/src/components/providers/ErrorBoundaryProvider.tsx` - 错误边界提供者
- ✅ `frontend/src/app/(dashboard)/layout.tsx` - Dashboard 布局（集成 ErrorBoundary）
- ✅ `frontend/sentry.client.config.ts` - Sentry 客户端配置
- ✅ `frontend/sentry.server.config.ts` - Sentry 服务器配置
- ✅ `frontend/next.config.ts` - 添加 Sentry 配置
- ✅ `frontend/.env.example` - 环境变量示例文件

## 技术架构更新

### 新增依赖
- html2canvas v1.4.1: 用于 DOM 转换为图片
- @sentry/nextjs v10.30.0: 错误监控和性能追踪

### 组件架构
- CanvasStitcher: 处理多图片缝合成长图
- ErrorBoundary: 全局错误捕获和处理
- ErrorBoundaryProvider: 错误边界上下文提供者

### 状态管理
- EditorStore 扩展：添加 stitcherState 管理长图生成状态
- 新增 hooks: useStitcherState, useStitcherGenerating, useStitcherProgress 等

## 当前状态评估

### MVP 功能 ✅ 基本可用
- 完整的 AI 图片生成流程
- 多图片管理和编辑
- 长图生成功能
- 用户认证和工作空间
- 错误处理和监控

### 生产就绪度 🟡 部分就绪
- 需要完成剩余的 Epic 1 功能
- 需要性能优化
- 需要更多测试覆盖

## 下一步开发计划

### 优先级 1: 完成 Epic 1 基础设施
1. **Story 1.5** - Asset Storage Service (MinIO)
   - 完整的文件存储服务
   - 优化图片上传和处理
   - 实现文件生命周期管理

2. **Story 1.6** - Product Category Selection
   - 产品分类选择器
   - 分类管理后台
   - AI 生成上下文优化

### 优先级 2: 扩展核心功能 (Epic 3)
1. **Story 3.1** - Copywriting Studio UI
   - 文案编辑器界面
   - 模板管理
   - 预览和导出功能

2. **Story 3.2** - AI Copy Generation Service
   - 文案生成 API
   - 多语言支持
   - 品牌语调定制

### 优先级 3: 增强功能
1. 性能优化
   - 图片懒加载
   - 缓存策略
   - CDN 集成

2. 测试完善
   - E2E 测试
   - 集成测试
   - 性能测试

## 开发注意事项

### 代码质量
- 所有新组件必须有单元测试
- TypeScript 严格模式
- ESLint 和 Prettier 规范

### 国际化
- 使用 next-intl
- 支持中英文
- RTL 语言准备

### 错误处理
- 所有异步操作必须有错误处理
- 用户友好的错误提示
- Sentry 错误追踪

### 性能要求
- 页面加载时间 < 3秒
- 图片处理时间 < 10秒
- 支持 100+ 并发用户

## 最后更新
- 日期: 2025-12-17
- 更新人: AI Assistant
- 版本: v1.0