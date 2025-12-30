# 修复 localhost:3000/login 登录页面错误

## 📋 问题概述

**症状**: 访问 `http://localhost:3000/login` 时，Next.js 构建失败并显示错误对话框

**根本原因**: `login-form.tsx` 组件使用了 React Hooks（`useState`, `useRouter`），但缺少 `"use client"` 指令，导致被 Server Component 导入时报错。

## 🔍 错误详情

### 控制台错误信息
```
You're importing a component that needs `useState`. This React Hook only works in a Client Component.
To fix, mark the file (or its parent) with the `"use client"` directive.

Import trace:
  Server Component:
    ./src/components/auth/login-form.tsx
    ./src/app/(auth)/login/page.tsx
```

### 问题文件
**路径**: `frontend/src/components/auth/login-form.tsx`

### 使用的 React Hooks
- `useState` (第21行) - 管理表单状态
- `useRouter` (第23行) - 处理登录后路由跳转

## ✅ 解决方案

### 修改内容
在 `login-form.tsx` 文件顶部（文档注释之后，import 之前）添加 `"use client";` 指令

### 具体步骤
1. 打开文件：`frontend/src/components/auth/login-form.tsx`
2. 在第20行（`*/` 结束注释后）和第21行（`import { useState }` 之前）插入：
   ```typescript
   "use client";
   ```

### 修改后的文件结构
```typescript
/**
[IDENTITY]: Login Form Component
...
[PROTOCOL]:
3. ** Routing **: Redirect to `/dashboard` on success.
 */
"use client";  // <-- 添加这一行
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
...
```

## 📁 需要修改的文件

- `frontend/src/components/auth/login-form.tsx` - 添加 `"use client";` 指令

## 🔎 验证步骤

1. **保存修改后**，刷新浏览器页面 `http://localhost:3000/login`
2. **检查**控制台无错误
3. **验证**登录表单正常显示
4. **测试**登录功能（可选）

## 💡 技术说明

### 为什么需要 "use client"？
- Next.js 13+ App Router 默认所有组件都是 **Server Components**
- React Hooks（`useState`, `useRouter`, `useEffect` 等）只能在 **Client Components** 中使用
- `"use client"` 指令告诉 Next.js 将该组件及其子组件渲染在客户端

### 最佳实践
- 仅在真正需要客户端交互（状态、事件处理器、浏览器API）的组件上使用 `"use client"`
- 将客户端组件尽可能下移到组件树的叶子节点，以优化性能

## ⏱️ 预计工作量
- **修改时间**: < 1分钟
- **验证时间**: ~1分钟
- **总计**: ~2分钟
