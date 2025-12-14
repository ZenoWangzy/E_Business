[根目录](../../CLAUDE.md) > **docs**

# 变更记录 (Changelog)
- 2025-12-15: 初始化docs模块文档

# 模块职责

Docs模块是E_Business项目的文档中心，负责：
- 产品需求文档（PRD）
- 架构设计文档
- Sprint和用户故事管理
- 项目上下文和规范文档
- 开发指南和最佳实践

# 文档结构

## 核心文档
- **prd.md** - 产品需求文档，定义项目愿景和功能需求
- **architecture.md** - 技术架构文档，包含技术选型和决策
- **ux-design-specification.md** - UX设计规范
- **epics.md** -史诗功能定义
- **implementation_plan.md** - 实施计划

## Sprint管理
- **sprint-artifacts/** - Sprint产物目录
  - sprint-status.yaml - Sprint进度跟踪
  - 各个用户故事文档（1-1, 1-2等编号）
  - 实现就绪报告

## 项目分析
- **project_context.md** - 项目上下文总结
- **project-overview.md** - 项目概览
- **source-tree-analysis.md** - 源码树分析
- **component-inventory.md** - 组件清单
- **development-guide.md** - 开发指南
- **index.md** - 文档索引

## 报告和追踪
- **project-scan-report.json** - 项目扫描报告
- **implementation-readiness-report-2025-12-14.md** - 实施就绪报告
- **bmm-workflow-status.yaml** - BMM工作流状态

# Sprint状态概览

根据sprint-status.yaml，当前开发状态：

## Epic 1: 基础设施（进行中）
- ✅ 环境初始化和数据库迁移（review）
- ✅ 用户认证和安全（done）
- ✅ 工作空间管理和多租户（done）
- 🔄 智能文件上传组件（in-progress）
- ⏳ 资源存储服务MinIO集成（ready-for-dev）

## Epic 2: AI视觉资产工作室（进行中）
- ⏳ 风格选择和生成触发（ready-for-dev）
- ⏳ AI生成Worker（Celery/Redis）（ready-for-dev）

## Epic 3: AI文案工作室（进行中）
- ⏳ 文案工作室UI（ready-for-dev）

## Epic 4: AI视频工作室（进行中）
- ⏳ 视频工作室UI模式选择（ready-for-dev）

## Epic 5: SaaS成熟度（待开始）
- ⏳ 订阅等级和配额中间件（backlog）

# 文档使用指南

## 查看产品需求
```markdown
参考 /docs/prd.md 了解：
- 产品愿景和成功指标
- 用户旅程
- 功能需求（FR编号）
- 非功能需求
```

## 查看技术架构
```markdown
参考 /docs/architecture.md 了解：
- 技术栈选择
- 系统架构图
- 实现模式和规范
- 基础设施配置
```

## 跟踪开发进度
```markdown
查看 /docs/sprint-artifacts/sprint-status.yaml
或具体的用户故事文档：
- docs/sprint-artifacts/1-1-*
- docs/sprint-artifacts/2-1-*
等等
```

# 相关文件清单

## 产品和需求
- `prd.md` - 产品需求文档
- `ux-design-specification.md` - UX设计规范
- `epics.md` - 史诗功能定义

## 架构和设计
- `architecture.md` - 技术架构文档
- `implementation_plan.md` - 实施计划

## Sprint管理
- `sprint-artifacts/sprint-status.yaml` - Sprint状态追踪
- `sprint-artifacts/prograss.md` - 进度文档
- `sprint-artifacts/` - 各个用户故事的具体实现文档

## 项目文档
- `project_context.md` - 项目上下文
- `project-overview.md` - 项目概览
- `development-guide.md` - 开发指南
- `index.md` - 文档索引

## 报告和分析
- `project-scan-report.json` - 项目扫描报告
- `implementation-readiness-report-*.md` - 实施就绪报告
- `component-inventory.md` - 组件清单
- `source-tree-analysis.md` - 源码分析
- `bmm-workflow-status.yaml` - BMM工作流状态