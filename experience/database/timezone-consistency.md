# DateTime时区一致性处理

## ✅ 推荐模式

**统一使用时区感知DateTime** - ORM + Python + 数据库 三者一致

```python
# 文件: backend/app/models/user.py
from sqlalchemy import Column, DateTime
from datetime import datetime, timezone

class User(Base):
    __tablename__ = "users"

    # ✅ ORM: 明确声明timezone=True
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
```

```sql
-- 数据库: timestamp with time zone
ALTER TABLE users
  ALTER COLUMN created_at TYPE timestamp with time zone,
  ALTER COLUMN updated_at TYPE timestamp with time zone;
```

## ❌ 反模式

```python
# ❌ ORM未声明timezone
created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# ❌ 使用datetime.utcnow() (无时区信息)
created_at = Column(DateTime, default=lambda: datetime.utcnow())

# ❌ 混合使用时区感知和时区无关类型
```

## 💡 核心原则

- **三者一致**: ORM定义 + Python代码 + 数据库类型 必须一致
- **统一使用UTC**: 所有时间以UTC存储，显示时转换为用户本地时区
- **默认使用timezone=True**: 除非有明确理由，否则始终使用 `timezone=True`
- **避免datetime.utcnow()**: 返回naive datetime，丢失时区信息

## 📚 相关

- [001-datetime-timezone](../debug/001-datetime-timezone-orm.md)
