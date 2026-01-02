# AI 文案工作室链路修复计划 (修订版)

## 📋 文档说明

**原始问题**: Dashboard 中 "AI 文案工作室" 卡片点击无反应
**修订原因**: 原计划对系统架构理解有误，需要基于实际代码重新设计
**修订日期**: 2026-01-02
**分析深度**: 完整代码扫描（Dashboard、向导、产品管理、文案工作室）

---

## ❌ 原计划的主要问题（需避免）

### 问题 1: 对"问题"的误判
- **原声称**: "卡片仅为静态 div，未绑定点击事件"
- **实际情况**: 卡片有完整的 UI 状态（hover 效果、cursor-pointer），问题只是缺少路由跳转逻辑

### 问题 2: 对向导流程的误解
- **原声称**: "`/wizard/step-1` 似乎缺失"
- **实际情况**: Step 1 是 Dashboard 上的 `FileUploadSectionWrapper` 组件，不是独立页面

### 问题 3: 对产品管理的错误理解
- **原建议**: 创建 `/workspace/[id]/products` 产品列表页
- **实际情况**: 系统已经有完整的产品路由 `/workspace/[workspaceId]/products/[productId]/copy`，且设计理念是"通过向导创建新产品"，而不是"从列表选择产品"

### 问题 4: 对 Dashboard 职责的误解
- **原建议**: "Dashboard 获取默认工作区，直接跳转到产品列表"
- **实际情况**: Dashboard 的核心职责是工作区管理和文件上传，不是直接跳转到功能页面

### 问题 5: 对用户体验设计的误解
- **原建议**: "如果只有一个产品，自动跳转"
- **实际考虑**: 系统支持多种生成模式（文案、视觉、视频），应该给用户选择权

---

## ✅ 系统的实际业务逻辑

### 核心业务流程
```
用户登录
    ↓
Dashboard (选择工作区)
    ↓
文件上传 (FileUploadSectionWrapper)
    ↓ assetId + workspaceId
Step 2: 品类选择 (创建产品)
    ↓ productId
Step 3: 风格选择 (触发 AI 生成)
    ↓
生成完成
    ↓
文案工作室 (/workspace/[workspaceId]/products/[productId]/copy)
```

### 关键设计理念

1. **工作区为中心的多租户架构**
   - 每个工作区独立
   - 资源完全隔离
   - 支持多成员协作

2. **向导式产品创建**
   - 从文件上传开始
   - 选择品类和风格
   - 触发 AI 生成
   - 产品自动创建

3. **工作室功能模块**
   - 文案工作室：标题、卖点、FAQ、描述生成
   - 视觉工作室：图片生成和编辑
   - 视频工作室：视频生成（待实现）

4. **状态管理架构**
   - `wizardStore`: 向导流程状态
   - `WorkspaceProvider`: 工作区上下文
   - React Query: API 数据缓存

---

## 🎯 正确的修复方案

### 方案概述

**核心思路**: 保持现有的向导式产品创建流程，只修复 Dashboard 卡片的导航跳转。

**设计原则**:
1. 不破坏现有的向导流程
2. 不创建不需要的产品列表页
3. 引导用户按照正确的流程使用系统
4. 保持用户体验的一致性

---

## 📝 详细实施步骤

### 步骤 1: 修复 Dashboard 卡片导航

#### 文件: `frontend/src/app/dashboard/page.tsx`

**当前问题**:
```typescript
// 第 44-59 行
{[
    { title: "AI 视觉工作室", desc: "生成产品图片和主图" },
    { title: "AI 文案工作室", desc: "创作产品描述和标题" },
    { title: "AI 视频工作室", desc: "制作产品视频内容" },
].map((item) => (
    <div
        key={item.title}
        className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:border-violet-500/50 transition-colors cursor-pointer group"
    >
        {/* 只有样式，没有点击逻辑 */}
    </div>
))}
```

