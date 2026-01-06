[根目录](../CLAUDE.md) > **bmad-custom-src**

# 变更记录 (Changelog)
- 2026-01-06: 初始化 bmad-custom-src 模块文档

# 模块职责

bmad-custom-src 模块是 BMad 框架的自定义配置源，负责：
- 定义项目支持的语言服务器
- 配置文件编码和忽略规则
- 设置项目读取模式
- 管理工具排除策略
- 提供项目初始提示词

# 配置说明

## 语言服务器配置
- **主要语言**: TypeScript
- **语言服务器**: typescript (LSP)
- **覆盖范围**:
  - 前端代码 (frontend/)
  - 旧版前端 (Website_frontend/)
  - 工具代码 (mgrep/)

## 编码设置
- **文件编码**: UTF-8
- **适用范围**: 所有文本文件

## 忽略规则
- **使用 .gitignore**: `ignore_all_files_in_gitignore: true`
- **附加忽略路径**: `ignored_paths: []`
- **默认忽略**:
  - node_modules/
  - venv/
  - .git/
  - dist/
  - build/
  - __pycache__/

## 读写模式
- **只读模式**: `read_only: false`
- **可编辑**: 是
- **工具可用**: 全部可用（无排除）

## 工具配置
- **排除工具**: 无（`excluded_tools: []`）
- **可选工具**: 无（`included_optional_tools: []`）
- **完整工具支持**: BMad 所有工具均可用

# 入口文件

- **配置文件**: `/bmad-custom-src/custom.yaml`
- **项目标识**: `project_name: "E_Business"`

# 相关文件清单

## 配置文件
- `custom.yaml` - BMad 自定义配置

## 文档
- `_folder.md` - BMad 配置模块映射

# 注意事项

1. **YAML 格式**: 必须遵循 BMad schema 规范
2. **版本控制**: 任何变更应记录在 changelog 中
3. **语言服务器**: TypeScript 语言服务器将作为主要服务器，支持所有 .ts/.tsx 文件
4. **工具可用性**: 所有 BMad 工具均可用，无限制

# 常见问题 (FAQ)

## Q: 如何添加新的语言支持？
A: 在 `custom.yaml` 的 `languages` 列表中添加所需语言。例如：
   ```yaml
   languages:
   - typescript
   - python  # 添加 Python 支持
   ```

## Q: 如何忽略特定文件或目录？
A: 在 `custom.yaml` 的 `ignored_paths` 中添加：
   ```yaml
   ignored_paths:
   - "temp/**"
   - "*.log"
   ```

## Q: 如何启用只读模式？
A: 设置 `read_only: true`，这将禁用所有编辑工具。

## Q: 项目初始提示词的作用是什么？
A: `initial_prompt` 会在激活项目时始终提供给 LLM，可用于设置项目特定的上下文或指导原则。
