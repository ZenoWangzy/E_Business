# 请求追踪 (Request ID Tracing)

## ✅ 推荐模式

### 1. 中间件生成和绑定 Request ID
```python
# backend/app/api/middleware/request_id.py
import uuid
import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. 获取或生成 Request ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        
        # 2. 绑定到 Request State (供后续使用)
        request.state.request_id = request_id
        
        # 3. 绑定到 Structlog 上下文 (自动注入日志)
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        
        # 4. 执行请求
        response = await call_next(request)
        
        # 5. 返回 Header
        response.headers["X-Request-ID"] = request_id
        return response
```

### 2. 主应用注册
```python
# backend/app/main.py
app.add_middleware(RequestIDMiddleware)
```

## ❌ 反模式

```python
# 仅在日志中手动打印 ID，未贯穿全链路
def log_request(request_id, msg):
    logger.info(f"[{request_id}] {msg}")

# 依赖不可靠的传递方式（如函数参数层层传递）
async def business_logic(user, data, request_id): 
    # ...
```

## 💡 核心原则

- **全链路唯一**: 每个请求生成唯一 ID，并在服务间透传（如 Header `X-Request-ID`）。
- **自动化绑定**: 使用 Context Variables (如 `structlog.contextvars`) 自动将 ID 注入所有日志，无需手动传参。
- **前端可见**: 将 ID 返回给前端（Response Header），方便用户反馈问题时提供定位依据。
- **清理上下文**: 异步框架中要注意清理上下文变量，防止污染后续请求。
