# 速率限制 (Rate Limiting)

## ✅ 推荐模式

### 1. 分层配置策略
```python
# backend/app/services/rate_limiter.py
RATE_LIMITS = {
    "invite_create": {"max_requests": 10, "window_seconds": 3600},
    "upload": {"max_requests": 20, "window_seconds": 60},
    "generate": {"max_requests": 10, "window_seconds": 60},
    "api_generic": {"max_requests": 100, "window_seconds": 60},
}
```

### 2. FastAPI 依赖注入
```python
# backend/app/api/deps/rate_limit.py
async def rate_limit_upload(current_user: CurrentUser):
    config = RATE_LIMITS["upload"]
    key = f"ratelimit:upload:user:{current_user.id}"
    is_limited, _ = await rate_limiter.is_rate_limited(key, config["max_requests"], config["window_seconds"])
    if is_limited:
        raise RateLimitExceededException(...)

# 在路由中使用
@router.post("/upload", dependencies=[Depends(rate_limit_upload)])
```

### 3. Redis 滑动窗口 (Sliding Window) 算法
使用 Redis ZSET 实现精确的滑动窗口，而非简单的计数器，防止临界突发流量。

## ❌ 反模式

```python
# 硬编码限制逻辑
if request_count > 10:
    return 429

# 仅使用进程内内存（无法水平扩展）
request_counts = {} 
```

## 💡 核心原则

- **细粒度控制**: 针对不同 Endpoint 类型（如 上传 vs 查询）设置不同的配额。
- **分布式状态**: 必须使用 Redis 等外部存储，确保多实例部署下的限制准确性。
- **用户隔离**: 限制 Key 应包含 User ID 或 Workspace ID (Tenant Isolation)。
- **客户端友好**: 返回 `Retry-After` Header，告知客户端何时重试。
