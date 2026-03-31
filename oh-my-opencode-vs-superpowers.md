# oh-my-opencode 与 Superpowers 对比研究报告

## 一、项目概述

### 1.1 oh-my-opencode（现名 oh-my-openagent / omo）

oh-my-opencode 是 OpenCode 的增强插件系统，由开发者 code-yeongyu 创建和维护。该项目最初名为 oh-my-opencode，后更名为 oh-my-openagent，现品牌化为 "omo"——自称“最好的 Agent  Harness”（Agent 编排框架）。截至2026年3月，该项目已在 GitHub 获得超过 45,100 颗星标，主要编程语言为 TypeScript。

该项目的一个显著背景是：Anthropic 曾因为该团队的原因封禁了 OpenCode，这成为项目名称 "Hephaestus"（火神，意为“合法的工匠”）的灵感来源。开发者明确表示，他们的理念是“不锁定任何模型”，支持 Claude、Kimi、GLM、GPT、Gemini、Minimax 等多种模型的编排调用。

### 1.2 Superpowers

Superpowers 是由 Jesse Vincent（Keyboardio 创始人）创建的一个 Agent 技能框架和软件开发方法论。该项目定位为“为你的编码 Agent 提供完整的软件开发工作流”，通过一套可组合的“技能”（Skills）来规范和自动化开发流程。截至2026年3月，Superpowers 在 GitHub 已获得约 126,000 颗星标，成为 GitHub 增长最快的仓库之一。

Superpowers 兼容多个主流 AI 编码平台，包括 Claude Code、Cursor、Codex、OpenCode 和 Gemini CLI，通过统一的技能系统提供一致的开发体验。

---

## 二、核心功能对比

### 2.1 oh-my-opencode 核心功能

oh-my-opencode 的核心设计理念是“开箱即用，零配置体验”。其最重要的功能包括：

**（1）ultrawork 命令**

这是 oh-my-opencode 的标志性功能。用户只需输入 `ultrawork` 或简写 `ulw`，所有 Agent 系统会自动激活，持续执行直到任务完成。

**（2）Discipline Agents（纪律型 Agent 团队）**

oh-my-opencode 内置了多个专业化 Agent，形成完整的 AI 开发团队：
- **Sisyphus（西西弗斯）**：主协调器，负责规划、委托任务给专家 Agent
- **Hephaestus（赫菲斯托斯）**：自主深度工作者，擅长探索代码库、研究模式
- **Prometheus（普罗米修斯）**：战略规划师，以面试模式提问用户，识别范围和歧义

**（3）Hash-Anchored Edit Tool（哈希锚定编辑工具）**

这是 oh-my-opencode 的核心技术创新之一。通过“Hashline”机制，Agent 读取的每一行代码都带有内容哈希标签，编辑时通过引用这些标签来定位修改，避免“陈旧行错误”。官方数据显示，这一改变将编辑成功率从 6.7% 提升到 68.3%。

**（4）内置 MCP 服务**

预装了多个 Model Context Protocol 服务器：Exa（网页搜索）、Context7（官方文档查询）、Grep.app（GitHub 代码搜索），用户无需额外配置即可使用。

**（5）其他核心功能**

- LSP + AST-Grep 工具集成
- 后台 Agent 并行执行
- Ralph Loop 自引用循环机制
- IntentGate 意图门控分析
- Skill-Embedded MCPs 技能嵌入式 MCP

### 2.2 Superpowers 核心功能

Superpowers 采用“技能驱动”的方法论，核心是一系列自动触发的技能模块：

**（1）Brainstorming（头脑风暴）**

在编写代码之前激活，通过苏格拉底式提问精炼粗糙的想法，探索替代方案。

**（2）Using Git Worktrees（Git 工作树使用）**

在新分支上创建隔离的工作空间，支持并行开发分支。

**（3）Writing Plans（编写计划）**

将工作分解为 2-5 分钟可完成的小任务，每个任务包含精确的文件路径、完整代码和验证步骤。

**（4）Subagent-Driven Development（子 Agent 驱动开发）**

为每个任务分配新的子 Agent，采用两阶段审查（规范合规性检查，然后代码质量检查）。

**（5）Test-Driven Development（测试驱动开发）**

强制执行 RED-GREEN-REFACTOR 周期：先写失败的测试，观察失败，写最少量代码，观察通过，然后重构。

**（6）Systematic Debugging（系统化调试）**

四阶段根本原因分析过程，包括根因追踪、纵深防御、基于条件的等待等技术。

---

## 三、架构设计对比

### 3.1 oh-my-opencode 的架构设计

oh-my-opencode 采用 **Agent 编排为核心** 的架构。其设计理念是将多个专业 Agent 视为一个分布式团队，通过 Sisyphus 作为“大脑”进行协调。每个 Agent 被分配到特定的“类别”（Category），系统自动根据类别映射到最适合的模型。