**修复方案**:
```typescript
'use client';

import { useWorkspaceContext } from '@/components/workspace/WorkspaceProvider';
import { useRouter } from 'next/navigation';

// 在 DashboardPage 组件内
const DashboardPage = ({ userEmail, userName }: { userEmail: string; userName?: string }) => {
    const { currentWorkspace } = useWorkspaceContext();
    const router = useRouter();

    const handleStudioClick = (studioType: 'visual' | 'copy' | 'video') => {
        // 检查是否选择了工作区
        if (!currentWorkspace) {
            // 显示提示：请先选择工作区
            toast.error('请先选择一个工作区');
            return;
        }

        // 引导用户到文件上传区域
        // 滚动到文件上传区域
        document.getElementById('file-upload-section')?.scrollIntoView({ behavior: 'smooth' });

        // 显示提示
        toast.info('请先上传产品文件，然后通过向导创建产品');
    };

    return (
        // ... 其他代码
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
                { title: "AI 视觉工作室", desc: "生成产品图片和主图", type: 'visual' },
                { title: "AI 文案工作室", desc: "创作产品描述和标题", type: 'copy' },
                { title: "AI 视频工作室", desc: "制作产品视频内容", type: 'video' },
            ].map((item) => (
                <div
                    key={item.title}
                    onClick={() => handleStudioClick(item.type)}
                    className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:border-violet-500/50 transition-colors cursor-pointer group"
                >
                    <h3 className="text-lg font-semibold text-white group-hover:text-violet-400 transition-colors">
                        {item.title}
                    </h3>
                    <p className="text-sm text-neutral-400 mt-2">{item.desc}</p>
                </div>
            ))}
        </div>
    );
};
```

**关键修改点**:
1. 将页面改为客户端组件（添加 'use client'）
2. 引入 `useWorkspaceContext` 获取当前工作区
3. 为每个卡片添加 `onClick` 处理函数
4. 点击时引导用户到文件上传区域
5. 添加友好的提示信息

---

### 步骤 2: 优化文件上传区域

#### 文件: `frontend/src/app/dashboard/page.tsx`

**添加 ID 和提示**:
```typescript
{/* File Upload Section - Story 1.4 */}
<div id="file-upload-section" className="mt-8">
    <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">开始创建</h2>
        <p className="text-neutral-400">
            上传您的产品文件，我们将引导您完成整个创建流程
        </p>
    </div>
    <FileUploadSectionWrapper />
</div>
```

---

### 步骤 3: 添加向导流程引导

#### 文件: `frontend/src/components/business/FileUploadSectionWrapper.tsx`

**优化上传完成后的跳转**:

检查文件上传成功后的处理逻辑，确保：
1. 正确传递 `assetId` 和 `workspaceId` 到向导
2. 添加成功提示
3. 提供清晰的"下一步"按钮

**建议的代码修改**:
```typescript
const handleUploadSuccess = (assetId: string) => {
    // 保存到 wizardStore
    wizardStore.setCurrentAssetId(assetId);
    wizardStore.setCurrentWorkspaceId(workspaceId);

    // 显示成功提示
    toast.success('文件上传成功！正在进入下一步...');

    // 延迟跳转到品类选择
    setTimeout(() => {
        router.push(`/wizard/step-2?assetId=${assetId}&workspaceId=${workspaceId}`);
    }, 1000);
};
```

---

### 步骤 4: 优化文案工作室的面包屑导航

#### 文件: `frontend/src/app/workspace/[id]/products/[productId]/copy/page.tsx`

**添加面包屑导航**:
```typescript
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

// 在页面顶部添加
<div className="mb-6 flex items-center text-sm text-muted-foreground">
    <Link href="/dashboard" className="hover:text-foreground">
        <Home className="w-4 h-4" />
    </Link>
    <ChevronRight className="w-4 h-4 mx-2" />
    <Link href={`/dashboard`} className="hover:text-foreground">
        工作台
    </Link>
    <ChevronRight className="w-4 h-4 mx-2" />
    <span className="text-foreground">AI 文案工作室</span>
</div>
```

---

### 步骤 5: 添加空状态引导（可选）

#### 新建文件: `frontend/src/app/workspace/[id]/products/page.tsx`

**如果确实需要产品列表页**，可以创建一个简化版本：

