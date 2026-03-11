# 常见问题快速答案 (FAQ)

## Q1: Copilot 和 MCP 服务器之间是如何工作的？

**简答**: 
- Copilot 通过 stdio (标准输入输出) 与 MCP 通信
- MCP 暴露 `feishu_notify` 工具给 Copilot
- Copilot 按 `copilot-instructions.md` 约定决定何时调用
- MCP 对所有调用应用相同的格式化规范

**关键流程**:
```
Copilot → (认读 instruction) → 决定何时调用 feishu_notify
   ↓
MCP ← (stdio 通信) ← 参数
   ↓
MCP 格式化 (✅/🔧/📝)
   ↓
HTTP POST 到后端
   ↓
后端转发到飞书
```

**技术细节**: 查看 [`docs/MCP_ARCHITECTURE_AND_USER_CONFIG.md`](MCP_ARCHITECTURE_AND_USER_CONFIG.md) 中的"第一部分"

---

## Q2: 这些约束和规范（✅/🔧/📝）是由 MCP 强制的吗？其他会话使用 MCP 时是否也会受到影响？

**简答**: 
- **是的**，约束由 MCP 强制（在 `mcp-server/index.js` 中实现）
- **是的**，所有通过 MCP 的调用都会受到影响
- 这是 **设计目的**，不是bug

**原理**:
```
格式化逻辑在 MCP 侧 (服务端)
   ↓
所有客户端都会执行同样的约束
   ↓
无论是 VS Code1 / VS Code2 / Cursor / 其他IDE
   都得到一致的规范输出 ✅
```

**优势**:
- 📋 规范统一 (SSOT: Single Source of Truth)
- 🔄 支持多工具跨平台调用
- 📈 升级规范时无需改动客户端代码
- 🔍 便于审计和追踪

**技术细节**: 查看 [`docs/MCP_ARCHITECTURE_AND_USER_CONFIG.md`](MCP_ARCHITECTURE_AND_USER_CONFIG.md) 中的"第三部分"

---

## Q3: MCP 服务器和后端是否应该部署在一起？

**简答**:
- 在 **本地开发**: 分开部署（MCP 在 VS Code，后端在 3000 端口）
- 在 **生产环境**: 建议分开但使用共享配置（如 Docker Compose）

**部署拓扑图**:

```
本地开发                      生产环境
─────────────────────────────────────────
VS Code (MCP)    ┐             容器1 (MCP)
└→ localhost:3000│   vs        容器2 (后端)
                 │             └→ 共享 .env
              相同             └→ 共享配置

关键点: MCP 需要 HTTP 连接到后端
      └→ 所以后端必须是网络可访问的
```

**推荐方案**:
1. **开发**: MCP + 后端分开启动 ✅
2. **Docker**: 两个独立容器 + docker-compose 共享网络 ✅
3. **Kubernetes**: 两个独立 Pod + 共享 ConfigMap ✅

**技术细节**: 查看 [`docs/MCP_ARCHITECTURE_AND_USER_CONFIG.md`](MCP_ARCHITECTURE_AND_USER_CONFIG.md) 中的"第四部分"

---

## Q4: 前端加上 MCP 和后端的相关设置是否可行？

**简答**:
- **可行**，而且推荐这样做
- 用户可在前端 Settings 中配置项目名称、通知格式、偏好选项
- 安全敏感参数 (TOKEN, WEBHOOK_ENDPOINT) 由后端管理

**可配置的范围**:

| 配置项 | 位置 | 是否前端可控 |
|-------|------|-----------|
| 项目显示名称 | Settings | ✅ 是 |
| 汇报格式风格 | Settings | ✅ 是 |
| 时间戳显示 | Settings | ✅ 是 |
| WEBHOOK_ENDPOINT | .env | ❌ 否（安全敏感） |
| TRIGGER_TOKEN | .env | ❌ 否（认证令牌） |
| MCP 版本升级 | 系统管理 | ❌ 否（业务规范） |

**实现方案**:

```
前端 Settings 页面
├─ 【项目配置】
│  ├─ 项目名称: [用户输入框]
│  ├─ 显示标签: [多选复选框]
│  └─ 描述: [文本区域]
│
├─ 【汇报格式】
│  ├─ 格式风格: ◉ 标准 ○ 简洁 ○ 详细
│  ├─ ☐ 显示时间戳
│  ├─ ☐ 显示项目信息
│  └─ [预览按钮] → API /api/mcp/preview
│
└─ [保存] → API POST /api/robots/:id/integrations/:id/preferences
```

**需新增的后端 API**:
- `GET /api/robots/:robotId/integrations/:integrationId/preferences` - 获取用户偏好
- `PUT /api/robots/:robotId/integrations/:integrationId/preferences` - 保存偏好
- `POST /api/mcp/preview` - 预览格式化效果

**技术细节**: 查看 [`docs/MCP_ARCHITECTURE_AND_USER_CONFIG.md`](MCP_ARCHITECTURE_AND_USER_CONFIG.md) 中的"第五、六、七部分"

---

## 总体建议

```
┌────────────────────────────────────────────────────────────┐
│ 建议实施路线图                                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Phase 1 (当前) ✅                                         │
│ ├─ MCP 约束规范已实现                                     │
│ ├─ 后端转发已完成                                         │
│ └─ 飞书集成已上线                                         │
│                                                            │
│ Phase 2 (建议实施)                                         │
│ ├─ 扩展数据库：integration 加 preferences 字段            │
│ ├─ 新增 3 个后端 API 端点                                 │
│ ├─ 前端 Settings 添加 MCP 配置区块                        │
│ └─ 用户可通过 UI 配置格式、名称、显示选项                │
│                                                            │
│ Phase 3 (未来)                                            │
│ ├─ 多集成支持（一个机器人多个项目）                      │
│ ├─ 集成模板库（快速配置常见的CI/CD平台）                │
│ └─ 权限细分化（不同用户不同配置权限）                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 相关文档链接

- 完整架构文档: [`MCP_ARCHITECTURE_AND_USER_CONFIG.md`](MCP_ARCHITECTURE_AND_USER_CONFIG.md)
- MCP 工具规范: [`copilot-instructions.md`](../copilot-instructions.md)
- API 设计文档: [`api.md`](api.md)
- 集成管理设计: [`DESIGN_DOCUMENT.md`](DESIGN_DOCUMENT.md)

