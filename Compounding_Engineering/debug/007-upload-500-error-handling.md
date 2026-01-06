# 案例 007: 文件上传 500 错误与异步加载陷阱

## 1. 问题描述
用户在 Dashboard 尝试上传图片时，后端返回 `500 Internal Server Error`。即使修复了权限校验逻辑，文件上传后前端状态仍卡在“验证中...”，并未显示成功。

**现象**:
1.  **后端**: `500 Internal Server Error`，日志显示 `sqlalchemy.exc.MissingGreenlet`。
2.  **前端**: 上传请求返回 200/201 成功，但 UI 状态卡在 `validating`，未更新为 `completed`。

## 2. 根本原因 (Root Cause)

### 2.1 后端: SQLAlchemy Async ORM Lazy Loading
在异步上下文 (`async def`) 中，SQLAlchemy 默认的 Lazy Loading 机制无法工作，因为它依赖同步的 IO 操作。
- **错误代码**:
  ```python
  member = await session.execute(stmt).scalar_one()
  # ❌ 访问未预加载的关联属性，触发 MissingGreenlet
  workspace = member.workspace 
  ```

### 2.2 前端: React State Update Race Condition
在 `SmartDropzone` 组件中，`processFile` 函数在上传成功后调用 `onUploadComplete` 回调，但传递的是**旧的**文件状态对象。
- **逻辑缺陷**: `files` 状态更新是异步的，直接使用闭包中的 `parsedFile` 变量（其状态仍为 `validating`）传给回调，导致父组件认为文件仍在验证中。

## 3. 解决方案 (Resolution)

### 3.1 后端解决方案: Eager Loading
使用 `selectinload` 显式预加载关联对象。

```python
# backend/app/api/deps_auth.py
from sqlalchemy.orm import selectinload

stmt = select(WorkspaceMember).where(...)
# ✅ 显式预加载 workspace，避免 Lazy Loading
stmt = stmt.options(selectinload(WorkspaceMember.workspace))
member = await session.execute(stmt).scalar_one_or_none()
```

### 3.2 前端解决方案: Explicit State Construction
在回调前显式构造正确的完成状态对象。

```typescript
// frontend/src/components/business/SmartDropzone.tsx
// ✅ 构造最新的完成状态对象
const completedFile: ParsedFile = {
  ...parsedFile,
  status: 'completed',
  progress: 100
};
// 传递给父组件
onUploadComplete(completedFile);
```

### 3.3 兜底防御
- **全局异常处理**: 注册 `app.add_exception_handler(Exception, generic_exception_handler)` 防止 500 堆栈泄露。
- **事务回滚**: 确保数据库写入 `try...except` 块中包含 `await db.rollback()`。

## 4. 最佳实践 (Lessons Learned)
1.  **Async ORM 铁律**: 在异步 FastAPI + SQLAlchemy 中，**永远不要依赖隐式 Lazy Loading**。凡是需要访问的关联属性，必须在查询时用 `selectinload` 或 `joinedload` 显式加载。
2.  **React 状态同步**: 在复杂异步流程（如文件上传）结束时，不要依赖并未更新的 state 变量，应手动构造最终状态对象传递给回调。
3.  **日志即正义**: 遇到 500 错误，第一时间查看 `structlog` 捕获的完整异常堆栈，通常能直接定位到 `MissingGreenlet`。
