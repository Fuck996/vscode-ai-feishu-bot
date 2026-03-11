# 🔍 NAS 部署验证脚本（Windows PowerShell）
# 
# 用途：验证 Synology NAS 上部署的飞书通知系统是否正常运行
# 使用：./testfile/verify-nas-deployment.ps1
# 
# 需要之前修改：
#   1. 修改 $NAS_IP 为你的NAS IP地址
#   2. 修改 $APP_PORT 为部署使用的端口（默认45173）
#   3. 根据需要修改其他配置

# ═══════════════════════════════════════════════════════════
# 配置变量 - 根据你的部署修改
# ═══════════════════════════════════════════════════════════

$NAS_IP = "192.168.1.100"              # 替换为你的NAS IP
$APP_PORT = "45173"                    # 前端端口（默认）
$BACKEND_PORT = "3000"                 # 后端端口（docker内部）
$BASE_URL = "http://${NAS_IP}:${APP_PORT}"
$BACKEND_URL = "http://${NAS_IP}/api"  # 通过nginx代理的后端
$TEST_USERNAME = "admin"
$TEST_PASSWORD = "admin"

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
# 验证步骤
# ═══════════════════════════════════════════════════════════

Write-Info "═══════════════════════════════════════════════════"
Write-Info "开始验证 NAS 部署（$(Get-Date)）"
Write-Info "═══════════════════════════════════════════════════"

$AllPassed = $true

# 步骤 1: 检查网络连接
Write-Info "`n[步骤 1/8] 检查 NAS 网络连接..."
try {
    $ping = Test-Connection -ComputerName $NAS_IP -Count 1 -ErrorAction Stop
    Write-Success "NAS 可访问 (延迟: $($ping.ResponseTime)ms)"
} catch {
    Write-Error "无法连接到 NAS ($NAS_IP)"
    Write-Warning "请检查："
    Write-Warning "  • NAS 的 IP 地址是否正确"
    Write-Warning "  • NAS 是否已启动"
    Write-Warning "  • 网络是否畅通"
    exit 1
}

# 步骤 2: 检查前端访问
Write-Info "`n[步骤 2/8] 检查前端应用访问..."
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Success "前端应用正常（$BASE_URL）"
        Write-Info "  応答状态: HTTP $($response.StatusCode)"
    }
} catch {
    Write-Error "无法访问前端应用"
    Write-Warning "  • 检查应用是否已启动"
    Write-Warning "  • 检查端口 $APP_PORT 是否被防火墙阻止"
    Write-Warning "  • 查看容器日志: docker-compose logs frontend"
    $AllPassed = $false
}

# 步骤 3: 检查后端健康状态
Write-Info "`n[步骤 3/8] 检查后端 API 健康状态..."
try {
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/health" -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Success "后端 API 健康检查通过"
    }
} catch {
    Write-Warning "后端健康状态检查失败 - 建议检查后端日志"
}

