[根目录](../../CLAUDE.md) > **frontend**

# 变更记录 (Changelog)
- 2025-12-19: 深度扫描更新，补充编辑器、向导流程、状态管理等模块信息
- 2025-12-15: 初始化frontend模块文档

# 模块职责

Frontend模块是基于Next.js 16的React应用，负责：
- 用户界面展示与交互（App Router架构）
- 用户认证流程（NextAuth.js v5集成）
- 工作空间管理界面
- 文件上传与预览功能（支持多格式）
- 向导式AI生成工作流
- 图片/文案/视频生成界面
- 实时编辑器（图片编辑、文案编辑）
- 进度跟踪与结果展示

# 入口与启动

## 主要入口文件
- **应用根布局**: `/frontend/src/app/layout.tsx`
- **首页**: `/frontend/src/app/page.tsx`
- **认证配置**: `/frontend/src/auth.ts`
- **中间件**: `/frontend/src/middleware.ts`

## 启动方式
```bash
# 安装依赖
npm install

# 开发模式启动
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 类型检查
npm run type-check
```

# 对外接口

## 页面路由结构 (App Router)
```
src/app/
├── (auth)/              # 认证相关页面组
│   ├── login/
│   └── layout.tsx
├── dashboard/           # 主仪表板
├── workspace/[id]/      # 工作空间详情
│   ├── members/
│   ├── settings/
│   └── products/[productId]/
│       └── copy/       # 文案生成页面
├── join/[token]/        # 邀请加入
├── onboarding/          # 新用户引导
├── wizard/              # 向导式生成流程
│   ├── step-2/         # 品类选择
│   └── step-3/         # 风格配置
└── (dashboard)/        # 仪表板路由组
    ├── editor/         # 编辑器页面
    └── layout.tsx
```

## API路由 (内部API)
```
src/app/api/
└── auth/
    └── [...nextauth]/    # NextAuth处理
```

# 关键依赖与配置

## 核心依赖 (package.json)
- **next**: Next.js 16框架 (App Router)
- **react**: React 19
- **next-auth**: 认证解决方案 v5 Beta
- **@tanstack/react-query**: 数据获取和状态管理
- **zustand**: 轻量级状态管理
- **@radix-ui**: 基础UI组件
- **tailwindcss**: CSS框架
- **react-dropzone**: 文件上传组件
- **mammoth**: Word文档解析
- **pdfjs-dist**: PDF解析
- **xlsx**: Excel文件解析
- **html2canvas**: 图片导出
- **@sentry/nextjs**: 错误监控

