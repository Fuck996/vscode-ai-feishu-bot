#!/bin/bash

# 快速启动脚本 - Windows PowerShell 版本在下面

echo "🚀 飞书通知系统 - 快速启动"
echo "=========================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

echo "✅ Node.js 已安装"

# 启动后端
echo ""
echo "📦 启动后端服务..."
cd backend

if [ ! -f ".env" ]; then
    echo "📝 创建 .env 文件..."
    cp .env.example .env
    echo "⚠️  请编辑 backend/.env，填入飞书 Webhook URL"
    echo "编辑完成后重新运行此脚本"
    exit 0
fi

npm install > /dev/null 2>&1

# 在后台启动后端
npm run dev &
BACKEND_PID=$!
echo "✅ 后端已启动 (PID: $BACKEND_PID) - http://localhost:3000"

# 等待后端启动
sleep 3

# 启动前端
echo ""
echo "🎨 启动前端服务..."
cd ../frontend

npm install > /dev/null 2>&1
npm run dev &
FRONTEND_PID=$!
echo "✅ 前端已启动 (PID: $FRONTEND_PID) - http://localhost:5173"

echo ""
echo "=========================="
echo "🎉 系统已启动！"
echo "=========================="
echo ""
echo "📍 访问地址："
echo "   前端: http://localhost:5173"
echo "   API: http://localhost:3000/api/health"
echo ""
echo "🧪 测试发送通知："
echo "   curl -X POST http://localhost:3000/api/webhooks/test"
echo ""
echo "🛑 停止服务："
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
