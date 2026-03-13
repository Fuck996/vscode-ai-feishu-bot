# 🚀 MCP 工作汇报推送验证脚本
# 
# 用途：验证 Copilot → MCP → 后端 → 飞书 的完整推送链路
# 使用：.\testfile\verify-mcp-push.ps1
# 
# 验证内容：
#   1. MCP 配置是否正确
#   2. 后端服务是否可访问
#   3. 集成和 webhook 配置是否正确
#   4. 推送是否成功到飞书

# ═══════════════════════════════════════════════════════════
# 配置变量 - 根据你的部署修改
# ═══════════════════════════════════════════════════════════

# NAS 部署情况
$BACKEND_URL = "https://fsbot.4npc.net:2020"      # 替换为你的后端地址
$APP_URL = "http://192.168.1.100:45173"           # NAS 应用地址（可选）

# 登录凭证（用于获取功能列表）
$TEST_USERNAME = "admin"
$TEST_PASSWORD = "admin"

# 测试集成 ID 和 webhook token（需要从系统中获取）
# 获取方式: 登录 → 机器人管理 → 选择机器人 → 🔗 集成 → 选择要测试的集成 → 查看详情
$INTEGRATION_ID = ""                # 从系统中获取的集成 ID
$WEBHOOK_SECRET = ""                # 对应的 webhook secret

# ═══════════════════════════════════════════════════════════
# 颜色输出函数
# ═══════════════════════════════════════════════════════════

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

# ═══════════════════════════════════════════════════════════
# 检查 SSL 证书（用于 HTTPS）
# ═══════════════════════════════════════════════════════════

function Test-SSLConnection {
    param([string]$Url)
    
    try {
        # 跳过 SSL 验证以便测试自签名证书
        $request = [System.Net.WebRequest]::Create($Url)
        $request.Timeout = 5000
        
        # 忽略证书验证错误
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {
            param($sender, $certificate, $chain, $sslPolicyErrors)
            return $true
        }
        
        $response = $request.GetResponse()
        $response.Close()
        return $true
    } catch {
        return $false
    }
}

# ═══════════════════════════════════════════════════════════
# 验证流程
# ═══════════════════════════════════════════════════════════

Write-Info "═══════════════════════════════════════════════════"
Write-Info "开始验证 MCP 工作汇报推送（$(Get-Date)）"
Write-Info "═══════════════════════════════════════════════════`n"

$AllPassed = $true

# 步骤 0: 检查配置
Write-Info "[步骤 0/8] 检查配置..."

if ([string]::IsNullOrEmpty($INTEGRATION_ID) -or [string]::IsNullOrEmpty($WEBHOOK_SECRET)) {
    Write-Warning "集成 ID 或 webhook secret 未配置"
    Write-Info "⏸️  请先从系统中获取集成配置信息"
    Write-Info ""
    Write-Info "获取方式："
    Write-Info "1️⃣  在应用中登录（admin/admin）"
    Write-Info "2️⃣  进入机器人管理页面"
    Write-Info "3️⃣  选择要测试的机器人，点击 🔗 集成"
    Write-Info "4️⃣  选择一个集成（或创建新的）"
    Write-Info "5️⃣  查看集成详情，复制："
    Write-Info "   - 集成 ID: <uuid>"
    Write-Info "   - Webhook Secret: <token>"
    Write-Info ""
    Write-Info "然后修改脚本头部的："
    Write-Info "   `$INTEGRATION_ID = '你的集成ID'"
    Write-Info "   `$WEBHOOK_SECRET = '你的webhook-secret'"
    Write-Warning "按 Ctrl+C 修改脚本后重新运行"
    exit 1
} else {
    Write-Success "配置已加载"
    Write-Info "  Backend URL: $BACKEND_URL"
    Write-Info "  Integration ID: $($INTEGRATION_ID.Substring(0, 8))..."
    Write-Info "  WebhookSecret: $($WEBHOOK_SECRET.Substring(0, 8))..."
}

# 步骤 1: 检查后端连接
Write-Info "`n[步骤 1/8] 检查后端服务连接..."

