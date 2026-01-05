# 工作区创建认证失败

**问题**: 前端创建工作区返回401 "Could not validate credentials"
**影响**: Onboarding流程中无法创建工作区

## ❌ 错误代码

```typescript
// 文件: frontend/src/lib/api/workspaces.ts
export async function createWorkspace(data: WorkspaceCreateInput) {
    const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // ❌ 缺少Authorization header
        },
        credentials: 'include', // ❌ 跨域请求不自动携带Cookie
        body: JSON.stringify(data),
    });
}
```

```python
# 文件: backend/app/api/deps_auth.py
from fastapi import Cookie, Depends

async def get_current_user(
    session_token: str | None = Cookie(None), # ❌ 只读取Cookie
):
    if session_token is None:
        raise HTTPException(status_code=401)
    # 只验证Cookie中的token
```

## ✅ 正确代码

```typescript
// 文件: frontend/src/lib/api/workspaces.ts
export async function createWorkspace(
    data: WorkspaceCreateInput,
    token: string // ✅ 添加token参数
) {
    const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, // ✅ 添加Bearer token
        },
        credentials: 'include', // ✅ 保留作为fallback
        body: JSON.stringify(data),
    });
}
```

```typescript
// 文件: frontend/src/app/onboarding/page.tsx
const { data: session } = useSession();

const handleCreateWorkspace = async () => {
    await createWorkspace(workspaceData, session.user.accessToken); // ✅ 传递token
};
```

```python
# 文件: backend/app/api/deps_auth.py
from fastapi import Cookie, Header, HTTPException

async def get_current_user(
    authorization: str | None = Header(default=None), # ✅ 读取Header
    session_token: str | None = Cookie(default=None), # ✅ 保留Cookie
):
    # 优先级: Header > Cookie
    token = None

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:] # 移除 "Bearer " 前缀
    elif session_token:
        token = session_token

    if token is None:
        raise HTTPException(status_code=401)

    # 验证token并返回用户
```

## 💡 核心要点

- **完整认证链路**: 前端获取token → 传递token → 后端验证token
- 前端API **必须** 传递 `Authorization: Bearer ${token}`
- 后端 **同时支持** Header和Cookie认证，优先Header
- DateTime时区问题参见 [001-datetime-timezone](./001-datetime-timezone-orm.md)

## 📚 相关

- [002-nextauth-session](./002-nextauth-session-persistence.md) - Token获取
- [cookie-vs-header-auth](../authentication/cookie-vs-header-auth.md)