```typescript
'use client';

import { useWorkspaceContext } from '@/components/workspace/WorkspaceProvider';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

export default function ProductsListPage() {
    const { currentWorkspace } = useWorkspaceContext();
    const router = useRouter();

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">产品列表</h1>

            {/* 空状态 */}
            <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                    还没有产品？通过向导创建您的第一个产品吧！
                </p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="btn-primary"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    创建新产品
                </button>
            </div>

            {/* 如果有产品，显示产品列表 */}
            {/* TODO: 从 API 获取产品列表并展示 */}
        </div>
    );
}
```

**注意**: 这个页面是可选的，只有在确实需要查看和管理已有产品时才创建。

---

## 🔍 实施检查清单

### 必须完成
- [x] 修改 `frontend/src/app/dashboard/page.tsx`，添加卡片点击处理
- [x] 为文件上传区域添加 ID
- [x] 添加友好的用户提示（使用 Toast）
- [x] 修复 step-2 的 `/wizard/step-1` 跳转为 `/dashboard`
- [x] 添加 Toaster 组件到 DashboardLayoutClient
- [⚠️] 测试点击卡片后的用户引导流程 - **需要先创建工作区**

### 建议完成
- [ ] 优化文件上传成功后的跳转逻辑
- [ ] 在文案工作室添加面包屑导航
- [ ] 添加空状态引导（如果需要）

### 不需要做
- [x] 创建 `/workspace/[id]/products` 产品列表页（可选，非必需）
- [x] 修改文案工作室的路由结构
- [x] 实现"自动跳转"功能

---

## 🧪 测试计划

### 测试场景 1: 新用户首次使用
1. 用户登录后进入 Dashboard
2. 点击"AI 文案工作室"卡片
3. **预期**: 页面滚动到文件上传区域，显示提示
4. 用户上传文件
5. **预期**: 跳转到品类选择页面

### 测试场景 2: 已有产品的用户
1. 用户有已完成向导的产品
2. 用户直接访问 `/workspace/[id]/products/[productId]/copy`
3. **预期**: 正常显示文案工作室界面

### 测试场景 3: 未选择工作区
1. 用户进入 Dashboard，但未选择工作区
2. 点击任意工作室卡片
3. **预期**: 显示错误提示"请先选择工作区"

---

## 📚 相关文件清单

### 需要修改的文件
- `frontend/src/app/dashboard/page.tsx` - Dashboard 主页面
- `frontend/src/components/business/FileUploadSectionWrapper.tsx` - 文件上传包装器（可选优化）

### 需要读取的文件
- `frontend/src/app/wizard/step-2/page.tsx` - 品类选择页面
- `frontend/src/app/workspace/[id]/products/[productId]/copy/page.tsx` - 文案工作室

### 相关组件
- `frontend/src/components/workspace/WorkspaceProvider.tsx` - 工作区上下文
- `frontend/src/stores/wizardStore.ts` - 向导状态管理

---

## 🎓 附录：系统使用指南

### 基本使用流程

#### 第一步：登录并选择工作区
1. 访问 `/dashboard`
2. 通过顶部导航栏选择或切换工作区
3. 确认当前工作区（显示在页面顶部）

#### 第二步：上传产品素材
1. 在 Dashboard 的文件上传区域拖拽文件
2. 支持格式：PDF、Word、Excel、图片
3. 系统会解析文件并生成 `assetId`

#### 第三步：创建产品（向导流程）
1. 上传完成后，系统会引导到 `/wizard/step-2`
2. 选择产品类别（如：服装、电子产品、家居等）
3. 系统调用 `createProduct` API 创建产品
4. 获得新的 `productId`

#### 第四步：配置生成风格
1. 在 `/wizard/step-3` 选择视觉风格
2. 触发 AI 生成任务
3. 等待生成完成（有进度显示）

#### 第五步：进入文案工作室
1. 生成完成后，导航到：
   ```
   /workspace/[workspaceId]/products/[productId]/copy
   ```
2. 使用四个生成模块：
   - **标题生成器**：创作吸引人的产品标题
   - **卖点生成器**：提炼核心卖点
   - **FAQ 生成器**：生成常见问题解答
   - **描述生成器**：撰写详细产品描述