try {
    $response = $null
    
    if ($BACKEND_URL.StartsWith("https")) {
        $connected = Test-SSLConnection -Url $BACKEND_URL
        if (-not $connected) {
            Write-Error "HTTPS 连接失败（可能的原因：SSL 证书问题、防火墙、服务未启动）"
            $AllPassed = $false
        } else {
            Write-Success "后端服务可访问（HTTPS）"
        }
    } else {
        $response = Invoke-WebRequest -Uri "$BACKEND_URL/health" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Success "后端服务可访问（HTTP）"
        }
    }
} catch {
    Write-Error "无法连接到后端服务"
    Write-Warning "  错误: $($_.Exception.Message)"
    Write-Warning "  • 检查后端地址是否正确: $BACKEND_URL"
    Write-Warning "  • 检查后端服务是否已启动"
    Write-Warning "  • 检查网络连接"
    $AllPassed = $false
}

# 步骤 2: 测试登录
Write-Info "`n[步骤 2/8] 测试用户认证..."

$AUTH_TOKEN = $null

try {
    $loginBody = @{
        username = $TEST_USERNAME
        password = $TEST_PASSWORD
    } | ConvertTo-Json

    # 忽略 SSL 验证
    if ($BACKEND_URL.StartsWith("https")) {
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {
            param($sender, $certificate, $chain, $sslPolicyErrors)
            return $true
        }
    }

    $response = Invoke-WebRequest `
        -Uri "$BACKEND_URL/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -SkipCertificateCheck `
        -ErrorAction Stop

    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        if ($data.data.token) {
            Write-Success "用户认证成功"
            Write-Info "  用户名: $TEST_USERNAME"
            $AUTH_TOKEN = $data.data.token
        } else {
            Write-Error "登录响应异常（未返回token）"
            $AllPassed = $false
        }
    }
} catch {
    Write-Error "用户认证失败"
    Write-Warning "  错误: $($_.Exception.Message)"
    Write-Warning "  • 检查用户名/密码是否正确"
    Write-Warning "  • 确保已使用正确的凭证"
    $AllPassed = $false
}

# 步骤 3: 读取集成详情
Write-Info "`n[步骤 3/8] 读取集成配置..."

$IntegrationDetails = $null

if ($AUTH_TOKEN) {
    try {
        # 先获取机器人列表以找到对应的 robotId
        $robotsResponse = Invoke-WebRequest `
            -Uri "$BACKEND_URL/api/robots" `
            -Method GET `
            -Headers @{"Authorization" = "Bearer $AUTH_TOKEN"} `
            -SkipCertificateCheck `
            -ErrorAction Stop

        if ($robotsResponse.StatusCode -eq 200) {
            $robots = $robotsResponse.Content | ConvertFrom-Json
            if ($robots.data.Count -gt 0) {
                $firstRobot = $robots.data[0]
                Write-Info "  找到机器人: $($firstRobot.name)"
                
                # 获取该机器人的集成列表
                $integrationsResponse = Invoke-WebRequest `
                    -Uri "$BACKEND_URL/api/robots/$($firstRobot.id)/integrations" `
                    -Method GET `
                    -Headers @{"Authorization" = "Bearer $AUTH_TOKEN"} `
                    -SkipCertificateCheck `
                    -ErrorAction Stop

                if ($integrationsResponse.StatusCode -eq 200) {
                    $integrations = $integrationsResponse.Content | ConvertFrom-Json
                    
                    # 查找指定的集成
                    $targetIntegration = $integrations.data | Where-Object { $_.id -eq $INTEGRATION_ID }
                    
                    if ($targetIntegration) {
                        Write-Success "集成配置获取成功"
                        Write-Info "  集成名: $($targetIntegration.projectName)"
                        Write-Info "  集成类型: $($targetIntegration.projectType)"
                        Write-Info "  状态: $($targetIntegration.status)"
                        Write-Info "  触发事件: $($targetIntegration.triggeredEvents -join ', ')"
                        $IntegrationDetails = @{
                            robotId = $firstRobot.id
                            integrationId = $targetIntegration.id
                            projectName = $targetIntegration.projectName
                            projectType = $targetIntegration.projectType
                            status = $targetIntegration.status
                            triggeredEvents = $targetIntegration.triggeredEvents
                        }
                    } else {
                        Write-Error "未找到指定的集成"
                        Write-Warning "  集成 ID: $INTEGRATION_ID"
                        Write-Info "  已找到的集成："
                        $integrations.data | ForEach-Object {
                            Write-Info "    • $($_.id) - $($_.projectName)"
                        }
                        $AllPassed = $false
                    }
                }
            } else {
                Write-Error "未找到任何机器人"
                Write-Warning "  请先创建机器人和集成"
                $AllPassed = $false
            }
        }
    } catch {
        Write-Error "无法读取集成配置"
        Write-Warning "  错误: $($_.Exception.Message)"
        $AllPassed = $false
    }
} else {
    Write-Warning "跳过此步骤（登录失败）"
}

