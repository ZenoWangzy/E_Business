---
project_name: 'E_Business'
user_name: 'ZenoWang'
date: '2025-12-19'
sections_completed: ['technology_stack', 'critical_rules', 'testing', 'workflow', 'framework_patterns', 'error_handling', 'anti_patterns']
existing_patterns_found: 11
status: 'updated'
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Frontend**: Next.js 14+ (App Router), Tailwind CSS, shadcn/ui
- **Backend**: FastAPI (Python), Celery 5.6, SQLAlchemy (Async), Pydantic
- **Database**: PostgreSQL (Docker), Redis (Docker)
- **Storage**: MinIO (Docker, S3 Compatible)
- **Auth**: NextAuth.js v5 (Beta) / Auth.js

## Critical Implementation Rules

### 1. Naming & Case Convention (Strict)
- **Frontend (TS)**: MUST use `camelCase` for all variables and properties.
- **Backend (Python)**: MUST use `snake_case` for all variables and DB fields.
- **API Boundary**: Backend Pydantic models MUST configure `alias_generator` to output `camelCase` JSON. Frontend MUST NOT manually convert case.

### 2. Type Safety
- **Single Source of Truth**: Frontend TypeScript types MUST be generated from Backend OpenAPI spec (`npm run gen:api`).
- **Do NOT** manually write TypeScript interfaces that duplicate Python Pydantic models.

### 3. API Response Format
- **Flat Response**: API returns `{ ...data }` directly, NOT `{ data: { ... } }`.
- **Errors**: Return `{ detail: "message" }`. Use HTTP Status Codes (4xx/5xx) for errors.

### 4. Directory Structure Boundaries
- **Frontend**: `frontend/src/app` (Pages), `frontend/src/components` (UI)
- **Backend**: `backend/app/api` (Routes), `backend/app/services` (Business Logic)
- **Shared**: `docker-compose.yml` (Infrastructure)

### 5. Testing & Quality Standards
- **Backend Testing (Pytest)**:
    - **Unit**: `backend/app/tests/unit`. Mock ALL external dependencies.
    - **Integration**: `backend/app/tests/integration`. Use TestClient + Test DB.
    - **Performance**: `backend/app/tests/performance`. Benchmark critical paths.
- **Frontend Testing (Jest)**:
    - **Business Components**: Must have unit tests covering state changes.
    - **UI Library**: Do NOT test `components/ui` (shadcn).
- **Linting**:
    - **Frontend**: ESLint + Prettier.
    - **Backend**: Ruff (Linter & Formatter).
- **Documentation**:
    - **API**: Endpoints MUST have `summary` and `description` docstrings.
    - **Complex Logic**: Comments MUST explain the "Why", not the "What".

#### 测试强制规则（扩展）

**1. FastAPI 测试依赖注入**
- ❌ **禁止**: 使用 `@patch` 装饰器 mock `get_current_user`
- ✅ **必须**: 使用 `app.dependency_overrides`
  ```python
  from app.main import app
  
  def test_endpoint(client):
      app.dependency_overrides[get_current_user] = lambda: mock_user
      app.dependency_overrides[get_db] = override_get_db
      
      try:
          response = client.get("/api/v1/endpoint")
          assert response.status_code == 200
      finally:
          app.dependency_overrides.clear()
  ```

**2. 异步测试配置**
- **Backend (Pytest)**: 使用 `pytest-asyncio`
  ```python
  @pytest.mark.asyncio
  async def test_async_function():
      result = await async_operation()
      assert result is not None
  ```
- **Frontend (Jest)**: 默认支持 async/await

**3. 数据库测试隔离**
- **Unit Tests**: Mock `AsyncSession`，不触碰真实数据库
- **Integration Tests**: 使用测试数据库，每个测试后回滚事务

**4. 前端测试边界**
- **组件测试**: 仅测试 `components/business/`
- **不测试**: `components/ui/` (shadcn/ui 已测试)
- **API Mock**: 使用 `jest.mock()` mock `lib/api`

**5. 覆盖率要求**
- **Backend**: Unit ≥ 80%, Integration ≥ 60%
- **Frontend**: Business Components ≥ 70%
- **运行命令**:
  - Backend: `pytest --cov=app --cov-report=term`
  - Frontend: `npm run test:coverage`

**6. Celery 任务测试**
```python
@patch('app.tasks.module.celery_app.task')
def test_task(mock_task):
    mock_task.delay.return_value.id = "task-123"
    result = trigger_task()
    assert result["task_id"] == "task-123"
```

**7. 数据库 Mock 陷阱 (PostgreSQL Async)**
- ❌ **AsyncMock 直接返回值** (会导致 `coroutine was never awaited`):
  ```python
  mock_db.execute.return_value = mock_result  # 错误
  ```
