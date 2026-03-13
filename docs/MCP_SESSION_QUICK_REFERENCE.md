# MCP 会话快速参考
**版本：** v1.3.19 | **更新时间：** 2026-03-13 | **内容：** 修正 VS Code MCP 重连说明，并区分 Streamable HTTP 与 legacy SSE

## 症状诊断

| 现象 | 连接模式 | 根因 | 处理方式 |
|------|----------|------|----------|
| `404 status sending message ... will retry with new session ID` | Streamable HTTP | 后端重启或内存中的会话已丢失 | VS Code 会在下一次工具调用时自动新建会话，通常无需人工干预 |
| MCP 服务器状态变成 Error | legacy SSE | 长连接断开后客户端进入错误状态 | 在 VS Code 执行 `MCP: List Servers` → `Restart Server` |
| 工具偶发不可用 | 任一模式 | 隧道、反向代理或网络波动 | 先看 MCP 输出日志，再看后端 `/api/mcp/sse` 访问日志 |

## 当前实现

- 后端 `/api/mcp/sse` 已同时支持 Streamable HTTP 和 legacy SSE。
- VS Code `mcp.json` 没有公开的 `autoReconnect` 配置项。
- `400/404` 后的自动重试是 VS Code 在 Streamable HTTP 会话里的内建行为，不是配置开关。

## 推荐配置

```json
{
  "servers": {
    "feishuNotifier": {
      "type": "http",
      "url": "https://example.com/api/mcp/sse?token=${env:FEISHU_MCP_TOKEN}"
    }
  }
}
```

## 日志关键字搜索

```bash
# 查看 HTTP 会话建立/过期
grep "HTTP 会话" backend.log

# 查看 legacy SSE 回退连接
grep "Legacy SSE" backend.log

# 查看 /api/mcp/sse 的整体访问情况
grep "/api/mcp/sse" backend.log
```

## 排查顺序

1. 先看 VS Code MCP 输出，确认当前是 `will retry with new session ID` 还是 `Error reading SSE stream`。
2. 再看后端日志，确认是 `HTTP 会话过期` 还是 `Legacy SSE 连接关闭`。
3. 如果仍停留在 legacy SSE 模式，重启 MCP 服务器后再发起一次工具调用，让客户端重新走 HTTP 会话模式。

## 补充说明

- 官方配置里不存在 `mcp.clients.feishuNotifier.autoReconnect` 这样的设置项。
- 如果工具调用长期卡在 Error，优先检查外层隧道、反向代理或网络设备是否会主动切断长连接。

---

**文档版本：** v1.3.19

**变更记录：**
- v1.3.19 - 2026-03-13 - Copilot - 修正 MCP 重连配置说明
