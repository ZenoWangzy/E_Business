# Testing & QA Experience

本目录收录自动化测试、集成测试相关的开发经验和最佳实践。

## 📚 文档索引

- [FastAPI + SQLAlchemy 异步集成测试最佳实践](./async-integration-tests.md)
  - 解决 pytest-asyncio与AsyncSession的常见集成问题
  - 正确处理 DateTime 时区
  - 全流程测试中的多租户隔离验证

---

## 💡 核心原则

1. **零信任验证**: 测试代码必须模拟真实环境（使用真实 DB session 而非 mock session）。
2. **状态隔离**: 每个测试用例必须自包含，使用独立或者清理后的数据环境。
3. **类型安全**: 在测试中也应保持 Pydantic 模型和 SQLAlchemy 模型的类型一致性。

