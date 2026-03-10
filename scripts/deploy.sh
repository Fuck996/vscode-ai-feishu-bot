#!/bin/bash

# Feishu AI Notifier - 部署脚本

set -e

echo "🚀 开始部署 Feishu AI Notifier..."

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 检查环境文件
if [ ! -f ".env" ]; then
    echo "📝 创建 .env 文件..."
    cp backend/.env.example .env
    echo "⚠️  请编辑 .env 文件并填入飞书 Webhook URL"
    echo "编辑完成后，再次运行此脚本"
    exit 0
fi

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose down || true

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker-compose build

# 启动服务
echo "✨ 启动服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null; then
        echo "✅ 后端服务已启动"
        break
    fi
    echo "⏳ 等待中... ($i/30)"
    sleep 1
done

# 检查前端
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null; then
        echo "✅ 前端服务已启动"
        break
    fi
    echo "⏳ 等待前端启动... ($i/30)"
    sleep 1
done

echo ""
echo "🎉 部署完成！"
echo ""
echo "📍 访问地址："
echo "   前端: http://localhost:5173"
echo "   后端 API: http://localhost:3000"
echo ""
echo "📖 查看日志："
echo "   docker-compose logs -f backend"
echo "   docker-compose logs -f frontend"
echo ""
echo "🛑 停止服务："
echo "   docker-compose down"
