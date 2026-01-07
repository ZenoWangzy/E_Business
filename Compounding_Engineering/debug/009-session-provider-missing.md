# SessionProvider缺失导致useSession报错

**问题**: 页面崩并在Console报错 `[next-auth]: useSession must be wrapped in a <SessionProvider />`
**影响**: 导致使用了 `useSession()` hook 的页面（如 `/wizard` 相关页面）无法加载，全屏红屏报错。

## ❌ 错误代码

```tsx
// 文件: frontend/src/app/wizard/step-2/page.tsx
'use client';
import { useSession } from 'next-auth/react';

// 错误原因：该页面所在的目录没有layout.tsx提供SessionProvider
export default function Page() {
    const { data: session } = useSession(); // 💥 这里会抛出异常
    // ...
}
```

## ✅ 正确代码

```tsx
// 文件: frontend/src/app/wizard/layout.tsx
// 修复方案：在对应目录创建layout.tsx并包裹SessionProvider
'use client';
import { SessionProvider } from 'next-auth/react';

export default function WizardLayout({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            {children}
        </SessionProvider>
    );
}
```

## 💡 核心要点

- **Provider依然必需**: 即使在Next.js App Router中，`useSession` 仍然依赖 React Context，必须有 `SessionProvider` 包裹。
- **Layout层级**: 确保 `SessionProvider` 位于使用 `useSession` 的组件的上层 Layout 中。
- **目录隔离**: 如果新建了路由目录（如 `wizard/`）且该目录没有继承根布局的 Provider（或者根布局没加 Provider），需要单独添加 Layout。

## 📚 相关

- [nextauth-integration](../authentication/nextauth-integration.md)
