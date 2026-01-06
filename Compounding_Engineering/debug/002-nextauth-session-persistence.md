# NextAuth Session持久化问题

**问题**: 登录成功但Session无法创建，API返回401
**影响**: 用户登录后立即重定向到 `/login`

## ❌ 错误代码

```typescript
// 文件: frontend/src/auth.ts
export const { handlers, auth } = NextAuth({
    providers: [CredentialsProvider],
    callbacks: {
        // ❌ 移除 - 干扰默认Session创建
        async authorized({ auth }) {
            return !!auth;
        },
    },
    // ❌ 移除自定义JWT编码
    jwt: { encode, decode },
});
```

```typescript
// 文件: frontend/src/app/dashboard/DashboardLayoutClient.tsx
export default function DashboardLayoutClient({ children }) {
    return (
        <WorkspaceProvider>
            {/* ❌ 缺少SessionProvider */}
            {children}
        </WorkspaceProvider>
    );
}
```

```typescript
// 文件: frontend/src/lib/api/workspaces.ts
export async function listWorkspaces() {
    const response = await fetch('/api/workspaces', {
        headers: {
            'Content-Type': 'application/json',
            // ❌ 缺少Authorization header
        },
    });
}
```

## ✅ 正确代码

```typescript
// 文件: frontend/src/auth.ts
export const { handlers, auth } = NextAuth({
    providers: [CredentialsProvider],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.user = user;
                token.accessToken = user.access_token;
            }
            return token;
        },
        async session({ session, token }) {
            session.user = token.user;
            session.user.accessToken = token.accessToken;
            return session;
        },
    },
    // ✅ 使用默认行为，不自定义authorized/jwt.encode/decode
});
```

```typescript
// 文件: frontend/src/app/dashboard/DashboardLayoutClient.tsx
import { SessionProvider } from "next-auth/react";

export default function DashboardLayoutClient({ children }) {
    return (
        <SessionProvider>
            <WorkspaceProvider>
                {children}
            </WorkspaceProvider>
        </SessionProvider>
    );
}
```

```typescript
// 文件: frontend/src/lib/api/workspaces.ts
export async function listWorkspaces(token: string) {
    const response = await fetch('/api/workspaces', {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, // ✅ 添加Bearer token
        },
    });
}
```

## 💡 核心要点

- NextAuth配置 **简单化** - 移除 `authorized` callback
- 客户端组件 **必须** 包裹在 `<SessionProvider>` 内
- API调用 **必须** 传递 `Authorization: Bearer ${token}`

## 📚 相关

- [003-workspace-auth](./003-workspace-auth-failure.md) - 后端认证链路
- [nextauth-integration](../authentication/nextauth-integration.md)
