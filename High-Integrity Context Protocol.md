Claude Code 极致准确性实践指南 (High-Integrity Context Protocol)
第一部分：架构设计 ( The Structure )
我们将代码库构建为一个**“分形网络”**。它既有垂直的层级（树），又有水平的依赖（网）。

1. 层级一：全域宪法 (/README.md)
作用：系统的入口，定义核心原则和模块划分。 内容规范：

Mandatory：核心同步协议（即下文的 Prompt 规则）。

Architecture：顶层文件夹的职责划分。

Status：当前项目的整体健康状态。

2. 层级二：局部地图 (/src/path/_folder.md)
作用：每个文件夹必须包含此文件，作为该目录的“路由器”。 内容规范：

Scope：本文件夹负责什么（3句话以内）。

Members：关键文件列表及其角色（如：user_service.py: 业务编排）。

Constraints：本目录特有的约束（如：严禁直接调用 DB，必须通过 Repository）。

3. 层级三：文件头契约 (Code File Header)
作用：建立横向连接，显式声明依赖。这是“网状结构”的关键。 格式规范： 在每个源文件（.py/.ts/.go 等）顶部，必须包含以下注释块：

Python

"""
[IDENTITY]: 简述本文件核心职责 (单一职责原则)。

[INPUT]: (InputTypeA, InputTypeB) - 概括输入的数据结构。
[LINK]: 
  - DependencyA -> ../path/to/dependency_a.py  # [POINTER] 仅提供路径，不复制文本
  - DependencyB -> @/shared/utils.py           # [POINTER] 建立横向语义网络

[OUTPUT]: (ReturnType) | Exception
[POS]: 本文件在系统架构中的定位 (e.g., /core 层，只读)

[PROTOCOL]:
1. 任何对输入输出的修改，必须同步更新此 Header。
2. 任何对外部依赖的变更，必须校准 [LINK]。
"""
第二部分：操作哲学 ( The Philosophy )
在不计 Token 成本的前提下，Claude Code 必须遵循以下行为模式：

及早求值 (Eager Evaluation)： 不要猜测 [LINK] 里指向的文件是什么样子的。必须去读源码。

Bad Pattern: 看一眼 Header，大概知道依赖项是干嘛的 -> 开始写代码。

Good Pattern: 看到 Header 有 [LINK] -> 执行 read_file 读取所有依赖文件的真实代码 -> 将它们全部装入 Context -> 开始写代码。

漂移检测 (Drift Detection)： 代码是唯一的真理。

在修改代码前，先对比 Header 描述与下方真实代码是否一致。如果不一致，先发起一个 DocFix 任务，修正文档，再处理业务。

原子化双写 (Atomic Double-Write)： 严禁“裸提交”。

修改了代码逻辑？ -> 必须更新本文件的 [Header]。

新增了文件？ -> 必须更新父目录的 _folder.md。

修改了对外接口？ -> 必须递归检查所有引用方（grep search），并更新它们的 [LINK]。

第三部分：配置载体 ( The Prompt )
请将以下内容保存为项目根目录下的 .claude.md (针对 Claude Code) 或 .cursorrules (针对 Cursor)。

这是让 AI 执行上述逻辑的“大脑指令”。

Markdown

# SYSTEM PROTOCOL: HIGH-INTEGRITY CODING AGENT

你现在运行于【高完整性模式 (High-Integrity Mode)】。
在此模式下，**准确性 (Accuracy) 与 上下文一致性 (Context Consistency)** 优于速度和 Token 消耗。
你必须严格遵守以下 "FractalFlow" 协议进行代码的读取、理解和修改。

## I. 导航与认知 (Navigation & Cognition)

### 1. 分形认知路径
进入任何目录或处理任何文件前，必须建立环境认知：
- **Level 1 (Root)**: 始终知晓 `/README.md` 中的全局架构。
- **Level 2 (Folder)**: 进入某目录时，优先阅读该目录下的 `_folder.md`，理解当前模块的边界与职责。
- **Level 3 (File)**: 阅读代码文件时，首先解析顶部的 `docstring` (Header)。

### 2. 网状链接展开 (The "Net" Expansion)
文件头部的 `[LINK]` 字段是你的“神经网络突触”。
- **规则**: 严禁仅依赖 `[LINK]` 的文本描述。
- **行动**: 当你阅读文件 A，且 A 的 `[LINK]` 指向文件 B 时，你必须利用 `read_file` 工具读取文件 B 的**源代码**。
- **目的**: 必须将当前文件及其直接依赖项的**真实源码**加载到 Context Window 中，构建完全准确的依赖图谱。

## II. 验证与修改 (Verification & Modification)

### 1. 零信任验证 (Zero-Trust Verification)
代码是唯一的真理（Code is King）。文档（Markdown/Comments）仅是索引。
- 在执行任何修改计划前，对比文档描述 (`[INPUT]`/`[OUTPUT]`) 与代码真实逻辑。
- **异常处理**: 如果发现文档与代码不一致（文档漂移），**立即停止当前任务**。优先执行“文档修复”操作，确保索引准确后，再继续原任务。

### 2. 原子化双写 (Atomic Double-Write)
你的任何一次代码变更（Commit）必须保持数据与元数据的一致性。
- **Change Code**: 修改业务逻辑。
- **Update Header**: 同步更新本文件的 `[INPUT]`, `[OUTPUT]`, `[PROTOCOL]` 描述。
- **Update Map**: 如果涉及文件增删或架构变更，同步更新所属目录的 `_folder.md`。

### 3. 递归契约检查 (Recursive Contract Check)
如果你修改了某个函数的**签名 (Signature)** 或 **返回值行为**：
- **搜索**: 使用 `grep` 或 `search` 全局查找所有调用该函数的文件。
- **检查**: 验证调用方是否会因为你的修改而崩溃。
- **修复**: 如果需要，去修改调用方的代码，并更新调用方的 `[LINK]` 指针。
- **原则**: 宁可递归修改 10 个文件，也不能留下 1 个断裂的链接。

## III. 交互行为规范 (Interaction Style)

- 当你发现缺少上下文时，不要猜测。使用工具去获取（grep/ls/read）。
- 当你准备修改核心逻辑时，向用户简要汇报你的“依赖加载情况”（例如：“已读取依赖项 A, B, C 的源码，正在分析影响...”）。
- 你的目标不是“写完代码”，而是“维护一个逻辑严密、文档与代码实时对齐的系统”。

---
User Request Starts Below:
第四部分：如何开始 (Next Step)
Step 1: 初始化基建 在你的项目根目录创建 .claude.md，粘贴上述 Prompt。

Step 2: 建立分形结构 (One-time Setup) 你需要运行一次“重构任务”，让 Claude 帮你建立骨架。你可以直接发送以下命令给 Claude Code：

"Based on the .claude.md rules, please scan the current codebase.

Create a _folder.md for each main directory in /src.

Add the standard Header format (with [LINK] pointing to relative paths) to 3 key core files as a pilot. I understand this will consume tokens, prioritize accuracy."

Step 3: 进入循环 之后，你只需要正常下达业务指令。Claude Code 会因为 .claude.md 的存在，自动触发“读 Header -> 读 Link 源码 -> 校验 -> 修改 -> 更新 Header”的完整闭环。