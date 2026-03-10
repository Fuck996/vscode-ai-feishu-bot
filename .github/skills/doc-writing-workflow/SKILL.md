---
name: doc-writing-workflow
description: Guide users through structured document creation following enterprise standards. Use unconditionally for ANY modification to Markdown files in the docs/ directory or whenever the user is working with design documents, technical specifications, game design docs, API documentation, or formal technical documentation. This skill ensures documents follow the project's comprehensive style guide, versioning rules, format standards, and approval workflow. Trigger AUTOMATICALLY and proactively when: (1) User opens or edits any Markdown file in docs/; (2) User mentions "writing a doc", "need to document", "create a spec", "design doc", "technical design", "API doc"; (3) User is creating or modifying any formal documentation; (4) User is updating version numbers or change logs. IMPORTANT: This skill should be offered for ANY doc-related work, even if the user doesn't explicitly ask—offer it proactively. Ensure consistency and quality by using this skill as your default workflow for all documentation tasks.
---

# Document Writing Workflow

A comprehensive skill for guiding users through structured, compliant document creation that follows enterprise standards. This workflow ensures all documents maintain consistency, traceability, and professional quality.

## When to Trigger This Skill

**Automatic triggers:**
- User mentions writing/creating documentation, specs, design docs, RFCs, proposals
- User says "I need to document...", "let's write a spec", "create a design doc"
- User references specific doc types: "technical design", "API documentation", "game design", "data schema", "architecture"
- Any substantial technical writing requiring formal structure

**Manual trigger:** If user is clearly writing technical content but hasn't mentioned documentation explicitly, proactively offer this workflow.

## Document Standards Overview

All documents in this project must follow these standards (see full specification in the workflow reference):

**Format & Style:**
- **Language:** Simplified Chinese (UTF-8 encoding)
- **Titles:** Use Markdown headers (`##` minimum for content body; `#` reserved for doc title only)
- **Paragraphs:** Maximum 8 lines per paragraph; use lists for key points
- **Code/API:** Wrap in backticks (e.g., `POST /auth/login`, `wx.login`)
- **Tables:** Minimum 4 columns (`字段名 | 类型 | 描述 | 备注`); max 12 columns for readability
- **Diagrams:** Source files in `docs/diagrams/`, Mermaid code blocks or PNG/SVG exports in documents

**Tone & Voice:**
- Professional, precise, technical writer style
- Active voice; clear, imperative instructions
- Avoid casual language, flowery expressions, Q&A format
- No chat history, dialogue, or conversational content in docs

**Versioning & Change Log:**
- Version format: `v{MAJOR}.{MINOR}.{PATCH}` (e.g., `v1.0.0`)
- Every document must end with:
  - `文档版本：` section with current version
  - `变更记录：` section with dated entries: `vX.Y.Z - YYYY-MM-DD - <Author> - <≤50 char summary>`

**Critical Compliance Rules (Mandatory Enforcement):**
1. **No abbreviation of user-provided information** — preserve all factual details exactly
2. **Ask clarifying questions** before making assumptions on key facts
3. **No fabricated data** — mark all suggestions/assumptions as "(建议)" with reasoning
4. **Flag actionable steps** with "需用户明确指示后方可执行"
5. **No operational checklists** in document body — external decision items only

## Workflow Stages

### Stage 1: Outline & Planning

**User role:**
- Provide document title and top-level outline (core sections and sub-items)
- Identify stakeholders, audience, success criteria
- Share existing templates or reference documents

**Assistant role:**
- Clarify required sections based on document type
- Ask about edge cases, input/output formats, success criteria
- Confirm document type and scope
- Suggest default structure if user hasn't defined one

**Output verification:**
- [ ] Document title confirmed
- [ ] Outline structure agreed upon
- [ ] Scope, audience, and success criteria documented
- [ ] Any existing templates or constraints identified

### Stage 2: Framework Generation

