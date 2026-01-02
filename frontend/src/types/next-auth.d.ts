/**
 * [IDENTITY]: NextAuth 类型扩展
 * 扩展 NextAuth 的 Session 和 JWT 类型，添加 accessToken 字段
 * 
 * [INPUT]: 无（类型定义文件）
 * 
 * [LINK]:
 *   - Auth Config -> ../auth.ts
 *   - WorkspaceContext -> ../components/workspace/WorkspaceContext.tsx
 * 
 * [OUTPUT]: 扩展的 Session 和 JWT 类型定义
 * [POS]: /frontend/src/types/next-auth.d.ts
 * 
 * [PROTOCOL]:
 *   1. 使用 TypeScript 模块扩展语法
 *   2. 确保 accessToken 在客户端可访问
 */

import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
    interface User {
        id: string
        email: string
        accessToken: string
    }

    interface Session {
        user: {
            id: string
            email: string
            accessToken: string
        }
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string
        email: string
        accessToken: string
    }
}
