# DateTime时区ORM问题

**问题**: ORM定义不带时区，Python生成时区感知对象，PostgreSQL拒绝插入
**影响**: 500错误 - 用户注册失败

## ❌ 错误代码

```python
# 文件: backend/app/models/user.py
from sqlalchemy import Column, DateTime
from datetime import datetime, timezone

class User(Base):
    __tablename__ = "users"

    # ❌ 错误: 未指定timezone
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))
```

## ✅ 正确代码

```python
# 文件: backend/app/models/user.py
from sqlalchemy import Column, DateTime
from datetime import datetime, timezone

class User(Base):
    __tablename__ = "users"

    # ✅ 正确: 明确声明timezone=True
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
```

## 💡 核心要点

- ORM定义 + Python代码 + 数据库类型 **三者必须一致**
- PostgreSQL使用 `timestamp with time zone`
- Python代码使用 `datetime.now(timezone.utc)`

## 📚 相关

- [timezone-consistency](../database/timezone-consistency.md)
- [002-nextauth-session](./002-nextauth-session-persistence.md) 也涉及时区问题