### 高级功能

#### 工作区管理
- **成员管理**：`/workspace/[id]/members`
- **设置**：`/workspace/[id]/settings`
- **计费**：`/workspace/[id]/billing`

#### 产品导航
- **文案工作室**：`/workspace/[id]/products/[productId]/copy`
- **视频工作室**：`/workspace/[id]/products/[productId]/video`

---

## 📊 总结

### 核心问题
原计划基于对系统架构的误解，建议创建不需要的产品列表页。实际上系统已经有完整的向导式产品创建流程，只需要修复 Dashboard 卡片的导航跳转即可。

### 修复重点
1. 添加卡片点击处理逻辑
2. 引导用户按照正确流程使用系统
3. 优化用户体验和提示信息
4. 保持现有架构不变

### 设计理念
- **工作区驱动**：以工作区为中心的多租户架构
- **向导式创建**：通过引导流程创建产品
- **工作室模块化**：文案、视觉、视频独立工作室

---

## ✅ 执行状态（2026-01-02 20:36）

### 已完成的修改

#### 1. 修复向导跳转问题 ✅
**文件**: `frontend/src/app/wizard/step-2/page.tsx`
- 第 90 行：`router.push('/wizard/step-1')` → `router.push('/dashboard')`
- 第 128 行：`router.push('/wizard/step-1')` → `router.push('/dashboard')`
- **原因**: `/wizard/step-1` 页面不存在，Step 1 实际是 Dashboard 上的文件上传区域

#### 2. 创建 StudioCards 组件 ✅
**新文件**: `frontend/src/components/business/StudioCards.tsx`
- 客户端组件（'use client'）
- 包含三个工作室卡片：视觉、文案、视频
- 点击逻辑：检查工作区 → 滚动到上传区域 → 显示 Toast 提示
- 使用 `useWorkspace()` hook 获取当前工作区

#### 3. 更新 Dashboard 页面 ✅
**文件**: `frontend/src/app/dashboard/page.tsx`
- 导入并使用 `<StudioCards />` 组件
- 为文件上传区域添加 `id="file-upload-section"`
- 添加"开始创建"标题和说明文字

#### 4. 添加 Toaster 组件 ✅
**文件**: `frontend/src/app/dashboard/DashboardLayoutClient.tsx`
- 导入 `Toaster` from 'sonner'
- 添加 `<Toaster position="top-center" richColors />`
- **问题修复**: 之前 Toast 无法显示的根本原因

### 📋 已修改文件清单
1. `frontend/src/app/wizard/step-2/page.tsx` - 修复跳转路径
2. `frontend/src/components/business/StudioCards.tsx` - 新建
3. `frontend/src/app/dashboard/page.tsx` - 使用新组件
4. `frontend/src/app/dashboard/DashboardLayoutClient.tsx` - 添加 Toaster

---

## ⚠️ 待解决问题

### 问题：用户没有工作区导致功能无法使用

**现象**: 
- 点击 "AI 文案工作室" 卡片显示 "请先选择一个工作区"
- Dashboard Header 应该显示 "创建工作区 →" 链接（指向 `/onboarding`）

**根本原因**:
根据 `WorkspaceContext.tsx` (第 46-53 行)，系统会：
1. 登录后自动从 API 加载工作区列表
2. 如果有工作区，自动选择第一个
3. 如果没有工作区，`currentWorkspace` 为 `null`

**解决方案**:
用户需要**先创建工作区**才能使用系统功能：
1. 点击 Header 区域的 "创建工作区 →" 链接
2. 或直接访问 `/onboarding` 创建工作区
3. 创建后系统会自动选择该工作区

**验证步骤**（给下一个 agent）:
1. 访问 `/onboarding` 创建一个工作区
2. 返回 `/dashboard`
3. 点击 "AI 文案工作室" 卡片
4. **预期**: 显示 Toast 提示并滚动到文件上传区域
5. 上传测试图片（`image.png` - 手机支架）
6. **预期**: 跳转到 `/wizard/step-2` 选择品类

---

---

## 🔴 新问题发现：认证 Token 未传递（2026-01-02 更新）

### 用户报告的新问题

