#!/usr/bin/env pwsh
# 飞书AI通知系统启动脚本 (PowerShell版)

function Write-Header {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "   飞书AI通知系统 启动脚本" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Kill-Port {
    param([int]$port)
    $procs = netstat -ano | Select-String ":$port" | ForEach-Object {
        $_.Matches[0].Groups[1].Value -replace ".*\s+(\d+)$", "$1"
    }
    
    foreach ($proc in $procs) {
        if ($proc -match '^\d+$') {
            try {
                taskkill /PID $proc /F 2>$null
            } catch {
                # Ignore errors
            }
        }
    }
}

function Install-Dependencies {
    if (-not (Test-Path "backend/node_modules")) {
        Write-Host "[1/4] 安装后端依赖..." -ForegroundColor Yellow
        Push-Location backend
        npm install
        Pop-Location
    }

    if (-not (Test-Path "frontend/node_modules")) {
        Write-Host "[2/4] 安装前端依赖..." -ForegroundColor Yellow
        Push-Location frontend
        npm install
        Pop-Location
    }
}

function Start-Services {
    Write-Host ""
    Write-Host "[2/4] 清理占用的端口..." -ForegroundColor Yellow
    Kill-Port 3000
    Kill-Port 5173
    
    Write-Host ""
    Write-Host "[3/4] 启动后端服务 (http://localhost:3000)..." -ForegroundColor Green
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 3

    Write-Host "[4/4] 启动前端服务 (http://localhost:5173)..." -ForegroundColor Green
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal
}

function Show-Info {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "   系统已启动!" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "后端: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "前端: http://localhost:5173" -ForegroundColor Cyan
    Write-Host "初始凭证: admin / admin (首次登录后需修改密码)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "自动在浏览器中打开应用..." -ForegroundColor Cyan
    Start-Process "http://localhost:5173/login"
    
    Write-Host ""
    Write-Host "系统启动完成!" -ForegroundColor Green
    Write-Host "如需关闭系统，请关闭两个 PowerShell 窗口" -ForegroundColor Yellow
    Write-Host ""
}

# Main execution
Write-Header
Install-Dependencies
Start-Services
Show-Info
