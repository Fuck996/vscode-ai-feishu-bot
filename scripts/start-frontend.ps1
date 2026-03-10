#!/usr/bin/env pwsh
# 前端启动脚本

# 可能的 Node.js 安装位置
$nodePaths = @(
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs",
    "D:\nodejs",
    "C:\nodejs",
    "$env:APPDATA\.nvm\versions\node",
    "$env:USERPROFILE\AppData\Local\nodejs"
)

# 查找 npm
$npmCmd = $null
foreach ($path in $nodePaths) {
    if (Test-Path "$path\npm.cmd") {
        $npmCmd = "$path\npm.cmd"
        Write-Host "✅ 找到 npm: $npmCmd" -ForegroundColor Green
        break
    }
    if (Test-Path "$path\npm") {
        $npmCmd = "$path\npm"
        Write-Host "✅ 找到 npm: $npmCmd" -ForegroundColor Green
        break
    }
}

if (-not $npmCmd) {
    Write-Host "❌ 找不到 npm" -ForegroundColor Red
    exit 1
}

# 进入前端目录
Push-Location D:\GitHub\vscode-ai-feishu-bot\frontend

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎨 前端启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📦 安装依赖中..." -ForegroundColor Yellow
& $npmCmd install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install 失败" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host ""
Write-Host "✅ 依赖已安装，现在启动开发服务器..." -ForegroundColor Green
Write-Host ""
Write-Host "访问地址: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""

& $npmCmd run dev

Pop-Location
