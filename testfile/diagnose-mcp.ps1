# MCP 服务连接诊断脚本
# 检查 MCP 连接失败的原因

Write-Host "🔍 MCP 服务诊断" -ForegroundColor Green
Write-Host "================" -ForegroundColor Green
Write-Host ""

# 1. 检查环境变量
Write-Host "1️⃣  检查 FEISHU_MCP_TOKEN 环境变量" -ForegroundColor Yellow
$token = $env:FEISHU_MCP_TOKEN
if ($token) {
    Write-Host "✅ 已设置: $($token.Substring(0, 10))..." -ForegroundColor Green
} else {
    Write-Host "❌ 未设置！" -ForegroundColor Red
    Write-Host "   设置方法（需要重启 VS Code 生效）:" -ForegroundColor Gray
    Write-Host '   [System.Environment]::SetEnvironmentVariable("FEISHU_MCP_TOKEN", "你的Token", "User")' -ForegroundColor Gray
    Write-Host ""
}

# 2. 检查后端是否运行
Write-Host "2️⃣  检查后端服务是否正在运行" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/version" -ErrorAction SilentlyContinue
    Write-Host "✅ 后端正在运行: http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "❌ 后端未响应: http://localhost:3000" -ForegroundColor Red
    Write-Host "   请检查后端是否启动: cd backend && npm run dev" -ForegroundColor Gray
    Write-Host ""
}

# 3. 检查 MCP SSE 端点（需要有效的 token）
Write-Host "3️⃣  检查 MCP SSE 端点" -ForegroundColor Yellow
if ($token) {
    try {
        $url = "https://fsbot.4npc.net:2020/api/mcp/sse?token=$token"
        $response = Invoke-WebRequest -Uri $url -ErrorAction SilentlyContinue
        Write-Host "✅ MCP 端点响应正常" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode
        if ($statusCode -eq 403) {
            Write-Host "❌ Token 无效或集成已禁用 (403 Forbidden)" -ForegroundColor Red
            Write-Host "   原因: webhookSecret 不匹配或集成状态为 inactive" -ForegroundColor Gray
            Write-Host "   解决: 从集成管理页面的「📋 MCP配置」复制正确的 Token" -ForegroundColor Gray
        } else {
            Write-Host "❌ 连接失败: $statusCode" -ForegroundColor Red
        }
    }
} else {
    Write-Host "⏭️  跳过（环境变量未设置）" -ForegroundColor Gray
}

Write-Host ""

# 4. 检查配置文件
Write-Host "4️⃣  检查 .vscode/mcp.json 配置" -ForegroundColor Yellow
$mcpConfigPath = ".\.vscode\mcp.json"
if (Test-Path $mcpConfigPath) {
    $config = Get-Content $mcpConfigPath | ConvertFrom-Json
    $url = $config.servers.feishuNotifier.url
    Write-Host "✅ 配置文件存在" -ForegroundColor Green
    Write-Host "   URL: $url" -ForegroundColor Gray
} else {
    Write-Host "❌ 配置文件不存在" -ForegroundColor Red
}

Write-Host ""

# 5. 常见问题排查清单
Write-Host "📋 排查清单" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "[ ] 1. FEISHU_MCP_TOKEN 环境变量已设置"
Write-Host "[ ] 2. 后端服务正在运行"
Write-Host "[ ] 3. Token 是有效的 webhookSecret（从集成页面获取）"
Write-Host "[ ] 4. 对应的集成状态为 'active'（已启用）"
Write-Host "[ ] 5. 已重启 VS Code（环境变量变更需要重启）"
Write-Host "[ ] 6. 网络连接正常（可访问 https://fsbot.4npc.net:2020）"
Write-Host ""

Write-Host "💡 快速修复步骤" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "1. 前端访问: http://localhost:5174/integrations"
Write-Host "2. 找到任何 'vscode-chat' 类型的集成，点「📋 MCP配置」"
Write-Host "3. 复制 Token (TRIGGER_TOKEN)"
Write-Host "4. 在 PowerShell 运行:"
Write-Host '   [System.Environment]::SetEnvironmentVariable("FEISHU_MCP_TOKEN", "复制的Token", "User")'
Write-Host "5. 重启 VS Code"
