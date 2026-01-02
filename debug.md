# E_Business 调试案例

## 案例1: 注册功能500错误 (2026-01-02)

### Bug位置
**文件**: `/backend/app/models/user.py`

### 错误原理

```
ORM层: DateTime (不带timezone=True)
    ↓
数据库: timestamp without time zone
    ↓
Python代码: datetime.now(timezone.utc) 返回时区感知对象
    ↓
PostgreSQL: 拒绝插入时区感知数据到时区无关列
    ↓
结果: 500 Internal Server Error
```

**核心矛盾**: Python生成时区感知时间，但数据库列是时区无关类型

### 修复原理

```
ORM层: DateTime(timezone=True) ← 明确声明时区支持
    ↓
数据库: timestamp with time zone
    ↓
Python代码: datetime.now(timezone.utc) 时区感知对象
    ↓
PostgreSQL: 类型匹配，允许插入
    ↓
结果: ✅ 成功
```

### 数据库配合修复

```sql
-- users表
ALTER TABLE users
  ALTER COLUMN created_at TYPE timestamp with time zone,
  ALTER COLUMN updated_at TYPE timestamp with time zone;

-- workspaces表
ALTER TABLE workspaces
  ALTER COLUMN created_at TYPE timestamp with time zone,
  ALTER COLUMN updated_at TYPE timestamp with time zone;
```

### 经验总结

**原则**: ORM定义 + Python代码 + 数据库类型 三者必须一致

| 层级 | 错误写法 | 正确写法 |
|------|----------|----------|
| ORM | `DateTime` | `DateTime(timezone=True)` |
| Python | `datetime.now()` | `datetime.now(timezone.utc)` |
| 数据库 | `timestamp without time zone` | `timestamp with time zone` |

---

## 案例2: NextAuth登录Session持久化问题 (2026-01-02)

### Bug位置
**文件**: 
- `/frontend/src/auth.ts`
- `/frontend/src/app/dashboard/DashboardLayoutClient.tsx`
- `/frontend/src/components/workspace/WorkspaceContext.tsx`
- `/frontend/src/lib/api/workspaces.ts`

### 错误原理

```
问题1: Session无法持久化
NextAuth authorize成功 (200) 
    ↓
自定义authorized callback 干扰
    ↓
Session未创建
    ↓
重定向到错误URL (/login而非/dashboard)

问题2: API返回401
客户端组件调用API
    ↓
没有SessionProvider包裹
    ↓
useSession() 无法获取token
    ↓
API请求无Authorization header
    ↓
后端返回401 Unauthorized
```

**核心矛盾**: 
1. 过度自定义 NextAuth callback 干扰默认行为
2. 客户端组件缺少 SessionProvider
3. API 请求未传递 Bearer token

### 修复原理

```
修复1: 简化NextAuth配置
移除authorized callback
    ↓
移除自定义jwt.encode/decode
    ↓
使用默认Session创建流程
    ↓
✅ Session成功创建并重定向

修复2: 添加SessionProvider + Token传递
DashboardLayoutClient包裹SessionProvider
    ↓
WorkspaceContext使用useSession()获取token
    ↓
listWorkspaces(token)添加Authorization header
    ↓
✅ API认证成功
```

### 关键代码修复

**1. 简化 auth.ts**
```typescript
// ❌ 移除干扰的callback
callbacks: {
    async jwt({ token, user, account }) { ... },
    async session({ session, token }) { ... },
    // ❌ 移除这个 - authorized callback会干扰重定向
    // async authorized({ auth, request }) { ... }
},
// ❌ 移除自定义JWT编码
// jwt: { encode: ..., decode: ... }
```

**2. 添加 SessionProvider**
```typescript
// DashboardLayoutClient.tsx
export default function DashboardLayoutClient({ ... }) {
    return (
        <SessionProvider>
            <WorkspaceProvider>
                {/* ... */}
            </WorkspaceProvider>
        </SessionProvider>
    );
}
```

**3. Token传递机制**
```typescript
// WorkspaceContext.tsx
const { data: session, status } = useSession();

useEffect(() => {
    if (status === 'authenticated' && session?.user?.accessToken) {
        loadWorkspaces();
    }
}, [status, session]);

async function loadWorkspaces() {
    const { workspaces: data } = await listWorkspaces(session.user.accessToken);
    // ...
}

// workspaces.ts
export async function listWorkspaces(token: string, ...): Promise<...> {
    const response = await fetch(buildUrl(`/workspaces/?...`), {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
    });
}
```

### 经验总结

**原则**: NextAuth配置简单化 + 客户端Provider完整性 + API认证链路完整

| 层级 | 错误写法 | 正确写法 |
|------|----------|----------|
| NextAuth | 自定义`authorized` callback | 移除，使用默认行为 |
| NextAuth | 自定义`jwt.encode/decode` | 移除，使用默认JWE |
| 客户端 | 直接使用`useSession()` | 包裹在`<SessionProvider>` |
| API调用 | `credentials: 'include'` only | 添加`Authorization: Bearer ${token}` |

**调试技巧**:
1. 检查浏览器控制台 Network tab 的响应状态码
2. 查看 NextAuth callback 日志判断哪个环节失败
3. 验证 `session.user.accessToken` 是否存在
4. 确认所有使用 `useSession()` 的组件都在 `SessionProvider` 内