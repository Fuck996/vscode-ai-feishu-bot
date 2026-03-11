# 飞书 AI 通知系统 - Docker 快速启动脚本 (Windows PowerShell)
# 用法: .\start-docker.ps1 -Action start|stop|restart|logs

param(
    [ValidateSet('start', 'stop', 'restart', 'logs', 'status', 'backup', 'clean', 'help')]
    [string]$Action = 'help',
    [string]$Service = ''
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ComposeFile = Join-Path $ScriptDir "docker-compose.yml"
$ProjectName = "feishu-bot"

# 颜色定义
function Write-Info {
    Write-Host "ℹ️  $args" -ForegroundColor Cyan
}

function Write-Success {
    Write-Host "✓ $args" -ForegroundColor Green
}

function Write-Warning {
    Write-Host "⚠️  $args" -ForegroundColor Yellow
}

function Write-Error-Custom {
    Write-Host "✗ $args" -ForegroundColor Red
}

# 检查 Docker
function Test-Docker {
    try {
        $docker = docker --version
        $compose = docker-compose --version
        Write-Success "Docker 已安装: $docker"
        return $true
    }
    catch {
        Write-Error-Custom "Docker 未安装或不在 PATH 中"
        return $false
    }
}

# 检查 .env 文件
function Test-Env {
    $envFile = Join-Path $ScriptDir ".env"
    if (-not (Test-Path $envFile)) {
        Write-Warning ".env 文件不存在，从 .env.example 创建"
        Copy-Item (Join-Path $ScriptDir ".env.example") $envFile
        Write-Info "请编辑 .env 文件配置必要参数 (在 $ScriptDir 目录中)"
        return $false
    }
    Write-Success ".env 文件已存在"
    return $true
}

# 启动服务
function Start-Services {
    Write-Info "启动 $ProjectName 服务..."
    docker-compose -f $ComposeFile up -d
    
    Write-Info "等待服务启动..."
    Start-Sleep -Seconds 5
    
    # 检查服务状态
    $status = docker-compose -f $ComposeFile ps
    
    if ($status -match "running") {
        Write-Success "所有服务已启动"
        Write-Info ""
        Write-Info "访问地址:"
        Write-Info "  HTTP:  http://localhost"
        Write-Info "  HTTPS: https://localhost (自签名证书会被浏览器警告)"
        Write-Info ""
        Write-Info "登录凭证:"
        Write-Info "  用户名: admin"
        Write-Info "  密码: admin (首次登录需修改)"
    }
    else {
        Write-Error-Custom "服务启动失败，请检查日志"
        docker-compose -f $ComposeFile logs
        exit 1
    }
}

# 停止服务
function Stop-Services {
    Write-Info "停止 $ProjectName 服务..."
    docker-compose -f $ComposeFile down
    Write-Success "服务已停止"
}

# 重启服务
function Restart-Services {
    Write-Info "重启 $ProjectName 服务..."
    docker-compose -f $ComposeFile restart
    Write-Success "服务已重启"
    Start-Sleep -Seconds 3
    Write-Info "查看最新日志: docker-compose logs -f"
}

# 显示日志
function Show-Logs {
    param([string]$Service = "")
    
    if ([string]::IsNullOrEmpty($Service)) {
        Write-Info "显示所有服务日志 (按 Ctrl+C 退出)..."
        docker-compose -f $ComposeFile logs -f
    }
    else {
        Write-Info "显示 $Service 日志 (按 Ctrl+C 退出)..."
        docker-compose -f $ComposeFile logs -f $Service
    }
}

# 显示容器状态
function Show-Status {
    Write-Info "容器状态:"
    docker-compose -f $ComposeFile ps
    
    Write-Info ""
    Write-Info "资源使用:"
    docker stats --no-stream
}

# 显示帮助
function Show-Help {
    $usage = @"
飞书 AI 通知系统 - Docker 快速启动脚本 (Windows)

用法: .\start-docker.ps1 -Action <action> [-Service <service>]

操作:
    start       启动所有服务
    stop        停止所有服务
    restart     重启所有服务
    logs        显示日志
    status      显示容器状态
    backup      备份数据
    clean       清理（删除容器但保留数据）
    help        显示此帮助信息

示例:
    .\start-docker.ps1 -Action start              # 启动所有服务
    .\start-docker.ps1 -Action logs -Service backend  # 查看后端日志
    .\start-docker.ps1 -Action logs               # 查看所有日志
    .\start-docker.ps1 -Action stop               # 停止所有服务

"@
    Write-Host $usage
}

# 备份数据
function Backup-Data {
    $backupDir = Join-Path $ScriptDir "backups"
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = Join-Path $backupDir "backup_$timestamp.tar.gz"
    
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Info "备份数据到 $backupFile..."
    
    docker-compose -f $ComposeFile exec -T backend tar czf - /app/data | 
        Out-FileStream -FilePath $backupFile -Encoding byte
    
    Write-Success "数据已备份"
    Write-Info "备份文件: $backupFile"
}

# 清理
function Clean {
    $confirm = Read-Host "将删除所有容器但保留数据，继续? (y/N)"
    
    if ($confirm.ToLower() -ne 'y') {
        Write-Info "已取消"
        return
    }
    
    docker-compose -f $ComposeFile down
    Write-Success "容器已删除，数据已保留"
}

# 主程序
try {
    if (-not (Test-Docker)) {
        exit 1
    }
    
    switch ($Action) {
        'start' {
            if (-not (Test-Env)) {
                Write-Error-Custom "请先配置 .env 文件并设置必要的参数"
                exit 1
            }
            Start-Services
        }
        'stop' {
            Stop-Services
        }
        'restart' {
            Restart-Services
        }
        'logs' {
            Show-Logs -Service $Service
        }
        'status' {
            Show-Status
        }
        'backup' {
            Backup-Data
        }
        'clean' {
            Clean
        }
        'help' {
            Show-Help
        }
        default {
            Write-Error-Custom "未知命令: $Action"
            Show-Help
            exit 1
        }
    }
}
catch {
    Write-Error-Custom "$_"
    exit 1
}
