# FastAPI + SQLAlchemy 异步集成测试

**问题**: pytest-asyncio 与 SQLAlchemy AsyncSession 配合时常见的多种陷阱
**影响**: 测试失败、数据不可见、事务隔离问题

## ❌ 常见错误

### 1. DateTime 时区不匹配
```python
# 错误: 使用 offset-naive datetime
created_at = mapped_column(DateTime, default=datetime.utcnow)

# 错误信息: can't subtract offset-naive and offset-aware datetimes
```

### 2. Session 隔离导致数据不可见
```python
# 错误: 测试和 API 使用不同 session，互相看不到数据
@pytest.fixture
async def db():
    engine = create_async_engine(url)  # 独立引擎
    ...

@pytest.fixture  
async def async_client():
    engine = create_async_engine(url)  # 另一个独立引擎!
    ...
```

### 3. Pydantic v2 序列化
```python
# 错误: Pydantic v2 中 .dict() 行为改变
response = await client.post(url, json=request_data.dict())
```

## ✅ 正确代码

### 1. 使用 timezone-aware datetime
```python
# app/models/xxx.py
from datetime import datetime, timezone
from sqlalchemy import DateTime

created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), 
    default=lambda: datetime.now(timezone.utc)
)
updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    default=lambda: datetime.now(timezone.utc),
    onupdate=lambda: datetime.now(timezone.utc)
)
```

### 2. 共享 Session 策略
```python
# conftest.py
@pytest.fixture
async def db_engine(test_database_url: str):
    engine = create_async_engine(test_database_url, poolclass=NullPool)
    yield engine
    await engine.dispose()

@pytest.fixture
async def db(db_engine) -> AsyncGenerator[AsyncSession, None]:
    session_maker = async_sessionmaker(db_engine, expire_on_commit=False)
    async with session_maker() as session:
        yield session

@pytest.fixture
async def async_client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    # 关键: override get_db 返回同一 session
    async def override_get_db():
        yield db
    
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
```

### 3. Pydantic v2 正确序列化
```python
# 正确: 使用 model_dump(mode='json')
response = await client.post(url, json=request_data.model_dump(mode='json'))
```

## 💡 核心要点

1. **DateTime 必须 timezone-aware**: 使用 `DateTime(timezone=True)` + `datetime.now(timezone.utc)`
2. **测试 Session 共享**: 通过 `dependency_overrides` 让 API 使用测试 session
3. **NullPool 避免连接泄漏**: `create_async_engine(url, poolclass=NullPool)`
4. **Pydantic v2 序列化**: 使用 `.model_dump(mode='json')` 替代 `.dict()`
5. **pytest.ini 配置**:
   ```ini
   [pytest]
   asyncio_mode = auto
   asyncio_default_fixture_loop_scope = function
   ```

## 📁 相关文件
- `backend/app/tests/conftest.py` - 测试 fixtures
- `backend/pytest.ini` - pytest 配置
- `backend/app/models/*.py` - 模型定义

## 5. 过时测试文件重构

当测试文件使用不存在的模型字段时，需要完整重写：

### 识别过时测试
```python
# 过时：使用不存在的字段
Workspace(owner_id=uuid.uuid4())  # ❌ 没有 owner_id
User(username="test")              # ❌ 没有 username
Product(selling_points=["a"])      # ❌ selling_points 是可选 JSON
```

### 重构策略
1. 分析当前模型结构（`view_code_item`）
2. 复用 `conftest.py` fixtures：`test_user`, `test_workspace`, `member_headers`
3. 创建依赖数据（如 `Product` 需要 `Asset.original_asset_id`）
4. 保持测试独立性
