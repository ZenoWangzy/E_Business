# 调试案例索引

真实的Bug修复案例 - 问题→代码对比→核心要点

---

## 📋 案例列表

### [001 - DateTime时区ORM问题](./001-datetime-timezone-orm.md)

**分类**: database, orm, timezone | **难度**: 中等 | **日期**: 2026-01-02

ORM定义与数据库类型不一致导致500错误

**关键学习**: ORM定义 + Python代码 + 数据库类型三者必须一致

---

### [002 - NextAuth Session持久化](./002-nextauth-session-persistence.md)

**分类**: authentication, nextauth, session | **难度**: 中等 | **日期**: 2026-01-02

Session无法创建和Token传递问题

**关键学习**: NextAuth配置简单化 + SessionProvider完整性

---

### [003 - 工作区创建认证失败](./003-workspace-auth-failure.md)

**分类**: authentication, api, frontend-backend | **难度**: 中等 | **日期**: 2026-01-02

前后端认证链路不完整导致401

**关键学习**: 前端获取token → 传递token → 后端验证token

---

### [004 - SSR Hydration 不匹配](./005-ssr-hydration-mismatch.md)

**分类**: frontend, ssr, nextjs | **难度**: 中等 | **日期**: 2026-01-04

`useNetworkStatus` hook 导致的 Hydration 错误

**关键学习**: 客户端专有状态必须使用统一初始值 + mounted 模式

---

### [007 - 文件上传 500 与 状态同步](./007-upload-500-error-handling.md)

**分类**: backend, async-orm, frontend-state | **难度**: 中等 | **日期**: 2026-01-06

SQLAlchemy Async MissingGreenlet 错误与 React 状态同步竞态条件

**关键学习**: Async ORM必须使用 selectinload + 回调前显式构造状态对象

---

### [008 - Dashboard 跳转 AI Studio 重定向循环](./008-dashboard-redirect-loop.md)

**分类**: frontend, nextjs, state-management | **难度**: 中等 | **日期**: 2026-01-06

AI Studio 跳转循环重定向 (Dashboard -> Step 2 -> Dashboard)

**关键学习**: ID一致性(Backend UUID) + URL State > Store State + Strict Validation

---

## 🔍 按分类查看

**数据库**: [001](./001-datetime-timezone-orm.md)

**认证**: [002](./002-nextauth-session-persistence.md) | [003](./003-workspace-auth-failure.md)

**前端**: [004](./005-ssr-hydration-mismatch.md) | [008](./008-dashboard-redirect-loop.md)

---

## 💡 使用建议

**遇到Bug时**:
1. 通过关键词搜索相关案例
2. 阅读"问题"和"影响"确认是否相似
3. 复制"✅正确代码"到你的项目
4. 参考"核心要点"避免类似问题

**添加新案例**:
1. 使用模板: [`../_templates/debug-case.md`](../_templates/debug-case.md)
2. 命名: `序号-简短描述.md`
3. 目标: ≤40行

---

## 📊 统计

- **总案例数**: 5
- **涉及模块**: 前端(4), 后端(3), 数据库(2)
- **最后更新**: 2026-01-06