**现象**：
- 在 `http://localhost:3000/dashboard` 看到"加载工作区... loading: true, checked: false"
- 页面一直处于加载状态，无法继续
- 点击工作室卡片没有任何响应

**用户状态**：
- 新用户，还没有创建工作空间
- 后端服务状态不确定

---

## 🔍 深度问题分析

### 根本原因：NextAuth Session Callback 缺少 accessToken 传递

经过完整的代码分析，发现了真正的根本原因：

#### 1. JWT Callback ✅ 正确实现
**文件**: `frontend/src/auth.ts` 第96-105行

```typescript
async jwt({ token, user }) {
    if (user) {
        token.id = (user as { id?: string }).id
        token.email = (user as { email?: string }).email
        // ✅ 正确添加 accessToken
        token.accessToken = (user as { accessToken?: string }).accessToken
    }
    return token
}
```

#### 2. Session Callback ❌ **问题所在**
**文件**: `frontend/src/auth.ts` 第107-116行

```typescript
async session({ session, token }) {
    console.log('[NextAuth Callback] session called')
    if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        // ❌ 缺少：session.user.accessToken = token.accessToken
    }
    return session
}
```

#### 3. 问题链式反应

**WorkspaceContext.tsx** 第43行：
```typescript
const { workspaces: data } = await listWorkspaces(session.user.accessToken);
// session.user.accessToken 为 undefined
// ↓
// API 调用失败（401 认证错误）
// ↓
// 请求可能挂起（无超时机制）
// ↓
// loading: true 一直为 true
```

---

## 💡 完整修复方案

### 优先级 1：关键修复（必须完成）

#### 修复 1：更新 NextAuth Session Callback

**文件**: `frontend/src/auth.ts`
**位置**: 第107-116行
**修改**:

```typescript
async session({ session, token }) {
    console.log('[NextAuth Callback] session called')
    if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        // ✅ 添加此行
        session.user.accessToken = token.accessToken as string
    }
    console.log('[NextAuth Callback] Session created for user:', session.user?.email)
    return session
}
```

#### 修复 2：扩展 NextAuth 类型定义

**新建文件**: `frontend/src/types/next-auth.d.ts`
**内容**:

```typescript
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
    interface Session {
        user: {
            id: string
            email: string
            accessToken: string  // ✅ 添加此字段
        }
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string
        email: string
        accessToken: string  // ✅ 添加此字段
    }
}
```

### 优先级 2：稳定性增强（建议完成）

#### 增强 1：添加 fetch 超时机制

**新建文件**: `frontend/src/lib/api/fetchWithTimeout.ts`

```typescript
/**
 * 带超时的 fetch 包装器
 */
export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = 10000
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`请求超时（${timeout}ms）`);
        }
        throw error;
    }
}
```

#### 增强 2：更新 listWorkspaces 使用超时

**文件**: `frontend/src/lib/api/workspaces.ts`
**位置**: 第81-91行

```typescript
// 导入超时包装器
import { fetchWithTimeout } from './fetchWithTimeout';

export async function listWorkspaces(
    token: string,
    skip = 0,
    limit = 100
): Promise<{ workspaces: Workspace[]; total: number }> {
    const response = await fetchWithTimeout(
        buildUrl(`/workspaces/?skip=${skip}&limit=${limit}`),
        {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include',
        },
        10000  // 10 秒超时
    );
    // ... 其余代码不变
}
```

#### 增强 3：改进 WorkspaceContext 错误处理

**文件**: `frontend/src/components/workspace/WorkspaceContext.tsx`
**位置**: 第34-60行

