[根目录](../CLAUDE.md) > **.serena**

# 变更记录 (Changelog)
- 2026-01-06: 初始化 .serena 模块文档

# 模块职责

.serena 模块是 Serena MCP 服务器的项目配置，负责：
- 配置 Serena 项目的代码标识
- 定义项目名称和描述
- 设置默认选中状态
- 管理项目特定缓存
- 提供 Serena 集成的语义编码工具

# 配置说明

## 项目标识
- **代码**: `my-custom-bmad`
- **名称**: ZenoWang-Custom-BMad: Sample Stand Alone Custom Agents and Workflows
- **默认选中**: `default_selected: true`

## 功能特性
- **MCP 集成**: 与 Serena MCP 服务器集成
- **语义编码**: 提供符号查找、代码引用等语义功能
- **缓存管理**: 缓存 TypeScript 文档符号以提高性能
- **项目上下文**: 为 Serena AI 助手提供项目特定配置

# 入口文件

- **配置文件**: `/.serena/project.yml`

# 缓存系统

## 缓存位置
- **缓存目录**: `/.serena/cache/`
- **TypeScript 缓存**:
  - `typescript/raw_document_symbols.pkl` - 原始文档符号
  - `typescript/document_symbols.pkl` - 处理后的文档符号

## 缓存作用
- 加速符号查找
- 减少重复解析
- 提高语言服务器响应速度

# 相关文件清单

## 配置文件
- `project.yml` - Serena 项目配置

## 缓存文件
- `cache/typescript/raw_document_symbols.pkl` - 原始符号缓存
- `cache/typescript/document_symbols.pkl` - 文档符号缓存

## 配置
- `.gitignore` - Serena 特定的忽略规则

## 文档
- `_folder.md` - Serena 配置模块映射

# 注意事项

1. **不要修改**: 除非完全理解 Serena 的工作原理，否则不应修改此目录
2. **缓存同步**: 代码变更后可能需要清除缓存以重新生成符号
3. **与文档同步**: 保持与 Serena 文档同步
4. **Git 忽略**: 缓存文件已加入 .gitignore

# 常见问题 (FAQ)

## Q: 何时需要清除缓存？
A: 当出现以下情况时：
   - 符号查找结果不准确
   - 代码重构后符号未更新
   - 语言服务器行为异常

## Q: 如何清除缓存？
A: 删除 `/.serena/cache/` 目录下的文件，Serena 会自动重新生成。

## Q: project.yml 中的 default_selected 有什么作用？
A: 设置为 `true` 时，Serena 会默认选中此项目，无需手动激活。

## Q: 代码 (code) 字段的作用是什么？
A: 它是项目的唯一标识符，用于 Serena 内部引用和区分不同的项目配置。
