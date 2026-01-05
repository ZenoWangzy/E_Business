# Cookie vs Header认证

## ✅ 推荐模式

**同时支持两种方式** - 优先Header，Cookie作为fallback

```python
# 文件: backend/app/api/deps_auth.py
async def get_current_user(
    authorization: str | None = Header(None),  # ✅ 读取Header
    session_token: str | None = Cookie(None),   # ✅ 保留Cookie
):
    # 优先级: Header > Cookie
    token = None

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]  # 移除 "Bearer " 前缀
    elif session_token:
        token = session_token

    if token is None:
        raise HTTPException(status_code=401)

    return await verify_token(token)
```

```typescript
// 文件: frontend/src/lib/api/workspaces.ts
export async function createWorkspace(data, token) {
    return fetch('/api/workspaces/', {
        headers: {
            'Authorization': `Bearer ${token}`, // ✅ 使用Header
        },
        credentials: 'include', // ✅ Cookie作为fallback
    });
}
```

## ❌ 反模式

```typescript
// ❌ 只依赖Cookie - 跨域请求可能失败
fetch('/api/workspaces/', {
    credentials: 'include',
});

// ❌ localStorage存储token - XSS风险
localStorage.setItem('token', token);

// ❌ URL传递token - 泄露风险
fetch('/api/user?token=xxx');
```

## 💡 核心原则

- **跨域请求**: Header认证更简单，只需配置CORS
- **移动端友好**: Header认证更易实现
- **CSRF防护**: Header认证天然免疫
- **XSS防护**: Cookie + HttpOnly更安全
- **推荐**: 同时支持，优先Header

## 📚 相关

- [003-workspace-auth](../debug/003-workspace-auth-failure.md)
- [nextauth-integration](./nextauth-integration.md)
