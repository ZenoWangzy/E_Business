# 分页响应标准 (Pagination Standards)

## ✅ 推荐模式

### 1. 完整分页响应模型
```python
# backend/app/schemas/asset.py
class AssetListResponse(BaseModel):
    """Response for listing assets with pagination."""
    data: list[AssetBrief]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool
```

### 2. 后端计算元数据
```python
# backend/app/api/v1/endpoints/assets.py
@router.get("/", response_model=AssetListResponse)
async def list_assets(skip: int = 0, limit: int = 20, ...):
    # 1. Count Total
    total = await db.scalar(select(func.count(Asset.id)).where(...))
    
    # 2. Fetch Data
    assets = await db.scalars(select(Asset).offset(skip).limit(limit).where(...))
    
    # 3. Calculate Meta
    page = skip // limit + 1
    return AssetListResponse(
        data=assets,
        total=total,
        page=page,
        page_size=limit,
        has_next=skip + limit < total,
        has_prev=page > 1
    )
```

## ❌ 反模式

```python
# 仅返回数据列表，前端无法知道是否还有更多
@router.get("/", response_model=list[Asset])
# 或者是前端必须一次性加载所有数据进行计算
```

## 💡 核心原则

- **元数据丰富**: 提供 total, page, has_next 等字段，方便前端组件（如 Infinite Scroll 或 Pagination Bar）渲染。
- **数据库分页**: 必须在数据库层使用 `OFFSET/LIMIT`，严禁在应用层过滤。
- **独立 Count 查询**: 虽然有性能开销，但对于需要展示总页数的场景是必要的。对于超大数据集，可考虑 Cursor Pagination。
- **默认限制**: 始终提供默认 `limit` 和最大 `limit`，防止恶意全量拉取。
