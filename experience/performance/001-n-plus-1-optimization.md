# N+1 查询优化 (N+1 Query Optimization)

## ✅ 推荐模式

### 1. 使用 SelectInLoad 预加载
```python
# backend/app/api/v1/endpoints/products.py
from sqlalchemy.orm import selectinload

stmt = (
    select(Product)
    .options(selectinload(Product.original_asset))  # 预加载关联对象
    .where(Product.workspace_id == workspace_id)
)
```

### 2. 识别关联关系
在 Model 定义中明确 relationship：
```python
# backend/app/models/product.py
original_asset: Mapped["Asset"] = relationship(...)
```
如果是 to-many 关系，更容易引发 N+1 问题。

## ❌ 反模式

```python
# 循环中触发懒加载
products = await db.scalars(select(Product))
for p in products:
    print(p.original_asset.name)  # 每次循环触发一次额外的 SELECT 查询
```

## 💡 核心原则

- **主动预加载**: 明确知道后续需要使用关联数据时，使用 `selectinload` (适合 to-many) 或 `joinedload` (适合 to-one)。
- **AsyncIO 限制**: 在 `asyncio` 模式下，懒加载 (Lazy Loading) 通常会因上下文问题失败或效率极低，因此预加载几乎是强制的。
- **Schema 驱动**: 根据 Response Schema 中需要的字段（如嵌套对象）来决定预加载策略。
- **性能监控**: 关注 SQL 日志，确保查询次数符合预期（1次主查询 + 1次关联查询，而非 1 + N 次）。
