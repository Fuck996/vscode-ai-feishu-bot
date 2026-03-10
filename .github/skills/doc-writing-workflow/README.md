# Document Writing Workflow Skill

This skill guides users through structured, compliant document creation that follows enterprise standards for design documents, technical specifications, API documentation, and game design documents.

## What This Skill Does

- **Guides document creation** from outline through publication
- **Enforces format compliance** (headings, versioning, change logs)
- **Ensures quality** through iterative review and refinement
- **Maintains consistency** across all project documentation

## When to Use

Trigger this skill when:
- User mentions writing/creating documentation, specs, design docs
- User says "write a design document", "create an API doc", "document a feature"
- User is starting any substantial technical writing project
- User wants to ensure their document follows project standards

## Quick Start

### Stage 1: Outline
1. User provides document title and top-level sections
2. Assistant clarifies scope, audience, success criteria
3. Confirm document structure

### Stage 2: Framework
1. Assistant creates initial document structure
2. Adds version number and change log section
3. Document ready for content

### Stage 3: Content
1. User flags which section to develop
2. Assistant drafts content (one section at a time)
3. User provides feedback; assistant refines incrementally
4. Repeat for all sections

### Stage 4: Diagrams
1. Create Mermaid diagrams in `docs/diagrams/`
2. Embed code blocks in document
3. Export PNG/SVG to `docs/diagrams/assets/`

### Stage 5: Final Review
1. User reads entire document
2. Assistant validates compliance
3. User approves for publication

### Stage 6: Publication
1. Merge document to main branch
2. Commit all source and export files

## Key Standards

**Format:**
- Language: Simplified Chinese (UTF-8)
- Version format: `v{MAJOR}.{MINOR}.{PATCH}`
- Minimum 4 columns for tables; max 12
- All headings `##` or deeper (except `#` for title)

**Critical Rules:**
- ✓ No abbreviation of user-provided information
- ✓ Ask clarifying questions before assuming
- ✓ No fabricated data (mark suggestions as "建议")
- ✓ Flag all actionable steps "需用户明确指示后方可执行"
- ✓ No Q&A format or dialogue in documents
- ✓ Update version and change log after each change

**Content Standards:**
- Professional, technical tone
- Active voice, imperative instructions
- Tables with field name | type | description | notes
- Diagrams in `docs/diagrams/`, exports in `docs/diagrams/assets/`

## File References

- **`SKILL.md`** — Main workflow guide and formatting rules
- **`references/workflow-specification.md`** — Complete formal specification with detailed examples, templates, and compliance rules

## Common Document Types

### Design Document
```
Outline > Framework > Sections (系统概述, 核心玩法, 数据模型, etc.) > Diagrams > Final Review
```

### API Documentation
```
Outline > Framework > Sections (概述, 认证, 端点列表, 错误码) > Examples > Final Review
```

### Technical Specification
```
Outline > Framework > Sections (背景, 架构, 实现细节, 测试计划) > Diagrams > Final Review
```

## Compliance Checklist

Before publishing a document:

- [ ] Outline approved by user
- [ ] All sections drafted and refined
- [ ] Format: titles, tables, code blocks compliant
- [ ] Version number current (`v{M}.{m}.{p}`)
- [ ] Change log entries present and accurate
- [ ] No user information abbreviated or paraphrased
- [ ] Clarifying questions asked for any ambiguities
- [ ] No fabricated data (suggestions marked "建议")
- [ ] Actionable steps flagged "需用户明确指示后方可执行"
- [ ] No Q&A or dialogue format
- [ ] Professional tone throughout
- [ ] Diagrams sourced and exported correctly
- [ ] User final review and approval obtained

## Tips

1. Start with a clear outline — don't draft without agreement on structure
2. Draft one section at a time and get feedback before moving to the next
3. Update version number after every meaningful change (not just at end)
4. Ask clarifying questions early; it's better to ask 3 times upfront than rewrite later
5. Preserve user information exactly as provided — no paraphrasing
6. Always test readability by stepping back and rereading
7. Keep Mermaid source files (`.mmd`); exports are derivatives

---

For detailed format examples, versioning rules, and document templates, see `references/workflow-specification.md`.