**修改**:
```typescript
// 添加错误状态
const [error, setError] = useState<string | null>(null);

async function loadWorkspaces() {
    if (!session?.user?.accessToken) {
        console.error('[WorkspaceContext] No access token available');
        setError('无法获取认证令牌，请重新登录');
        setLoading(false);
        return;
    }

    try {
        console.log('[WorkspaceContext] Loading workspaces with token');
        const { workspaces: data } = await listWorkspaces(session.user.accessToken);
        setWorkspaces(data);
        console.log('[WorkspaceContext] Loaded', data.length, 'workspaces');

        if (data.length > 0 && !currentWorkspace) {
            const params = new URLSearchParams(window.location.search);
            const wsId = params.get('workspace');
            const found = wsId ? data.find(w => w.id === wsId) : null;
            setCurrentWorkspace(found || data[0]);
        }
        setError(null);
    } catch (err) {
        console.error('[WorkspaceContext] Failed to load workspaces:', err);
        if (err instanceof Error) {
            if (err.message.includes('timeout') || err.message.includes('超时')) {
                setError('服务器响应超时，请检查网络连接或稍后重试');
            } else if (err.message.includes('401')) {
                setError('认证失败，请重新登录');
            } else {
                setError('加载工作区失败：' + err.message);
            }
        } else {
            setError('加载工作区失败，请稍后重试');
        }
        setWorkspaces([]);
    } finally {
        setLoading(false);
    }
}

// 在 Context 中暴露 error
const value: WorkspaceContextType = {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    loading,
    error,  // ✅ 暴露错误状态
    refresh: loadWorkspaces,
};
```

**同时更新类型定义**:
```typescript
interface WorkspaceContextType {
    workspaces: Workspace[];
    currentWorkspace: Workspace | null;
    setCurrentWorkspace: (workspace: Workspace | null) => void;
    loading: boolean;
    error: string | null;  // ✅ 添加此字段
    refresh: () => Promise<void>;
}
```

#### 增强 4：优化 WorkspaceGuard 降级方案

**文件**: `frontend/src/app/dashboard/DashboardLayoutClient.tsx`
**位置**: 第19-58行

```typescript
function WorkspaceGuard({ children }: { children: ReactNode }) {
    const { workspaces, loading, error, refresh } = useWorkspace();
    const router = useRouter();
    const [checked, setChecked] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        if (!loading) {
            if (error) {
                console.log('[WorkspaceGuard] Error detected:', error);
                setChecked(true);
            } else if (workspaces.length === 0) {
                console.log('[WorkspaceGuard] No workspaces, redirecting to onboarding');
                router.replace('/onboarding');
            } else {
                console.log('[WorkspaceGuard] Workspaces found');
                setChecked(true);
            }
        }
    }, [loading, workspaces, error, router]);

    // 加载中状态
    if (loading || (!checked && !error)) {
        return (
            <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-neutral-400">加载工作区...</span>
                </div>
            </div>
        );
    }

    // ✅ 错误状态显示
    if (error && !loading) {
        return (
            <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-neutral-800/50 rounded-2xl p-8 border border-neutral-700">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white mb-2">加载失败</h2>
                        <p className="text-neutral-400">{error}</p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                setRetryCount(prev => prev + 1);
                                refresh();
                            }}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                        >
                            重试
                        </button>

                        <button
                            onClick={() => router.push('/api/auth/signout')}
                            className="w-full py-3 px-4 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg"
                        >
                            重新登录
                        </button>

                        {error.includes('超时') && (
                            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
                                <p className="font-medium mb-1">提示：</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li>请检查后端服务是否运行（端口 8000）</li>
                                    <li>检查网络连接</li>
                                    <li>查看浏览器控制台错误信息</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
```

---

## 📋 更新的实施检查清单

### 必须完成（关键修复）
- [ ] 修改 `frontend/src/auth.ts` - Session Callback 添加 accessToken
- [ ] 新建 `frontend/src/types/next-auth.d.ts` - NextAuth 类型扩展

### 建议完成（稳定性增强）
- [ ] 新建 `frontend/src/lib/api/fetchWithTimeout.ts` - 超时包装器
- [ ] 修改 `frontend/src/lib/api/workspaces.ts` - 使用超时包装器
- [ ] 修改 `frontend/src/components/workspace/WorkspaceContext.tsx` - 改进错误处理
- [ ] 修改 `frontend/src/app/dashboard/DashboardLayoutClient.tsx` - 添加降级方案

---

## 🧪 完整测试验证流程

### 测试步骤 1：修复认证问题
1. 完成优先级 1 的两个修改
2. 重启前端服务：`npm run dev`
3. 清除浏览器缓存和 Local Storage
4. 重新登录

