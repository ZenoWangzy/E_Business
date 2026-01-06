# 代码验证方法论

**问题**: 文档标记"已修复"但实际代码未实现
**影响**: 错误的进度评估，遗漏待办项

## ❌ 错误做法

```bash
# ❌ 仅相信文档标记，不验证
# plan.md: ✅ "已修复": transactional_upload.py 已创建
# 实际文件可能不存在
```

## ✅ 正确做法

```bash
# ✅ 验证文件存在
Glob **/transactional_upload.py  # ✅ 文件存在

# ✅ 验证代码实现
Read backend/app/api/v1/endpoints/assets.py:90-105
# 确认流式验证函数存在

# ✅ 验证函数调用
Grep -r "validate_file_size_streaming" backend/  # ✅ 已使用
```

## 💡 核心要点

- **零信任验证**: 文档只是索引，代码才是真理
- **工具链**: Glob（存在）→ Read（内容）→ Grep（使用）
- **批量验证**: 逐一验证，发现17个真实完成，1个需检查
- **生成报告**: 记录每个问题的实际状态

