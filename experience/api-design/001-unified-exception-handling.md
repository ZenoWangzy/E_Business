# 统一异常处理 (Unified Exception Handling)

## ✅ 推荐模式

### 1. 定义业务异常基类
```python
# backend/app/core/exceptions.py
class EBusinessException(Exception):
    """Base exception for all business logic errors."""
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        http_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: dict[str, Any] | None = None
    ):
        self.message = message
        self.code = code
        self.http_status = http_status
        self.details = details or {}
        super().__init__(self.message)
```

### 2. 全局异常处理器
```python
# backend/app/api/middleware/error_handler.py
async def ebusiness_exception_handler(request: Request, exc: EBusinessException):
    """Handle defined business exceptions globally."""
    return JSONResponse(
        status_code=exc.http_status,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "request_id": request.state.request_id  # Link to tracing
            }
        }
    )
```

## ❌ 反模式

```python
# 直接抛出 HTTPException，导致错误码分散且缺乏结构化
@router.get("/items/{item_id}")
async def read_item(item_id: str):
    if item_id not in items:
        raise HTTPException(status_code=404, detail="Item not found")

# 在每个端点手动 try/except
@router.post("/items/")
async def create_item(item: Item):
    try:
        # business logic
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
```

## 💡 核心原则

- **统一基类**: 所有自定义异常继承自同一基类，便于统一捕获和处理。
- **结构化响应**: 定义标准的错误响应格式（code, message, details, request_id），方便前端统一解析。
- **集中处理**: 在 `main.py` 中注册全局异常处理器，保持业务逻辑代码清晰。
- **可观测性**: 在异常响应中包含 request_id，方便日志追踪。