**Assistant role:**
- Generate initial document structure with all section headers and placeholder text
- Add version number `v1.0.0` and initial change log entry
- Create the file (using artifacts or file creation) in the working directory
- Format: `\`\`\`SECTION_NAME\`\`\` placeholders for each section

**Output:**
- Complete document skeleton with all sections
- Document and change log sections ready for content
- Ready for Stage 3 iteration

### Stage 3: Iterative Content Development

**Process:**
1. User flags which section needs detailed development
2. Assistant drafts content for that section, including:
   - Technical details from the outline
   - Code examples, API specs, or data formats as needed
   - Rationale and implementation notes (if applicable)
3. User provides feedback: "Make this clearer", "Remove X", "Add Y"
4. Assistant applies surgical edits using string replacement (never rewrite entire doc)
5. **Increment version** after each meaningful change:
   - Patch increment (v1.0.Z) for minor fixes/clarifications
   - Minor increment (v1.X.0) for section additions or significant rewrites
   - Add change log entry with ≤50 character summary

**Continue until user approves section.** Then move to next section.

### Stage 4: Diagrams & Visualization

**For flow diagrams, architecture diagrams, or data relationships:**

1. Source file location: `docs/diagrams/` (use `.mmd` or `.mermaid` extension)
2. Embed Mermaid code blocks (`\`\`\`mermaid\`\`\`) in document
3. Export PNG/SVG to `docs/diagrams/assets/` (alternative viewing for non-Mermaid clients)
4. Use relative paths in document references

**After adding diagrams:**
- Add this note: "（重要提示：此流程图源文件存储在 `docs/diagrams/` 目录中；导出版本存储在 `docs/diagrams/assets/`）"

### Stage 5: Final Review & Approval

**User responsibilities:**
- Read entire document end-to-end
- Verify all facts, links, technical details are correct
- Check that document achieves intended impact
- Flag any missing sections or unclear passages

**Assistant responsibilities:**
- Perform full document review for consistency, flow, contradictions, "filler"
- Suggest final improvements
- Validate against standards checklist

**Approval checklist:**
- [ ] All sections complete and coherent
- [ ] Version number and change log updated appropriately
- [ ] No Q&A format, dialogue, or chat history
- [ ] All user-provided information preserved (no abbreviations)
- [ ] Actionable steps flagged with "需用户明确指示后方可执行"
- [ ] Diagrams properly sourced and formatted
- [ ] Professional tone maintained throughout
- [ ] User confirms document ready for merge

### Stage 6: Archival & Publication

**After user approval:**
1. Commit document and source diagram files (`docs/diagrams/*.mmd`) to repository
2. Ensure exported diagrams (`docs/diagrams/assets/`) included
3. Update project documentation index if applicable

---

## Format Compliance Checklist

Use this checklist after writing each section:

**Structure:**
- [ ] All headings use `##` or deeper (no lone `#` except document title)
- [ ] Paragraphs are ≤8 lines
- [ ] Key points formatted as lists (unordered or ordered)

**Content:**
- [ ] No Q&A format; no reader direct questions (→ use "Decision Items" instead)
- [ ] No dialogue history or chat logs
- [ ] All APIs/interfaces wrapped in backticks
- [ ] Code examples in proper code blocks (`\`\`\`json\`\`\`, `\`\`\`bash\`\`\`, etc.)

**Tables:**
- [ ] Minimum 4 columns (字段名 | 类型 | 描述 | 备注)
- [ ] Maximum 12 columns
- [ ] Clear headers

**Versioning & Metadata:**
- [ ] Document version present at end (v1.0.0 format)
- [ ] Change log with all modifications documented
- [ ] Each entry: `vX.Y.Z - YYYY-MM-DD - <Author> - <≤50 characters>`

**Compliance Rules:**
- [ ] No user-provided information abbreviated or paraphrased
- [ ] Suggestions/assumptions marked as "(建议)" with rationale
- [ ] No fabricated data or non-existent interfaces
- [ ] Actionable steps flagged "需用户明确指示后方可执行"
- [ ] Professional, imperative tone throughout

---

## Key Principles

### Preserve User Information Precisely

Never abbreviate, paraphrase, or omit user-provided facts. If information is dense or complex, ask clarifying questions **before** writing, then preserve exactly as confirmed.

**Example:**
- ❌ User says "我需要支持微信登录和支付"; you write "支持社交登入和支付处理"
- ✅ Write exactly: "支持微信登录 (`wx.login`) 和支付接口 (`wx.requestPayment`)"

### Ask Before Assuming

If a critical detail is missing, ask explicitly:
- "您提到的'高性能'是指响应时间<100ms 还是吞吐量>10k req/s？"
- "数据存储位置——这是指云端数据库还是本地缓存？"

Wait for confirmation before proceeding.

### Mark All Speculation

Any suggestion or assumption must be labeled:
- "(建议) 根据性能要求，推荐使用 Redis 缓存，而非本地内存"
- "(假设) 假设每月新增玩家 10k，则峰值 QPS 估算为 500"

Include reasoning and uncertainty level.

### No Fabricated Details

**Never invent:**
- API endpoints that don't exist in your knowledge
- Data formats not confirmed with user
- Architectural decisions without user input
- Performance numbers without source

If uncertain, write: "需确认：该接口具体返回格式是什么？"

### Flag Operational Steps

Any instruction that requires action must be marked:

```
**需用户明确指示后方可执行：**
以下步骤需要您的确认才能启动：
1. 创建新的 Git 分支 ...
2. 修改配置文件 ...
```

### No Suggestions-in-Document Checklists

Don't write operational "next steps" inside the document. Instead, communicate them outside the doc:
- ❌ Document footers with "建议：合并完后运行 npm install..."
- ✅ Verbally: "Once approved, I suggest we run `npm install` and test the deployment config"

---

## Common Document Types & Structures

### Design Document (游戏设计/产品设计)

```
## 概述
##核心玩法
## 用户流程
## 数据模型
## 技术架构
## 风险与依赖
## 变更记录
```

### API Documentation

```
## 概述
## 认证 (Authentication)
## 端点列表
  - GET /resource
  - POST /resource
  - etc.
## 数据类型 & 错误码
## 示例用途 (Use Cases)
## 变更记录
```

### Technical Specification

```
## 背景 & 需求
## 系统架构
## 核心组件
## 实现细节
## 测试计划
## 部署计划
## 变更记录
```

---

## Examples

### Example: Document Version & Change Log

```
文档版本： v1.0.2

变更记录：
- v1.0.2 - 2026-03-01 - 助手 - 新增支付接口文档，修正登录流程描述
- v1.0.1 - 2026-02-27 - 助手 - 添加数据模型表格，澄清认证机制
- v1.0.0 - 2026-02-27 - 助手 - 初始文档框架
```

### Example: API Documentation Section

```
### POST /api/players/login

**请求**：
\`\`\`json
{
  "appId": "string",
  "code": "string"
}
\`\`\`

**响应 (200 OK)**：
\`\`\`json
{
  "playerId": "string",
  "token": "string",
  "expiresIn": 7200
}
\`\`\`

**错误**：
- `400`: 缺少必需参数
- `401`: 无效的 appId 或 code
```

### Example: Data Model Table

```
| 字段名 | 类型 | 描述 | 备注 |
|---|---|---|---|
| playerId | string | 玩家唯一 ID | 后端生成，不可修改 |
| nickname | string | 玩家昵称 | 来源：`wx.getUserProfile` |
| level | integer | 玩家等级 | 1-100，初始值为 1 |
| coins | integer | 游戏币余额 | 不能为负数 |
```

---

## Workflow Tips

1. **Start with outline** — don't jump to drafting without user agreement on structure
2. **Incremental refinement** — draft one section at a time, get feedback, refine
3. **Version after each change** — don't wait until the end; this aids traceability
4. **Ask clarifications early** — better to ask 3 questions up front than rewrite later
5. **Preserve user info exactly** — this is non-negotiable; if unsure, ask again
6. **No brainstorming in docs** — discussion happens outside; only finalized content goes in
7. **Test readability** — occasionally step back and reread; if it's confusing to you, it's confusing to readers
8. **Diagram source control** — always keep `.mmd` originals; exports are derivatives

---

## Document Versioning Rules

**Format:** `v{MAJOR}.{MINOR}.{PATCH}`

**When to increment:**
- **MAJOR** (v2.0.0): Architectural changes, section reorganization, scope expansion
- **MINOR** (v1.1.0): New sections, significant clarifications, new features documented
- **PATCH** (v1.0.1): Typo fixes, minor clarifications, small corrections

**Do not:**
- Skip version numbers
- Update version without adding to change log
- Use non-numeric versioning (e.g., "v1.0.1a" or "latest")

---

## Mandatory Compliance Rules (Strong Enforcement)

These rules must be followed in all documents. Violations prevent approval:

1. **User information integrity:** No abbreviations, paraphrasing, or omissions of user-provided facts. Preserve exactly as confirmed.

2. **Clarification before drafting:** If critical information is unclear or missing, ask clarifying questions and wait for confirmation before proceeding.

3. **No fabrication:** Do not invent data, endpoints, formats, or decisions. Mark all suggestions/assumptions with "(建议)" and explain reasoning.

4. **Transparent suggestions:** All authorial suggestions or assumptions must be clearly labeled and justified. Reader should always know what's from the user vs. what's from the assistant.

5. **Actionable step flagging:** Any instruction that requires user action or external resource must be marked "需用户明确指示后方可执行" to prevent accidental execution.

6. **No Q&A or dialogue:** Strictly exclude question-answer format, chat logs, or conversational content. Convert all discussion into formal assertions.

7. **Version discipline:** Every document must have precise versioning (v{MAJOR}.{MINOR}.{PATCH}) and dated change logs. No version increments without change log entries.

8. **Validation before merge:** All documents must pass this checklist before being merged. Use reference schemas and validation tools if available.

---

## References

See `references/workflow-specification.md` for the complete formal specification rules, including detailed format examples, table templates, diagram workflows, and architectural patterns.

## Exit Criteria

A document is complete and ready for approval when:
- ✓ All sections drafted and refined per user feedback
- ✓ Tone and format compliant throughout
- ✓ Version number and change log current
- ✓ No user information abbreviated or invented
- ✓ All suggestions flagged; all assumptions justified
- ✓ Diagrams sourced and exported correctly
- ✓ Passes compliance checklist
- ✓ User has confirmed final review and approves publication
