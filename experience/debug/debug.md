# E_Business 调试案例
测试帐号：test@example.com 
测试密码：Password123!

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

---

## 案例3: 工作区创建认证失败 (2026-01-02)

### Bug位置
**文件**: 
- `/frontend/src/lib/api/workspaces.ts`
- `/frontend/src/app/onboarding/page.tsx`
- `/backend/app/api/deps_auth.py`
- `/backend/app/models/audit.py`, `user.py`, `asset.py`

### 错误原理

```
问题1: 前端未传Token
createWorkspace() 只用 credentials: 'include'
    ↓
后端 get_current_user 只接受Cookie
    ↓
前端fetch不自动带Cookie到跨域请求
    ↓
401 "Could not validate credentials"

问题2: 后端不支持Header认证
deps_auth.py 只读取Cookie
    ↓
不读取 Authorization: Bearer header
    ↓
即使前端传了token也无法认证

问题3: 时区不匹配
模型定义: DateTime (无timezone)
    ↓
Python代码: datetime.now(timezone.utc)
    ↓
PostgreSQL: 拒绝混合时区数据
```

### 修复原理

```
修复1: 前端传递Token
createWorkspace(data, token) 添加token参数
    ↓
headers: { Authorization: `Bearer ${token}` }
    ↓
onboarding页面从useSession获取token

修复2: 后端支持Header认证
deps_auth.py 添加 authorization: Header()
    ↓
优先级: Header > Secure Cookie > Cookie
    ↓
✅ 支持两种认证方式

修复3: 统一时区处理
DateTime字段用 datetime.utcnow()
    ↓
匹配数据库 timestamp without time zone
```

### 关键代码修复

**1. 前端传递Token**
```typescript
// workspaces.ts
export async function createWorkspace(data, token: string) {
    return fetch(url, {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    });
}

// onboarding/page.tsx
const { data: session } = useSession();
await createWorkspace(data, session.user.accessToken);
```

**2. 后端支持Header**
```python
# deps_auth.py
async def get_current_user(
    authorization: str | None = Header(default=None),
    session_token: str | None = Cookie(...),
):
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    else:
        token = session_token
```

**3. 时区一致性**
```python
# ❌ 错误
DateTime, default=lambda: datetime.now(timezone.utc)

# ✅ 正确
DateTime, default=lambda: datetime.utcnow()
```

### 经验总结

| 层级 | 错误写法 | 正确写法 |
|------|----------|----------|
| 前端API | `credentials: 'include'` only | 添加 `Authorization: Bearer` |
| 后端认证 | 只接受Cookie | 同时接受Header和Cookie |
| DateTime | `datetime.now(timezone.utc)` | `datetime.utcnow()` (无时区列) |