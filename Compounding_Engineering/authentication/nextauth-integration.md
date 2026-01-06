# NextAuth v5 集成实践

## ✅ 推荐模式

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
            {children}
        </SessionProvider>
    );
}
```

## ❌ 反模式

```typescript
// ❌ 不要使用 - 干扰默认Session创建和重定向
callbacks: {
    async authorized({ auth }) {
        return !!auth;
    },
}

// ❌ 不要自定义 - 默认JWE加密已足够
jwt: {
    encode: async (params) => { /* ... */ },
    decode: async (params) => { /* ... */ },
}
```

## 💡 核心原则

- **最小化配置**: NextAuth默认行为已经很好，避免过度自定义
- **SessionProvider**: 必须包裹才能使用 `useSession()`
- **Token传递**: 从 `session.user.accessToken` 获取token传给API

## 📚 相关

- [002-nextauth-session](../debug/002-nextauth-session-persistence.md)
- [003-workspace-auth](../debug/003-workspace-auth-failure.md)