在编辑工具层面，oh-my-opencode 重新设计了整个编辑管道，通过哈希锚定机制解决了“ harness problem”（编辑工具不稳定导致的 Agent 失败问题）。

在 MCP 集成层面，oh-my-opencode 采用了“技能嵌入式 MCP”架构，技能和 MCP 服务绑定，按需加载，无需全局注册。

### 3.2 Superpowers 的架构设计

Superpowers 采用 **技能工作流为核心** 的架构。其设计理念是：Agent 在执行任何任务之前都会自动检查是否有相关的技能应该被激活，技能是强制性的工作流，而非可选建议。

Superpowers 的架构更为轻量级，主要通过提示词（prompts）和对话指令来引导 Agent 行为，而非深度集成底层工具。这种设计的优势在于跨平台兼容性极高，可以在 Claude Code、Cursor、Codex、OpenCode、 Gemini CLI 之间无缝迁移。

---

## 四、主要区别分析

### 4.1 设计理念差异

**oh-my-opencode** 采用“垂直整合”策略，试图在 OpenCode 平台上构建一个完整封闭的 AI 开发环境。它追求的是“一体化体验”，从模型编排、任务分配、代码编辑到上下文管理，全部纳入插件范畴。

**Superpowers** 采用“横向整合”策略，在多个 AI 编码平台上构建统一的工作流层。它不试图替代平台本身的功能，而是通过技能系统规范 Agent 的行为模式。

### 4.2 技术实现差异

**oh-my-opencode** 的技术实现深度嵌入 OpenCode 平台，包括：自定义编辑工具（哈希锚定）、LSP/AST 集成、后台 Agent 调度、Todo 强制机制等。这种深度集成带来了更高的稳定性和效率，但也意味着与特定平台（OpenCode）强绑定。

**Superpowers** 的技术实现主要基于提示词和对话流程控制，通过自然语言指令引导 Agent 行为。它不依赖平台特定的 API 或内部机制，而是通过“触发条件”来激活技能。

### 4.3 团队模式差异

**oh-my-opencode** 模拟的是一个“交响乐团”模式：Sisyphus 是指挥，协调多个乐手（Hephaestus、Prometheus、Oracle、Librarian、Explore 等）同时演奏。强调的是并行执行和任务 delegation。

**Superpowers** 模拟的是一个“流水线”模式：每个阶段（头脑风暴、规划、执行、测试、审查）必须按顺序完成，强调的是工作流规范和质量控制。

---

## 五、主要特性对比表

| 特性维度 | oh-my-opencode | Superpowers |
|----------|----------------|--------------|
| **定位** | Agent 编排框架 + 开发环境 | 软件开发方法论 + 技能系统 |
| **核心命令** | `ultrawork` / `ulw` | 技能自动触发，无需专门命令 |
| **星标数** | 45,100+ | 126,000+ |
| **主语言** | TypeScript | Shell + JavaScript |
| **多模型支持** | 完整支持（自动路由） | 依赖平台本身 |
| **Agent 类型** | Sisyphus, Hephaestus, Prometheus | 通过技能激活的子 Agent |
| **编辑工具** | 自研哈希锚定编辑工具 | 依赖平台本身 |
| **并行能力** | 后台 Agent 并行执行 | 技能驱动的并行开发 |
| **测试流程** | 基础支持 | RED-GREEN-REFACTOR 强制流程 |
| **调试方法** | 多 Agent 协作 | Systematic Debugging 四阶段法 |
| **规划工具** | Prometheus 面试模式规划器 | Writing Plans 任务分解 |
| **跨平台** | OpenCode 深度集成 | 多平台兼容（Claude Code、Cursor、Codex、OpenCode、 Gemini CLI） |
| **配置需求** | 零配置（默认即可工作） | 少量配置 |
| **技能系统** | Skill-Embedded MCP（嵌入式） | 技能模块（可扩展） |
| **MCP 集成** | 内置 Exa、Context7、Grep.app | 依赖平台 MCP 能力 |
| **工作流模式** | 并行协调模式 | 流水线规范模式 |
| **适用规模** | 中大型项目 | 各类项目 |
| **许可证** | NOASSERTION | MIT |

---

## 六、适用场景对比

### 6.1 oh-my-opencode 适用场景

**（1）大型复杂项目开发**

当项目涉及多个模块、多种技术栈、需要在多个文件之间进行大规模重构时，oh-my-opencode 的后台 Agent 并行能力和哈希锚定编辑工具能显著提高效率。

**（2）需要多模型协作的项目**

当项目需要不同模型擅长不同任务时（例如：Claude 做逻辑推理、GPT 做创意生成、Kimi 做快速修改），oh-my-opencode 的模型自动路由能力最为合适。

