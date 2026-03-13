# 快速启动脚本 - Windows PowerShell 版本
# 使用方法: .\scripts\start.ps1

# 设置编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🚀 飞书通知系统 - 快速启动 (Windows)" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js 未安装，请先安装 Node.js" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js 已安装" -ForegroundColor Green

# 配置后端
Write-Host ""
Write-Host "📦 配置后端服务..." -ForegroundColor Yellow

Push-Location backend

if (-not (Test-Path ".env")) {
    Write-Host "📝 创建 .env 文件..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host ""
    Write-Host "⚠️  重要: 请编辑 backend/.env 文件" -ForegroundColor Red
    Write-Host "   填入你的飞书 Webhook URL" -ForegroundColor Red
    Write-Host ""
    Write-Host "获取 Webhook URL 步骤：" -ForegroundColor Cyan
    Write-Host "1. 打开飞书群组" -ForegroundColor White
    Write-Host "2. 群名称 → 管理 → 应用 → 添加应用" -ForegroundColor White
    Write-Host "3. 搜索 '自定义机器人' 并添加" -ForegroundColor White
    Write-Host "4. 复制 Webhook URL 到 .env 文件中" -ForegroundColor White
    Write-Host ""
    Write-Host "编辑完成后，重新运行此脚本" -ForegroundColor Yellow
    Pop-Location
    exit 0
}

Write-Host "📦 安装后端依赖..." -ForegroundColor Yellow
npm install | Out-Null
Write-Host "✅ 后端依赖已安装" -ForegroundColor Green

# 在新窗口中启动后端
Write-Host ""
Write-Host "🚀 在新窗口启动后端..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit -Command `"npm run dev`""
Write-Host "✅ 后端已启动 (http://localhost:3000)" -ForegroundColor Green

# 等待后端启动
Start-Sleep -Seconds 3

# 配置前端
Pop-Location
Write-Host ""
Write-Host "🎨 配置前端服务..." -ForegroundColor Yellow

Push-Location frontend

Write-Host "📦 安装前端依赖..." -ForegroundColor Yellow
npm install | Out-Null
Write-Host "✅ 前端依赖已安装" -ForegroundColor Green

# 在新窗口中启动前端
Write-Host ""
Write-Host "🚀 在新窗口启动前端..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit -Command `"npm run dev`""
Write-Host "✅ 前端已启动 (http://localhost:5173)" -ForegroundColor Green

Pop-Location

# 打印总结
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "🎉 系统已启动！" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📍 访问地址：" -ForegroundColor Cyan
Write-Host "   前端: http://localhost:5173" -ForegroundColor White
Write-Host "   API: http://localhost:3000" -ForegroundColor White
Write-Host ""

Write-Host "🧪 测试通知发送：" -ForegroundColor Cyan
Write-Host "   打开新 PowerShell 窗口，运行：" -ForegroundColor White
Write-Host "   curl -X POST http://localhost:3000/api/webhooks/test" -ForegroundColor White
Write-Host ""

Write-Host "📋 接下来的步骤：" -ForegroundColor Cyan
Write-Host "1. ✅ 后端已运行 (新窗口中)" -ForegroundColor White
Write-Host "2. ✅ 前端已运行 (新窗口中)" -ForegroundColor White
Write-Host "3. 📝 打开 http://localhost:5173 查看面板" -ForegroundColor White
Write-Host "4. 🚀 发送测试通知：curl -X POST http://localhost:3000/api/webhooks/test" -ForegroundColor White
Write-Host "5. 🔧 在 VSCode 中配置扩展 (见下方)" -ForegroundColor White
Write-Host ""

Write-Host "🔌 VSCode 扩展配置：" -ForegroundColor Cyan
Write-Host "1. 按系统教程设置 FEISHU_MCP_TOKEN 用户环境变量" -ForegroundColor White
Write-Host "2. 在当前工程本地创建 .vscode/mcp.json" -ForegroundColor White
Write-Host "3. 使用 feishuNotifier 作为 MCP 服务器键名" -ForegroundColor White
Write-Host "4. 重启 VS Code 后在 Chat 中验证连接" -ForegroundColor Cyan
Write-Host ""