## 环境变量配置
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
DATABASE_URL=postgresql://...
API_BASE_URL=http://localhost:8000
SENTRY_DSN=your-sentry-dsn  # 错误监控
```

# 组件架构

## UI组件 (shadcn/ui)
所有基础UI组件位于 `/src/components/ui/`，包括：
- button.tsx
- input.tsx
- card.tsx
- dialog.tsx
- select.tsx
- tabs.tsx
- progress.tsx
- tooltip.tsx
- badge.tsx
- separator.tsx
- scroll-area.tsx
- sonner.tsx (Toast通知)

## 业务组件
核心业务组件位于 `/src/components/business/`：

### 文件处理
- **SmartDropzone**: 智能文件上传组件
- **FilePreview**: 文件预览组件
- **FileList**: 文件列表展示
- **ParsingProgress**: 解析进度显示
- **FileUploadSection**: 文件上传区域

### 生成流程
- **StyleSelector**: 风格选择器
- **CategoryGrid**: 品类网格
- **CategorySidebar**: 品类侧边栏
- **GenerationLoading**: 生成加载动画

### 文案生成
- **CopyGeneratorTabs**: 文案生成标签页
- **SellingPointsGenerator**: 卖点生成器
- **FAQGenerator**: FAQ生成器
- **DescriptionGenerator**: 描述生成器
- **ConfigurationControls**: 配置控制

### 编辑器
- **EditorGrid**: 编辑器网格布局
- **CanvasStitcher**: 画布拼接器
- **SVGPreviewCard**: SVG预览卡片

### 其他
- **WorkspaceHeader**: 工作空间头部
- **DashboardLayoutClient**: 仪表板布局
- **ErrorBoundary**: 错误边界组件

## 页面组件
- **LoginForm**: 登录表单
- **WorkspaceContext**: 工作空间上下文

# 数据流与状态管理

## React Query配置
```typescript
// 查询钩子示例
const { data: workspaces, isLoading } = useQuery({
  queryKey: ['workspaces'],
  queryFn: () => api.workspaces.list()
})
```

## Zustand Store
- **wizardStore**: 向导流程状态管理
- **editorStore**: 编辑器状态管理

## 类型定义
- **通用类型**: `/src/types/index.ts`
- **文件相关**: `/src/types/file.ts`
- **工作空间**: `/src/types/workspace.ts`
- **图片**: `/src/types/image.ts`
- **文案**: `/src/types/copy.ts`
- **编辑器**: `/src/types/editor.ts`
- **画布**: `/src/types/canvas.ts`

# 核心功能实现

## 文件上传系统
- **多格式支持**: PDF、Word、Excel、图片
- **拖拽上传**: React Dropzone集成
- **大文件处理**: 多部分上传
- **进度显示**: 实时上传进度
- **预览功能**: 文件内容预览
- **安全验证**: 文件类型检查

## 向导式生成流程
1. **文件上传步骤**: 选择产品素材
2. **品类选择**: 选择商品分类
3. **风格配置**: 选择生成风格和数量
4. **生成执行**: 触发AI生成任务

## 实时通信
- **SSE Hook**: `/src/hooks/useSSE.ts`
- **WebSocket**: 用于实时更新生成进度
- **进度推送**: 生成状态实时反馈

## 编辑器功能
- **图片编辑器**: 拼接、裁剪、标注
- **文案编辑器**: 实时编辑、格式化
- **画布拼接**: 多图拼接功能

# API集成

## API客户端
位于 `/src/lib/api/`：
- `workspaces.ts` - 工作空间API
- `assets.ts` - 资源管理API
- `images.ts` - 图片生成API
- `copy.ts` - 文案生成API
- `products.ts` - 产品管理API

## 存储服务
- **MinIO上传**: `/src/lib/storage/minioUpload.ts`
- **多部分上传**: `/src/lib/storage/multipartUpload.ts`
- **类型定义**: `/src/lib/storage/types.ts`

# 测试策略

## 测试配置
- **Jest**: 单元测试框架
- **Testing Library**: React组件测试
- **Playwright**: E2E测试

## 测试文件结构
```
├── __tests__/           # 单元测试
├── components/          # 组件测试
│   └── business/
├── e2e/                # E2E测试
│   ├── accessibility.spec.ts
│   └── file-upload.spec.ts
└── test-utils/         # 测试工具
    ├── renderWithProviders.tsx
    └── mockFile.ts
```

## 运行测试
```bash
# 单元测试
npm run test

# 测试覆盖率
npm run test:coverage