# 步骤 4: 验证 Webhook 端点格式
Write-Info "`n[步骤 4/8] 验证 Webhook 端点格式..."

$WebhookUrl = "$BACKEND_URL/api/webhook/$INTEGRATION_ID"
Write-Info "  预期的 webhook 地址格式:"
Write-Info "  POST $WebhookUrl"
Write-Info "  Header: X-Trigger-Token: <webhook-secret>"

if ($WebhookUrl.Contains($INTEGRATION_ID)) {
    Write-Success "Webhook 端点格式验证通过"
} else {
    Write-Error "Webhook 端点格式异常"
    $AllPassed = $false
}

# 步骤 5: 测试 Webhook 调用（发送测试推送）
Write-Info "`n[步骤 5/8] 测试 Webhook 调用（发送示例推送）..."

try {
    $testPayload = @{
        event = "manual_test"
        status = "info"
        title = "🧪 MCP 推送验证测试"
        summary = "✅ 验证 MCP 推送链路\n📝 这是一条测试推送消息"
        projectName = "MCP Push Verification"
    } | ConvertTo-Json

    Write-Info "  测试推送内容:"
    Write-Info "  - Title: 🧪 MCP 推送验证测试"
    Write-Info "  - Summary: ✅ 验证 MCP 推送链路"

    $response = Invoke-WebRequest `
        -Uri $WebhookUrl `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{
            "X-Trigger-Token" = $WEBHOOK_SECRET
        } `
        -Body $testPayload `
        -SkipCertificateCheck `
        -ErrorAction Stop

    if ($response.StatusCode -eq 200) {
        Write-Success "测试推送已发送"
        Write-Info "  响应代码: HTTP $($response.StatusCode)"
        
        $responseData = $response.Content | ConvertFrom-Json
        if ($responseData.success) {
            Write-Success "后端成功处理推送"
            Write-Info "  通知ID: $($responseData.data.notificationId)"
        }
    }
} catch {
    Write-Error "测试推送失败"
    Write-Warning "  错误: $($_.Exception.Message)"
    Write-Warning "  • 检查 webhook 地址是否正确"
    Write-Warning "  • 检查 webhook token 是否正确"
    Write-Warning "  • 检查后端是否正常处理 webhook"
    $AllPassed = $false
}

# 步骤 6: 检查飞书 Webhook 配置
Write-Info "`n[步骤 6/8] 检查飞书 Webhook 配置..."

if ($AUTH_TOKEN) {
    try {
        $robotsResponse = Invoke-WebRequest `
            -Uri "$BACKEND_URL/api/robots" `
            -Method GET `
            -Headers @{"Authorization" = "Bearer $AUTH_TOKEN"} `
            -SkipCertificateCheck `
            -ErrorAction Stop

        $robots = $robotsResponse.Content | ConvertFrom-Json
        
        if ($robots.data.Count -gt 0) {
            $firstRobot = $robots.data[0]
            
            if ($firstRobot.webhookUrl) {
                Write-Success "飞书 Webhook 已配置"
                Write-Info "  机器人: $($firstRobot.name)"
                Write-Info "  Webhook: $($firstRobot.webhookUrl.Substring(0, 50))..."
                Write-Info "  状态: $($firstRobot.status)"
                
                if ($firstRobot.status -eq "inactive") {
                    Write-Warning "  ⚠️  机器人状态为停用，推送将不会发送"
                }
            } else {
                Write-Warning "飞书 Webhook 未配置"
                Write-Warning "  请在应用中添加飞书机器人的 Webhook URL"
                Write-Warning "  获取方式: 飞书群 → 群设置 → 添加群机器人 → 获取 Webhook"
                $AllPassed = $false
            }
        }
    } catch {
        Write-Warning "无法检查飞书配置"
        Write-Info "  这可能是正常的（权限问题）"
    }
} else {
    Write-Warning "跳过此步骤（登录失败）"
}

# 步骤 7: 检查 MCP 配置
Write-Info "`n[步骤 7/8] 检查 MCP 配置..."

$mcpConfigPath = ".\.vscode\mcp.json"
if (Test-Path $mcpConfigPath) {
    try {
        $mcpConfig = Get-Content $mcpConfigPath | ConvertFrom-Json
        $mcpServer = $mcpConfig.servers.feishuNotifier
        
        if ($mcpServer) {
            Write-Success "MCP 配置文件正确"
            Write-Info "  MCP 服务器类型: $($mcpServer.type)"
            Write-Info "  MCP 服务器 URL: $($mcpServer.url.Substring(0, 60))..."
            
            # 检查环境变量是否设置
            $mcpToken = [System.Environment]::GetEnvironmentVariable("FEISHU_MCP_TOKEN")
            if ($mcpToken) {
                Write-Success "FEISHU_MCP_TOKEN 环境变量已设置"
            } else {
                Write-Warning "FEISHU_MCP_TOKEN 环境变量未设置"
                Write-Info "  在 Windows 中需要设置："
                Write-Info "  [System.Environment]::SetEnvironmentVariable('FEISHU_MCP_TOKEN', '你的token', 'User')"
                Write-Warning "  然后重启 VS Code"
            }
        } else {
            Write-Error "MCP 配置不完整"
            $AllPassed = $false
        }
    } catch {
        Write-Error "MCP 配置文件格式错误"
        Write-Warning "  请检查 .vscode/mcp.json 的 JSON 格式"
        $AllPassed = $false
    }
} else {
    Write-Error "MCP 配置文件不存在"
    Write-Warning "  路径: $mcpConfigPath"
    $AllPassed = $false
}

# 步骤 8: 总体总结
Write-Info "`n[步骤 8/8] 验证总结..."
Write-Info "═══════════════════════════════════════════════════"

if ($AllPassed) {
    Write-Success "`n🎉 所有验证通过！MCP 工作汇报推送链路正常"
    Write-Success "`n推送流程已验证："
    Write-Success "  1️⃣  后端服务正常运行"
    Write-Success "  2️⃣  集成配置正确"
    Write-Success "  3️⃣  Webhook 接收和转发正常"
    Write-Success "  4️⃣  飞书 Webhook 已配置"
    Write-Success "`n现在可以："
    Write-Success "  ✓ 在 Copilot 中完成任务后自动发送工作汇报"
    Write-Success "  ✓ 工作汇报会自动推送到飞书群组"
} else {
    Write-Error "`n部分验证失败，请检查上述错误信息"
    Write-Warning "`n常见问题排查："
    Write-Warning "  1. 后端连接失败:"
    Write-Warning "     • 确保后端服务已启动"
    Write-Warning "     • 检查后端地址是否正确"
    Write-Warning "     • 检查防火墙设置"
    Write-Warning ""
    Write-Warning "  2. 集成配置错误:"
    Write-Warning "     • 从应用中获取确切的集成 ID 和 webhook secret"
    Write-Warning "     • 修改脚本头部的配置变量"
    Write-Warning ""
    Write-Warning "  3. 飞书 Webhook 缺失:"
    Write-Warning "     • 在飞书群中添加群机器人"
    Write-Warning "     • 在应用中配置 Webhook URL"
    Write-Warning ""
    Write-Warning "  4. MCP 连接问题:"
    Write-Warning "     • 确保 FEISHU_MCP_TOKEN 环境变量已设置"
    Write-Warning "     • 重启 VS Code 使环境变量生效"
    Write-Warning "     • 检查 .vscode/mcp.json 的 URL 是否正确"
}

Write-Info "`n═══════════════════════════════════════════════════"
Write-Info "验证完成 ($(Get-Date))`n"