- ✅ **使用 async 函数作为 side_effect**:
  ```python
  async def mock_execute(*args, **kwargs):
      return mock_result
  mock_db.execute.side_effect = mock_execute
  ```

### 6. Development Workflow
- **Git Commits**: Follow Conventional Commits (e.g., `feat: user login`, `fix: auth bug`).
- **Dependency Management**:
    - Frontend: `npm` (lockfile: `package-lock.json`)
    - Backend: `poetry` (lockfile: `poetry.lock`)

## Anti-Patterns (Do NOT Do This)
- ❌ **No circular imports** in Python. Use `TYPE_CHECKING` for type hints.
- ❌ **No logic in UI components**. Move logic to `hooks` or `services`.
- ❌ **No blocking code** in FastAPI routes. Use `await` or `Celery` for slow tasks.
- ❌ **No secrets** in code. Always use `.env` variables mapped via `pydantic-settings`.

### 性能与安全关键反模式（扩展）

#### 1. 数据库性能
- ❌ N+1 查询：循环中执行查询
- ✅ Eager Loading：使用 `joinedload()` 预加载关联

#### 2. 多租户数据泄露
- ❌ 查询时未过滤 `workspace_id`
- ✅ 在依赖注入层强制验证 workspace 权限

#### 3. 前端性能
- ❌ 大列表未虚拟化（TanStack Virtual）
- ❌ 图片未懒加载
- ✅ 使用 `memo`, `useMemo`, `useCallback` 优化

#### 4. API 安全
- ❌ 敏感操作未二次验证 workspace 权限
- ❌ 直接信任前端传入的 workspace_id
- ✅ 后端重新从 token 提取 user，验证 workspace_member

#### 5. Celery 任务超时
- ❌ 未设置 `soft_time_limit` 和 `time_limit`
- ✅ 长时任务必须配置超时并捕获 `SoftTimeLimitExceeded`

---

## Framework-Specific Patterns

### Next.js App Router 特定规则

#### 1. 认证模式
- **Server Components (默认)**: 使用 `auth()` 进行认证检查
  ```typescript
  import { auth } from '@/auth';
  const session = await auth();
  if (!session?.user) redirect('/login');
  ```
- **Client Components**: 标记 `'use client'` 后使用 `useSession()`
  ```typescript
  'use client';
  import { useSession } from 'next-auth/react';
  const { data: session, status } = useSession();
  ```

#### 2. Middleware 路由保护
- **MUST 使用 Middleware**: 在 `middleware.ts` 中定义受保护路由
  ```typescript
  export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard');
    if (isProtectedRoute && !isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  });
  ```
- **Page-level 授权**: Server Component 中额外验证 workspace 权限

#### 3. 数据获取规则
- **Server Components**: 直接 `fetch()` 或调用 API，使用 `cache: 'no-store'`
- **Client Components**: 使用 TanStack Query (`useQuery`, `useMutation`)
- **禁止**: Server Components 中使用 React hooks

#### 4. 环境变量
- **Public 变量**: 必须以 `NEXT_PUBLIC_` 前缀，可在客户端访问
- **Private 变量**: 无前缀，仅服务端可用
- **禁止**: Client Components 直接访问非 `NEXT_PUBLIC_` 变量

### FastAPI 认证与授权模式

#### 1. Cookie-based Session 认证
- **依赖**: `get_current_user(session_token: str | None = Cookie(...))`
- **Cookie 名称**:
  - 开发环境（HTTP）: `authjs.session-token`
  - 生产环境（HTTPS）: `__Secure-authjs.session-token`
- **Token 解析**: 使用 `decode_token()` 验证 NextAuth JWT

#### 2. 依赖注入链（多租户）
```python
# Step 1: 认证用户
current_user: User = Depends(get_current_user)

# Step 2: 验证 workspace 权限
member: WorkspaceMember = Depends(get_current_workspace_member)

# Step 3: 数据库会话
db: AsyncSession = Depends(get_db)
```
- **顺序强制**: 必须先 `get_current_user`，再 `get_current_workspace_member`
- **路径参数**: workspace_id 从 URL 路径提取，与 `current_user` 匹配

#### 3. 测试依赖覆盖（关键反模式）
- ❌ **禁止使用 @patch 装饰器** mock `get_current_user`
- ✅ **必须使用 `app.dependency_overrides`**:
  ```python
  app.dependency_overrides[get_current_user] = lambda: mock_user
  app.dependency_overrides[get_db] = lambda: mock_db
  ```
- **原因**: FastAPI 的依赖注入在请求处理时解析，`@patch` 无法拦截

#### 4. 错误响应标准
- **401 Unauthorized**: 缺少或无效的 session token
- **403 Forbidden**: 已认证但无 workspace 权限
- **404 Not Found**: Workspace 或资源不存在