**（3）追求零配置体验的用户**

用户不想花时间配置工作流，只想“安装后即用”，`ultrawork` 命令可以满足这一需求。

**（4）需要深度代码探索的任务**

Hephaestus Agent 擅长代码库探索和研究模式，适合需要理解大型遗留代码库的任务。

**（5）需要战略规划的任务**

Prometheus Agent 的面试模式规划器适合需求不明确、范围不确定的复杂项目。

### 6.2 Superpowers 适用场景

**（1）需要规范开发流程的团队**

当团队需要统一的代码编写规范、测试流程、审查流程时，Superpowers 的技能系统可以强制执行这些规范。

**（2）跨平台工作的开发者**

当开发者在不同平台（Claude Code、Cursor、OpenCode、Codex）之间切换工作时，Superpowers 的统一技能层可以保持一致的开发体验。

**（3）重视测试驱动开发的团队**

RED-GREEN-REFACTOR 流程被内置为强制技能，适合坚持 TDD 实践的开发者。

**（4）需要系统化调试的项目**

当遇到难以复现的 Bug 时，systematic-debugging 技能的四阶段分析方法可以避免“猜测式调试”。

**（5）需要并行开发多个功能的项目**

Git worktrees 技能和并行 Agent 技能适合需要同时开发多个功能分支的场景。

### 6.3 场景选择建议

| 场景 | 推荐工具 |
|------|----------|
| 大型重构项目 | oh-my-opencode |
| 多模型协同需求 | oh-my-opencode |
| 零配置快速上手 | oh-my-opencode |
| 规范团队开发流程 | Superpowers |
| 跨平台一致性 | Superpowers |
| TDD 实践要求 | Superpowers |
| 系统化调试需求 | Superpowers |
| 并行分支开发 | 两者均可 |

---

## 七、GitHub 仓库信息

### 7.1 oh-my-opencode（oh-my-openagent / omo）

- **仓库地址**：https://github.com/code-yeongyu/oh-my-openagent
- **备用仓库**（fork）：https://github.com/opensoft/oh-my-opencode
- **星标数**：45,100+（截至2026年3月）
- **Fork 数**：3,400+
- **主语言**：TypeScript (94.6%)
- **提交数**：4,199+ commits
- **许可证**：NOASSERTION
- **Discord 社区**：https://discord.gg/PUwSMR9XNk

### 7.2 Superpowers

- **仓库地址**：https://github.com/obra/superpowers
- **星标数**：126,000+（截至2026年3月）
- **Fork 数**：10,300+
- **主语言**：Shell (57.4%), JavaScript (30.6%)
- **提交数**：407 commits
- **许可证**：MIT
- **Discord 社区**：https://discord.gg/Jd8Vphy9jq
- **市场店铺**：https://github.com/obra/superpowers-marketplace

---

## 八、总结与建议

### 8.1 核心结论

oh-my-opencode 和 Superpowers 代表了 AI 辅助开发工具的两种不同设计哲学：

**oh-my-opencode** 是“垂直整合派”，追求在单一平台（OpenCode）上构建完整封闭的 AI 开发环境。它通过深度技术集成（自定义编辑工具、LSP 集成、多模型编排）实现高效的任务执行。如果用户已经在使用 OpenCode 并追求最佳开发效率，oh-my-opencode 是首选。

**Superpowers** 是“横向整合派”，追求在多个平台上实现一致的开发方法论。它通过技能系统规范化开发流程，而不深入平台的底层实现。如果用户需要跨平台工作或重视团队开发规范的一致性，Superpowers 是首选。

### 8.2 选择建议

- **如果你使用 OpenCode**：两者都可以使用，oh-my-opencode 提供更深度的集成，Superpowers 提供方法论补充。可以考虑组合使用。

- **如果你使用 Claude Code / Cursor / Codex**：Superpowers 是更自然的选择，可以通过官方插件市场安装。oh-my-opencode 需要通过 OpenCode 间接使用。

- **如果你需要处理大型重构**：oh-my-opencode 的哈希锚定编辑工具和并行 Agent 能力更适合。

- **如果你需要团队开发规范**：Superpowers 的技能系统更容易推广为团队标准。

- **如果你追求零配置体验**：oh-my-opencode 的 `ultrawork` 命令更符合“安装即用”的理念。

---

## 参考资源

- oh-my-opencode 官方文档：https://github.com/code-yeongyu/oh-my-openagent
- oh-my-opencode 安装指南：https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/refs/heads/dev/docs/guide/installation.md
- Superpowers 官方仓库：https://github.com/obra/superpowers
- Superpowers 官方博客：https://blog.fsck.com/2025/10/09/superpowers/
- "The Harness Problem" 论文：https://blog.can.ac/2026/02/12/the-harness-problem/
