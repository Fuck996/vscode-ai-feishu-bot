#!/bin/bash

# 初始化脚本

echo "📦 安装后端依赖..."
cd backend
npm install
npm run build
cd ..

echo "📦 安装前端依赖..."
cd frontend
npm install
npm run build
cd ..

echo "📦 安装 VSCode 扩展依赖..."
cd vscode-extension
npm install
npm run build
cd ..

echo "📦 安装 SDK..."
echo "   TypeScript SDK..."
cd sdk/typescript
npm install
npm run build
cd ../..

echo "✅ 初始化完成！"
echo ""
echo "后续操作："
echo "1. 配置 .env 文件"
echo "2. 运行: npm run dev (本地开发)"
echo "3. 或运行: docker-compose up (Docker 部署)"