### 测试步骤 2：验证工作区加载
1. 访问 `http://localhost:3000/dashboard`
2. 打开浏览器开发者工具 → Console
3. **预期看到**：
   - `[NextAuth Callback] Session created for user: xxx@xxx.com`
   - `[WorkspaceContext] Loading workspaces with token`
   - `[WorkspaceGuard] No workspaces, redirecting to onboarding`

### 测试步骤 3：测试完整流程
1. 创建工作空间（通过 onboarding）
2. 返回 Dashboard
3. 点击任意工作室卡片
4. **预期**：滚动到文件上传区域并显示提示

### 测试步骤 4：测试错误处理
1. 停止后端服务
2. 刷新 Dashboard
3. **预期**：显示友好的错误提示和重试按钮
4. 重启后端服务
5. 点击"重试"按钮
6. **预期**：成功加载工作区

---

## 📁 完整文件清单

### 需要修改的文件

| 文件路径 | 修改内容 | 优先级 | 状态 |
|---------|---------|--------|------|
| `frontend/src/auth.ts` | Session Callback 添加 accessToken | 🔴 最高 | 待修改 |
| `frontend/src/lib/api/workspaces.ts` | 使用超时包装器 | 🟡 高 | 待修改 |
| `frontend/src/components/workspace/WorkspaceContext.tsx` | 改进错误处理 | 🟡 高 | 待修改 |
| `frontend/src/app/dashboard/DashboardLayoutClient.tsx` | 添加降级方案 | 🟡 高 | 待修改 |

### 需要新建的文件

| 文件路径 | 用途 | 优先级 | 状态 |
|---------|------|--------|------|
| `frontend/src/types/next-auth.d.ts` | NextAuth 类型扩展 | 🔴 最高 | 待创建 |
| `frontend/src/lib/api/fetchWithTimeout.ts` | 超时包装器 | 🟡 高 | 待创建 |

### 已完成的文件（来自之前的修复）

| 文件路径 | 说明 | 状态 |
|---------|------|------|
| `frontend/src/components/business/StudioCards.tsx` | 工作室卡片组件 | ✅ 已完成 |
| `frontend/src/app/dashboard/page.tsx` | Dashboard 主页面 | ✅ 已完成 |
| `frontend/src/app/dashboard/DashboardLayoutClient.tsx` | Toaster 已添加 | ✅ 部分完成 |
| `frontend/src/app/wizard/step-2/page.tsx` | 修复跳转路径 | ✅ 已完成 |

---

## 🎯 预期修复效果

修复完成后：

1. **✅ 认证正常工作**
   - accessToken 正确传递到 session
   - API 调用携带有效的认证令牌

2. **✅ 工作区正常加载**
   - 不再无限期 loading
   - 正确显示工作区列表或引导创建

3. **✅ 工作室卡片可点击**
   - 点击后滚动到文件上传区域
   - 显示友好的引导提示

4. **✅ 错误处理友好**
   - 超时后显示提示
   - 提供重试和重新登录选项
   - 不会导致页面完全无响应

---

## 📝 问题说明

### 为什么会出现这个问题？

NextAuth 的认证流程分为两个阶段：

1. **JWT Callback** - 将用户信息编码到 JWT token
2. **Session Callback** - 将 JWT 信息传递给客户端 session

当前的实现只在 JWT 中保存了 accessToken，但没有传递到 session，导致客户端无法访问这个 token，所有需要认证的 API 调用都失败（401 错误）。

### 快速修复指南

如果时间有限，只需完成优先级 1 的两个修改即可解决核心问题：
1. 修改 `frontend/src/auth.ts` - 添加一行代码
2. 新建 `frontend/src/types/next-auth.d.ts` - 添加类型定义

完成这两个修改后，重启前端服务，问题应该就能解决！

---

**最终更新时间**: 2026-01-02 21:15
**问题严重程度**: 🔴 高（阻塞核心功能）
**预计修复时间**: 15-30 分钟（完成所有修复）或 5 分钟（仅关键修复）
**下一步**: 开始实施修复，从优先级 1 开始
