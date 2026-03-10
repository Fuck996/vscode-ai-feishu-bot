#!/usr/bin/env pwsh
# 一键启动脚本 - 会自动寻找 npm

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
    Write-Host "❌ 找不到 npm，请检查 Node.js 是否正确安装" -ForegroundColor Red
    Write-Host ""
    Write-Host "解决方案：" -ForegroundColor Yellow
    Write-Host "1. 重启电脑" -ForegroundColor White
    Write-Host "2. 或者访问 https://nodejs.org 重新下载安装" -ForegroundColor White
    Write-Host "3. 安装时确保勾选 'Add to PATH'" -ForegroundColor White
    exit 1
}

# 进入后端目录
Push-Location D:\GitHub\vscode-ai-feishu-bot\backend

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 后端启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 安装依赖
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

# 启动服务
& $npmCmd run dev

Pop-Location
