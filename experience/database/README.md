# 数据库设计与迁移

数据库设计原则、迁移策略、查询优化

---

## 📚 文档索引

### [DateTime时区一致性处理](./timezone-consistency.md)

ORM定义、Python代码、数据库类型三者一致

**关键原则**: ORM + Python + DB 三者必须一致

---

## 🔗 相关案例

- [案例1: DateTime时区ORM问题](../debug/001-datetime-timezone-orm.md)

---

## 💡 核心原则

- **新项目**: 统一使用 `DateTime(timezone=True)` + `datetime.now(timezone.utc)` + `timestamp with time zone`
- **现有项目**: 备份数据库 → 编写Alembic迁移脚本 → 测试环境验证 → 监控生产环境

---

## 📊 统计

- **文档数量**: 1
- **相关案例**: 1个
- **最后更新**: 2026-01-03