# 步骤 4: 测试登录
Write-Info "`n[步骤 4/8] 测试用户认证（登录测试）..."
try {
    $loginBody = @{
        username = $TEST_USERNAME
        password = $TEST_PASSWORD
    } | ConvertTo-Json

    $response = Invoke-WebRequest `
        -Uri "$BACKEND_URL/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop

    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        if ($data.data.token) {
            Write-Success "用户认证成功"
            Write-Info "  Token: $($data.data.token.Substring(0, 20))..." 
            $GLOBAL:AUTH_TOKEN = $data.data.token
        } else {
            Write-Warning "登录响应异常（未返回token）"
            $AllPassed = $false
        }
    }
} catch {
    Write-Error "用户认证失败"
    Write-Warning "  • 检查用户名/密码是否正确（默认：admin/admin）"
    Write-Warning "  • 如已修改默认密码，请使用修改后的凭证"
    Write-Warning "  • 错误详情: $($_.Exception.Message)"
    $AllPassed = $false
}

# 步骤 5: 获取用户信息
Write-Info "`n[步骤 5/8] 获取当前用户信息..."
if ($GLOBAL:AUTH_TOKEN) {
    try {
        $response = Invoke-WebRequest `
            -Uri "$BACKEND_URL/users/me" `
            -Method GET `
            -Headers @{"Authorization" = "Bearer $GLOBAL:AUTH_TOKEN"} `
            -ErrorAction Stop

        if ($response.StatusCode -eq 200) {
            $user = $response.Content | ConvertFrom-Json
            Write-Success "用户信息获取成功"
            Write-Info "  用户名: $($user.data.username)"
            Write-Info "  角色: $($user.data.role)"
            Write-Info "  状态: $($user.data.status)"
        }
    } catch {
        Write-Error "无法获取用户信息"
        $AllPassed = $false
    }
} else {
    Write-Warning "跳过此步骤（登录失败）"
}

# 步骤 6: 获取机器人列表
Write-Info "`n[步骤 6/8] 检查机器人列表..."
if ($GLOBAL:AUTH_TOKEN) {
    try {
        $response = Invoke-WebRequest `
            -Uri "$BACKEND_URL/robots" `
            -Method GET `
            -Headers @{"Authorization" = "Bearer $GLOBAL:AUTH_TOKEN"} `
            -ErrorAction Stop

        if ($response.StatusCode -eq 200) {
            $robots = $response.Content | ConvertFrom-Json
            $robotCount = $robots.data.Count
            Write-Success "机器人列表获取成功（共 $robotCount 个）"
            
            if ($robotCount -gt 0) {
                foreach ($robot in $robots.data) {
                    Write-Info "  • $($robot.name) - 状态: $($robot.status)"
                }
            } else {
                Write-Warning "  暂无机器人配置，请在应用中创建"
            }
        }
    } catch {
        Write-Error "无法获取机器人列表"
        Write-Warning "  • 检查后端数据库是否正常"
        Write-Warning "  • 查看错误日志: docker-compose logs backend"
        $AllPassed = $false
    }
} else {
    Write-Warning "跳过此步骤（登录失败）"
}

# 步骤 7: 获取通知历史
Write-Info "`n[步骤 7/8] 检查通知历史..."
if ($GLOBAL:AUTH_TOKEN) {
    try {
        $response = Invoke-WebRequest `
            -Uri "$BACKEND_URL/notifications" `
            -Method GET `
            -Headers @{"Authorization" = "Bearer $GLOBAL:AUTH_TOKEN"} `
            -ErrorAction Stop

        if ($response.StatusCode -eq 200) {
            $notifications = $response.Content | ConvertFrom-Json
            $notificationCount = $notifications.data.Count
            Write-Success "通知历史获取成功（共 $notificationCount 条）"
        }
    } catch {
        Write-Warning "无法获取通知历史 - 这可能是正常的（首次部署）"
    }
} else {
    Write-Warning "跳过此步骤（登录失败）"
}

# 步骤 8: 总体检查总结
Write-Info "`n[步骤 8/8] 验证总结..."
Write-Info "═══════════════════════════════════════════════════"

if ($AllPassed) {
    Write-Success "`n🎉 所有验证通过！NAS 部署运行正常"
    Write-Success "`n现在可以："
    Write-Success "  ✓ 访问前端: $BASE_URL"
    Write-Success "  ✓ 使用默认账号: admin / admin"
    Write-Success "  ✓ 配置机器人和集成"
    Write-Success "  ✓ 设置飞书通知"
} else {
    Write-Error "`n部分验证失败，请检查上述错误信息"
    Write-Warning "`n常见问题排查："
    Write-Warning "  1. 查看容器日志:"
    Write-Warning "     docker-compose -f docker-compose.synology.yml logs -f"
    Write-Warning ""
    Write-Warning "  2. 检查容器运行状态:"
    Write-Warning "     docker-compose -f docker-compose.synology.yml ps"
    Write-Warning ""
    Write-Warning "  3. 重启全部服务:"
    Write-Warning "     docker-compose -f docker-compose.synology.yml restart"
    Write-Warning ""
    Write-Warning "  4. 查看详细的部署文档:"
    Write-Warning "     docs/SYNOLOGY_DEPLOYMENT.md"
}

Write-Info "`n═══════════════════════════════════════════════════"
Write-Info "验证完成 ($(Get-Date))`n"
