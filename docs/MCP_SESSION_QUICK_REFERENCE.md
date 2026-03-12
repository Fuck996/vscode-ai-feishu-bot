# MCP SSE 会话过期 - 快速参考

## 症状诊断

| 现象 | 原因 | 解决方案 |
|------|------|---------|
| 代理请求返回 404 | 后端重启或网络中断 | 自动重连，无需操作 |
| VS Code MCP 工具调用失败 | 会话超时 | 重启 VS Code 或等待自动恢复 |
| MCP 工具间歇性不可用 | 网络不稳定 | 检查网络，查看后端日志 |

## 日志关键字搜索

```bash
# 查看会话过期的详细原因
grep "会话不存在或已过期" backend.log

# 查看心跳状态
grep "ping" backend.log | tail -20

# 查看无活动断开
grep "长时间无活动被关闭" backend.log

# 查看连接建立成功
grep "SSE 连接建立" backend.log
```

## 性能指标

- **心跳间隔**：15 秒（改进前 25 秒）
- **无活动超时**：60 秒
- **自动恢复时间**：< 1 秒
- **每小时额外流量**：~2.88 KB（极小）

## 配置调优（如需）

### backend/src/routes/mcp-endpoint.ts

```typescript
// 心跳间隔（毫秒）- 建议 10-20 秒
const HEARTBEAT_INTERVAL = 15000;

// 无活动超时（毫秒）- 建议 30-120 秒
const INACTIVITY_TIMEOUT = 60000;
```

## 常见问题

**Q: 无法连接到 MCP 服务**
- A: 检查后端是否启动 (`npm start`)
- 验证环境变量 `FEISHU_MCP_TOKEN` 是否设置
- 查看后端日志中 `/api/mcp/sse` 的访问记录

**Q: MCP 工具间歇性失败**
- A: 这是正常的网络波动，VS Code MCP 会自动重试
- 如果频繁发生，检查网络质量

**Q: 我能否手动控制心跳间隔**
- A: 可以，修改 `HEARTBEAT_INTERVAL` 常量
- 建议值：10-20 秒（太短会增加流量，太长容易超时）

## 监控建议

```bash
# 实时监控 MCP 连接状态
tail -f backend.log | grep "MCP"

# 统计会话过期次数
grep "会话过期" backend.log | wc -l

# 查看每个集成的连接稳定性
grep "SSE" backend.log | grep -E "(建立|关闭|过期)"
```

## 如何禁用自动重连

在 VS Code settings 中：
```json
{
  "mcp.clients.feishu-notifier.autoReconnect": false
}
```

*注：不建议禁用，会影响用户体验*

---

**更新于：** 2026-03-12 | **版本：** v1.3.6+
