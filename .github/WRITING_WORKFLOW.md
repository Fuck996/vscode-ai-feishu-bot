# 项目文档编写工作流

本项目使用 AI-powered `doc-writing-workflow` skill 来指导所有文档的创建和修改。此文件说明如何在日常工作中使用此 skill。

## 核心概念

- **Skill 位置**：`.github/skills/doc-writing-workflow/`
- **触发方式**：自动或手动调用 GitHub Copilot Chat
- **适用范围**：所有 `docs/` 目录中的 Markdown 文件

## 何时使用此 Skill

✅ **自动触发场景**（Copilot Chat 会自动建议）：
- 打开或编辑 `docs/` 中的任何 Markdown 文件
- 讨论文档内容、格式或结构
- 提到"文档"、"规范"、"设计"等关键词

✅ **主动调用场景**（您手动启动）：
- 输入 `@doc-writing-workflow` 在 Copilot Chat 中
- 或点击建议"使用此 skill"
- 或在 VS Code 命令面板中打开 Copilot Chat

## 推荐工作流程

### 第一步：安装推荐扩展

当您首次克隆项目后，VS Code 会提示安装推荐扩展。点击"安装推荐扩展"以获得最佳体验：

```
.vscode/extensions.json 包含以下推荐：
- GitHub Copilot & Copilot Chat
- Mermaid Preview
- Markdown Preview Enhanced
- markdownlint
```

### 第二步：修改或创建文档时启动 Skill

**创建新文档：**
```
1. 在 Copilot Chat 中说：「我需要创建一个游戏设计文档」
2. Skill 会自动启动并指导您完成 6 个阶段
3. 跟随指导完成文档
```

**修改现有文档：**
```
1. 打开文档 (e.g., docs/game_design/core_gameplay.md)
2. Copilot Chat 会自动建议使用 skill
3. 点击「使用此 skill」或手动输入 @doc-writing-workflow
4. 描述您的修改需求，skill 会指导
```

### 第三步：遵循强制规则

使用此 skill 时必须遵守 5 项关键规则：

| 规则 | 说明 | 违反后果 |
|-----|------|--------|
| **完整保留** | 不得对用户信息缩写/删节 | 文档审核失败 |
| **澄清问题** | 不明确信息前必须提问 | 文档不准确 |
| **禁止编造** | 不能编造数据/接口/信息 | 文档失实 |
| **标注建议** | 建议/假设需标注「(建议)」 | 读者困惑 |
| **标记操作** | 操作步骤标注「需用户明确指示」 | 防止误执行 |

### 第四步：版本与变更记录

每次有意义的修改后更新：

```markdown
文档版本： v1.0.1

变更记录：
- v1.0.1 - 2026-03-01 - 助手 - 补充支付错误处理说明
- v1.0.0 - 2026-02-27 - 助手 - 初始框架
```

**版本号递增指南：**
- **PATCH** (v1.0.Z)：小修正、澄清
- **MINOR** (v1.X.0)：新章节、重要补充
- **MAJOR** (vX.0.0)：架构变更、整体重组

### 第五步：提交前检查

Skill 会提供最终检查清单。在提交前确保通过所有项：

- ✓ 用户信息完整保留
- ✓ 版本号正确递增
- ✓ 变更记录完整准确
- ✓ 不含编造的数据
- ✓ 建议/假设都标注
- ✓ 操作步骤都标注「需用户明确指示」
- ✓ 无 Q&A 格式或对话记录
- ✓ 专业技术风格

## 详细资源

### Skill 内容

**SKILL.md** — 主工作流程指南
- 6 阶段工作流程（大纲 → 框架 → 内容 → 图表 → 审核 → 发布）
- 格式规范（标题、表格、代码块、版本控制）
- 强制执行规则详解
- 常见文档模板

**workflow-specification.md** — 完整详细规范
- 详细格式指南（标题层级、段落、专有名词、代码块等）
- 写作风格与语气要求
- 完整版本控制规则
- 表格、图表、术语表模板
- 验收标准

**README.md** — 快速参考
- 快速开始
- 常见场景
- 合规检查清单

### 快速指南

**docs/WRITING_GUIDE.md** — 日常使用指南
- 快速启用步骤
- 3 种调用方式
- 工作流程图示
- 常见文档类型
- 示例场景

## GitHub Copilot Chat 集成

### 快速命令

在 Copilot Chat 中：

```bash
@doc-writing-workflow 我需要创建一个新的 API 文档
@doc-writing-workflow 帮我修改这个游戏设计文档
@doc-writing-workflow 检查这个文档是否符合规范
```

### 工作流程示例

```
🙋 用户：「我需要写一个技术规范」

🤖 Copilot（自动建议）：
   「检测到您在编辑技术文档。要使用 doc-writing-workflow skill 吗？」

✅ 用户点击「使用此 skill」

📋 Skill 开始指导：
   Stage 1: 「请提供文档大纲——核心章节和子项」
   → 用户提供大纲
   
   Stage 2: 「我将生成初始框架...」
   → Skill 生成文档框架 (v1.0.0)
   
   Stage 3: 「从哪个章节开始详细开发？」
   → 用户选择章节，Skill 逐节开发
   → 用户反馈，Skill 修改并更新版本号
   
   Stage 4: 「需要添加流程图吗？」
   → Skill 帮助创建图表
   
   Stage 5: 「文档已完成。最终检查清单...」
   → 用户确认通过检查清单
   
   Stage 6: 「准备发布。确保提交源图文件。」

✓ 文档完成并发布
```

## 常见场景

### 场景 1：创建新的游戏设计文档

```
1. 新文件：docs/game_design/new_feature.md
2. Copilot Chat：「@doc-writing-workflow 创建新的游戏设计文档」
3. Skill 引导 6 阶段工作流程
4. 完成后自动检查合规性
```

### 场景 2：修改现有 API 文档

```
1. 打开：docs/game_design/api_endpoints.md
2. Copilot 自动建议「使用 doc-writing-workflow？」
3. 点击使用，说「我需要补充支付接口文档」
4. Skill 帮助修改，更新版本号和变更记录
```

### 场景 3：快速格式检查

```
1. Copilot Chat：「@doc-writing-workflow 检查这个文档是否符合规范」
2. 粘贴或引用文档内容
3. Skill 提供格式反馈和改进建议
```

## 避免常见错误

❌ **常见错误及正确做法：**

| 错误 | 后果 | 正确做法 |
|-----|------|--------|
| 省略版本号 | 文档无法追溯 | 每次修改都更新版本号 |
| 缩写用户信息 | 文档不准确 | 完整保留所有信息 |
| 编造接口/数据 | 误导读者 | 标注为「(建议)」；不确定时提问 |
| 描述性操作步骤 | 可能误执行 | 标注「需用户明确指示后方可执行」 |
| 使用 Q&A 格式 | 不符合规范 | 转化为正式陈述 |

## 支持与反馈

**获得帮助：**
- 在 Copilot Chat 中 `@doc-writing-workflow`
- 查看 `.github/skills/doc-writing-workflow/references/workflow-specification.md`
- 阅读 `docs/WRITING_GUIDE.md`

**报告问题或改进建议：**
- 创建 GitHub Issue（标签：`documentation`）
- 或在代码审查中提出建议

---

**最后提醒：** 文档是项目质量的关键。使用此 skill 不仅追求效率，更追求**准确性、可维护性和一致性**。让我们一起维护高质量的项目文档！