### Celery 任务配置标准

#### 1. 任务装饰器必需配置
```python
@celery_app.task(
    name="app.tasks.module.function_name",  # 显式任务名
    bind=True,                              # 绑定 self，用于 self.retry()
    autoretry_for=(CustomError,),           # 自动重试的异常类型
    retry_backoff=True,                     # 指数退避
    retry_jitter=True,                      # 随机抖动（避免雷鸣群效应）
    max_retries=3,                          # 最大重试次数
    retry_backoff_max=300,                  # 最大退避时间（秒）
)
def my_task(self, ...):
    ...
```

#### 2. 超时设置（长时任务）
```python
@celery_app.task(
    soft_time_limit=600,   # 软限制：10分钟（允许异常捕获）
    time_limit=660,         # 硬限制：11分钟（强制终止）
)
```
- **软限制**: 抛出 `SoftTimeLimitExceeded`，可捕获并清理
- **硬限制**: 强制终止进程，无法捕获

#### 3. 错误处理模式
```python
try:
    result = await service.process()
except SoftTimeLimitExceeded:
    # 软超时：标记失败并清理
    _mark_job_failed(job_id, "Task timeout")
    raise
except CustomError as exc:
    # 业务异常：记录日志并重试
    log_task_event(logger, task_id, "failed", str(exc))
    raise  # 触发 autoretry_for
except Exception as exc:
    # 未预期异常：包装后抛出以触发重试
    raise CustomError(f"Unexpected: {exc}")
```

#### 4. 进度反馈（Redis Pub/Sub）
```python
# 发布状态到 Redis
await redis_client.publish(
    f"task:{task_id}",
    {"status": "processing", "progress": 50}
)
```
- **频道命名**: `task:{task_id}`
- **前端监听**: SSE endpoint `/stream/{task_id}`

#### 5. 任务重试计数器
```python
if self.request.retries < max_retries:
    raise self.retry(exc=exc, countdown=60)
```
- **countdown**: 固定延迟（秒）
- **retry_backoff=True**: 自动计算指数延迟

### 异步与同步代码边界

#### 1. FastAPI 路由必须全异步
```python
# ✅ 正确
@router.get("/items")
async def get_items(
    db: AsyncSession = Depends(get_db)  # AsyncSession
):
    result = await db.execute(select(Item))  # await
    return result.scalars().all()

# ❌ 错误：同步代码在异步路由中
async def get_items(db: Session = Depends(get_db)):
    return db.query(Item).all()  # 阻塞 event loop
```

#### 2. Celery 任务内运行异步代码
```python
@celery_app.task
def sync_task(job_id: str):
    # Celery 任务是同步的，需要创建事件循环
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        result = loop.run_until_complete(_async_operation())
    finally:
        loop.close()
```
- **原因**: Celery worker 是同步进程，无默认事件循环
- **替代方案**: Python 3.7+ 可用 `asyncio.run()`

#### 3. 数据库操作边界
- **FastAPI**: 必须使用 `AsyncSession`
  ```python
  async with get_db() as db:
      await db.execute(...)
      await db.commit()
  ```
- **Celery**: 使用同步 `Session`
  ```python
  with SessionLocal() as db:
      db.execute(...)
      db.commit()
  ```

#### 4. HTTP 请求边界
- **FastAPI**: 使用 `httpx.AsyncClient`
  ```python
  async with httpx.AsyncClient() as client:
      response = await client.get(url)
  ```
- **Celery**: 使用 `httpx.Client` 或 `requests`
  ```python
  response = httpx.get(url)  # 同步
  ```

#### 5. 禁止的反模式
- ❌ FastAPI 路由中使用 `asyncio.run()`（已在事件循环中）
- ❌ Celery 任务直接 `await`（无事件循环）
- ❌ 混用 `AsyncSession` 和同步查询

---

## 错误处理与用户反馈模式

### 1. FastAPI 错误处理
```python
from fastapi import HTTPException, status

# 标准错误响应
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Workspace not found"
)
```
- **状态码规范**: 使用 `status` 模块常量
- **detail**: 简洁的错误消息（用户可见）

### 2. Celery 任务错误
```python
try:
    result = await service.process()
except ServiceError as exc:
    log_task_event(logger, task_id, "failed", str(exc))
    raise  # 触发重试
finally:
    await cleanup_resources()
```
- **必须**: 使用 `finally` 清理资源
- **日志**: 记录错误上下文（job_id, task_id）

### 3. 前端错误通知
```typescript
import { toast } from 'sonner';

try {
  await api.call();
  toast.success('操作成功');
} catch (error) {
  toast.error(error.message || '操作失败');
}
```
- **用户反馈**: 使用 `sonner` toast
- **错误边界**: 关键组件包裹 `ErrorBoundary`

