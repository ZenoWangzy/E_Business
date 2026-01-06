# 案例 008: Dashboard 跳转 AI Studio 重定向循环

## 1. 问题描述
用户在 Dashboard 上传文件后，点击 "AI 文案工作室" 卡片，页面跳转至 `/wizard/step-2` 后立即被重定向回 `/dashboard`，导致用户无法进入产品创建流程。即使文件显示已上传成功，点击依然无效。

**现象**:
- **用户行为**: 上传文件 -> 点击卡片 -> 路由跳转 -> 瞬间跳回。
- **控制台**: 无报错，但网络请求里可能看到页面重定向。

## 2. 根本原因 (Root Cause)

### 2.1 前端: ID 格式不一致 (UUID Validation Failure)
前端为了快速响应，在文件拖入时立即生成了一个临时 ID (格式如 `1767641725721-4gg16ag3d`)。
- **错误逻辑**: 上传成功后，代码直接使用这个**临时 ID** 更新了全局 Store (`wizardStore`)。
- **校验逻辑**: `/wizard/step-2` 页面由 `useEffect` 触发严格校验 `isUuid(assetId)`。
- **冲突**: 临时 ID 不符合 UUID 格式，校验失败，触发 `router.push('/dashboard')` 兜底跳转。

### 2.2 前端: 状态同步竞态 (State Hydration Race Condition)
即使 ID 格式正确，仅通过 Store 传递上下文也存在风险。
- **Hydration Lag**: Zustand 的 `persist` 中间件从 `localStorage` 恢复数据是异步的（或有微小延迟）。
- **页面加载**: Next.js 页面组件加载速度可能快于 Store Hydration。
- **结果**: 页面初始化检查 `currentWorkspaceId` 时，Store 可能通过初始值返回 `null`，导致“缺失工作区”校验失败而重定向。

## 3. 解决方案 (Resolution)

### 3.1 强制使用后端 UUID
绝不信任前端生成的 ID 用于业务逻辑。必须等待上传接口返回真实的 UUID。

```typescript
// frontend/src/components/business/SmartDropzone.tsx
const processFile = async (file: File) => {
    // ...
    // 1. 等待上传完成，获取后端响应
    const uploadResponse = await uploadWithRetry(file);
    
    // 2. 使用后端返回的真实 UUID 构造对象
    const completedFile: ParsedFile = {
        ...parsedFile,
        id: uploadResponse.id, // ✅ CRITICAL: 使用后端 ID
        status: 'completed',
        // ...
    };
    
    // 3. 更新状态
    onUploadComplete(completedFile);
}
```

### 3.2 URL 参数作为单一事实来源 (Source of Truth)
页面跳转时，显式将关键上下文 ID 放入 URL Query String。

```typescript
// frontend/src/components/business/StudioCards.tsx

// ❌ 避免: 仅依赖 Store
// setCurrentStep(2);
// router.push('/wizard/step-2');

// ✅ 推荐: URL 携带参数，确保接收页能立即获取上下文
router.push(`/wizard/step-2?assetId=${currentAssetId}&workspaceId=${currentWorkspace.id}`);
```

## 4. 最佳实践 (Lessons Learned)

1.  **ID 权威性 (ID Authority)**: 前端生成的 ID 仅限于列表渲染的 `key` 或临时 UI 状态。凡是涉及路由跳转、后端交互、跨页面传递的 ID，**必须**使用后端返回的 UUID。
2.  **URL 是最好的状态管理器**: 对于页面间的关键上下文传递（特别是从列表页到详情页/向导页），**URL Query Params** 优于全局 Store。它解决了刷新丢失、Hydration 延迟等问题，并支持链接分享。
3.  **Fail Fast 校验**: 严格的校验函数（如 `isUuid`）虽然导致了重定向（Bug 现象），但它成功阻止了非法数据污染后续流程。**不要移除校验**，而应修复产生非法数据的源头。
4.  **Client Directive**: 对于使用了 React Hooks (`useEffect`, `useState`, `useRef`) 的组件或工具 Hook，务必在文件顶部添加 `'use client'`，否则会导致构建失败。