# E2E测试
npm run test:e2e
```

# 国际化

## next-intl配置
支持多语言，配置文件：
- 语言文件位置待定义
- 默认语言：中文
- 请求处理: `/src/i18n/request.ts`

# 性能优化

## 已实现优化
1. **Next.js Image组件**: 自动图片优化
2. **动态导入**: 按需加载组件
3. **React Query缓存**: 减少API请求
4. **代码分割**: 自动路由级分割
5. **Web Workers**: 文件解析 Worker
6. **Sentry集成**: 错误监控和性能追踪

## Worker支持
- **文件解析Worker**: `/src/workers/fileParser.worker.ts`
- 使用Web Worker处理大文件解析，避免阻塞UI

# 错误处理

## Error Boundaries
- **全局错误边界**: `/src/components/common/ErrorBoundary.tsx`
- **错误边界提供者**: `/src/components/providers/ErrorBoundaryProvider.tsx`
- **组件级错误边界**: `/src/components/ui/ErrorBoundary.tsx`

## 错误监控
- **Sentry集成**: 自动错误报告
- **错误追踪**: 用户操作路径记录
- **性能监控**: Core Web Vitals追踪

# 可访问性

## 支持功能
- **高对比度模式**: `/src/components/ui/HighContrastToggle.tsx`
- **可访问性提供者**: `/src/components/providers/AccessibilityProvider.tsx`
- **键盘导航**: 全面的键盘支持
- **屏幕阅读器**: ARIA标签支持

# 样式与主题

## Tailwind配置
- 主配置文件: `tailwind.config.js`
- 全局样式: `src/app/globals.css`
- 组件样式使用CVA (class-variance-authority)

## 主题支持
- 使用 `next-themes` 支持暗色模式
- CSS变量定义颜色系统

# 安全特性

## 文件验证
- **文件类型检查**: `/src/lib/security/fileValidator.ts`
- **文件大小限制**: 上传前验证
- **恶意文件检测**: 基础安全检查

## XSS防护
- **DOMPurify集成**: HTML内容清理
- **内容清理器**: `/src/utils/sanitizer.ts`

# 开发工具

## 配置文件
- **ESLint**: `/eslint.config.mjs`
- **TypeScript**: `/tsconfig.json`
- **Jest**: `/jest.config.js`
- **Playwright**: `/playwright.config.ts`

# 常见问题 (FAQ)

## Q: 如何添加新页面？
A: 1. 在 `src/app` 下创建新目录
   2. 添加 `page.tsx` 文件
   3. 如需布局，添加 `layout.tsx`
   4. 更新中间件路由规则（如需要）

## Q: 如何使用新的API？
A: 1. 在 `src/lib/api` 下添加API函数
   2. 定义TypeScript类型
   3. 使用React Query创建钩子
   4. 添加错误处理

## Q: 如何添加新的UI组件？
A: 1. 优先使用shadcn/ui: `npx shadcn-ui@latest add [component]`
   2. 自定义组件放在 `src/components` 下
   3. 保持TypeScript类型定义

## Q: 如何处理文件上传？
A: 使用 `SmartDropzone` 组件，支持：
   - 拖拽上传
   - 多文件选择
   - 文件类型验证
   - 进度显示
   - 预览功能

## Q: 如何实现状态管理？
A:
   - 服务器状态：使用 React Query
   - 客户端状态：使用 Zustand
   - 表单状态：使用 React Hook Form

# 相关文件清单

## 核心应用文件
- `src/app/layout.tsx` - 根布局
- `src/app/page.tsx` - 首页
- `src/middleware.ts` - 路由中间件
- `src/auth.ts` - NextAuth配置

## API与数据层
- `src/lib/api/` - API调用函数
- `src/types/` - TypeScript类型定义
- `src/lib/utils.ts` - 工具函数
- `src/hooks/` - 自定义Hooks

## 组件
- `src/components/ui/` - 基础UI组件
- `src/components/business/` - 业务组件
- `src/components/workspace/` - 工作空间相关组件
- `src/components/providers/` - 上下文提供者
- `src/components/common/` - 通用组件

## 页面
- `src/app/(auth)/login/` - 登录页面
- `src/app/dashboard/` - 仪表板
- `src/app/workspace/` - 工作空间页面
- `src/app/wizard/` - 向导流程
- `src/app/(dashboard)/editor/` - 编辑器

## 状态管理
- `src/stores/wizardStore.ts` - 向导状态
- `src/stores/editorStore.ts` - 编辑器状态

## 工具和服务
- `src/workers/fileParser.worker.ts` - 文件解析Worker
- `src/lib/storage/` - 存储相关服务
- `src/lib/security/` - 安全相关工具

## 测试
- `jest.config.js` - Jest配置
- `jest.setup.js` - 测试环境设置
- `playwright.config.ts` - E2E测试配置
- `__tests__/` - 单元测试文件
- `test-utils/` - 测试工具函数