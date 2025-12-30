# E_Business 项目统一化修复计划

> **计划版本**: v1.1
> **创建日期**: 2025-12-30
> **预计完成时间**: 8.0-9.0 小时
> **执行模式**: 完整实施 (P0-P3)

---

## 目录

1. [执行摘要](#执行摘要)
2. [问题诊断](#问题诊断)
3. [标准规范 (from rules.md)](#标准规范-from-rulesmd)
4. [详细实施计划](#详细实施计划)
5. [验证方案](#验证方案)
6. [风险与注意事项](#风险与注意事项)
7. [附录](#附录)

---

## 执行摘要

基于对项目的深度探索（使用3个并行探索代理）及首轮人工验证，发现项目存在三类主要问题。本计划旨在严格按照 `rules.md` 中的 **"FractalFlow" 高完整性编码协议** 进行统一化修复。

**v1.1 更新重点**:
- 修正后端文件“100%合规”的错误判断（实际大量 core/tasks 模块缺失头部）。
- 移除不存在的 `deps.py` 文档漂移问题。
- 将模板定义源头统一指向 `rules.md`。

| 问题类别 | 严重程度 | 影响范围 | 预计时间 |
|---------|---------|---------|---------|
| 一级目录缺少 `_folder.md` | **严重 (P0)** | 9个目录 | 1.5小时 |
| 前端代码文件头部不规范 | **中等 (P1)** | ~20-50个文件 | 4-5小时 |
| 后端代码文件头部不规范 | **中等 (P1)** | ~50+个文件 | 2-3小时 |
| **总计** | - | - | **8.0-9.0小时** |

---

## 问题诊断

### 问题1：一级目录缺少 _folder.md (P0 - 严重)

#### 影响分析
- **导航问题**: 开发者和AI代理无法快速理解各模块的职责和边界
- **认知效率降低**: 每次进入新目录都需要重新探索代码结构
- **违反规则**: 违反了 `rules.md` 中 "Level 2 (Folder)" 的分形认知路径规则

#### 缺失文件清单

| 序号 | 文件路径 | 技术栈 | 模块职责 | 优先级 |
|-----|---------|--------|---------|--------|
| 1 | `backend/_folder.md` | FastAPI + Python | API后端核心，处理业务逻辑、AI集成、异步任务 | **P0** |
| 2 | `frontend/_folder.md` | Next.js + TypeScript | 主前端应用，用户界面和交互 | **P0** |
| 3 | `docs/_folder.md` | Markdown | 项目文档中心（PRD、架构、Sprint管理） | P1 |
| 4 | `mgrep/_folder.md` | TypeScript + Bash | 语义搜索工具 | P2 |
| 5 | `Website_frontend/_folder.md` | React + Vite | 旧版前端，UI组件资源库 | P2 |
| 6 | `netlify-deploy/_folder.md` | 静态HTML | 静态部署演示版本 | P3 |
| 7 | `bmad-custom-src/_folder.md` | YAML | BMad自定义配置源 | P3 |
| 8 | `bmad-custom-modules-src/_folder.md` | 空 | BMad模块源码（空目录） | P3 |
| 9 | `.serena/_folder.md` | YAML | Serena项目配置 | P3 |

#### 现状
- ✅ **子目录覆盖良好**: 已存在19个 `_folder.md` 文件，主要分布在 `backend/app/` 和 `frontend/src/` 的子目录
- ❌ **一级目录完全缺失**: 9/9 个一级目录都没有 `_folder.md`

---

### 问题2：代码文件头部不规范 (P1)

#### 影响分析
- **代码可维护性降低**: 缺少标准化的头部注释，增加代码理解成本
- **AI理解效率降低**: AI代理无法快速解析文件的功能和依赖关系
- **违反规则**: 违反了 `rules.md` 中 "Level 3 (File)" 的规则

#### 现状统计 (修正版)

| 文件类型 | 检查结果 | 状态 |
|---------|---------|------|
| **Backend Python** | 大量核心文件 (`core/`, `tasks/`, `tests/`) 缺失 `[IDENTITY]` 头部 | **不合规** ⚠️ |
| **Frontend TypeScript** | ~50% 文件缺失头部 | **不合规** ⚠️ |

#### 需要修复的文件类别

1.  **Backend Core & Tasks**:
    - `backend/app/core/*.py` (如 `celery_app.py`, `database.py`)
    - `backend/app/tasks/*.py` (如 `invite_cleanup.py`)
    - `backend/app/tests/**/*.py` (大量测试文件)

2.  **Frontend Modules**:
    - **API Clients**: `/frontend/src/lib/api/*.ts`
    - **Type Defs**: `/frontend/src/types/*.ts`
    - **Stores**: `/frontend/src/stores/*.ts`
    - **Pages**: `/frontend/src/app/**/*.tsx`

---

## 标准规范 (from rules.md)

> **核心原则**: 所有模板必须严格遵循 `rules.md` 中的 defined Section IV (Standard Templates)。此处仅作引用，不重新定义，避免单一来源原则 (SSOT) 冲突。

### 1. 目录映射模板 (_folder.md)
参见 `rules.md` -> **Template IV.1**

### 2. Python文件头部模板
参见 `rules.md` -> **Template IV.2**

### 3. TypeScript/TSX文件头部模板
参见 `rules.md` -> **Template IV.3**

---

## 详细实施计划

### 阶段1：创建一级目录 _folder.md (P0-P1, 1.5小时)

#### 步骤1.1：后端与前端根目录 (P0)
- 创建 `backend/_folder.md` (参考 `rules.md` 模板)
- 创建 `frontend/_folder.md` (参考 `rules.md` 模板)

#### 步骤1.2：文档与工具目录 (P1-P2)
- 创建 `docs/_folder.md`
- 创建 `mgrep/_folder.md`, `Website_frontend/_folder.md`, 等剩余目录

---

### 阶段2：规范化前端代码 (P1, 4-5小时)

#### 步骤2.1：API与类型定义
- 扫描 `frontend/src/lib/api/`，批量添加 TypeScript Header。
- 扫描 `frontend/src/types/`，批量添加 TypeScript Header (简化版)。

#### 步骤2.2：状态与组件
- 扫描 `frontend/src/stores/`，添加 Header。
- 扫描核心 `frontend/src/components/business/`，添加 Header。

---

### 阶段3：规范化后端代码 (P1, 2-3小时) (新增)

#### 步骤3.1：Core与Tasks模块
- 修复 `backend/app/core/` 下的 `celery_app.py`, `database.py`, `config.py` 等关键基础设施文件。
- 修复 `backend/app/tasks/` 下的所有异步任务文件。

#### 步骤3.2：补充测试文件头部 (P2)
- 为 `backend/app/tests/` 下的关键集成测试添加 Header，明确测试范围和依赖。

---

## 验证方案

### 验证1：_folder.md 覆盖率
```bash
# 确保所有一级目录均存在 _folder.md
find . -maxdepth 1 -type d ! -name ".*" -exec test -e "{}/_folder.md" \; -print
```

### 验证2：头部规范检查脚本
```bash
# Python 检查
find backend/app -name "*.py" -not -name "__init__.py" | xargs grep -L "\[IDENTITY\]"

# TypeScript 检查
find frontend/src -name "*.ts" -o -name "*.tsx" | xargs grep -L "HIGH-INTEGRITY HEADER"
```
**目标**: 输出为空 (或仅剩极少数豁免文件)。

---

## 风险与注意事项

### 风险评估
| 风险 | 概率 | 缓解措施 |
|-----|------|---------|
| 批量修改导致语法错误 | 低 | 修改后运行 `pytest` 和 `npm run build` 预检 |
| 头部注释与代码实际逻辑不符 | 中 | 依靠 AI 的阅读理解能力，基于真实代码生成注释 |

### 注意事项
1. **SSOT原则**: 一切以 `rules.md` 为准，`plan.md` 仅为执行清单。
2. **测试先行**: 修改后端 Core 模块后，必须运行 `pytest` 确保未破坏环境配置。

---

## 变更记录

- **v1.1** (当前): 修正后端合规性判断，增加后端修复阶段，移除无效文档漂移项。
- **v1.0** (2025-12-30): 初始版本。
