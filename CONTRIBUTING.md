# 贡献指南

感谢你对 Feishu AI Notifier 的兴趣！

## 开发设置

### 前置条件
- Node.js 16+
- Git
- Docker（可选）

### 安装依赖

```bash
# 安装所有子项目的依赖
bash scripts/setup.sh

# 或手动安装
cd backend && npm install
cd ../frontend && npm install
cd ../sdk/typescript && npm install
```

### 本地开发

**启动后端（新终端）**
```bash
cd backend
cp .env.example .env
# 编辑 .env
npm run dev
```

**启动前端（新终端）**
```bash
cd frontend
npm run dev
```

## 代码规范

### TypeScript
- 使用 strict 模式
- 添加类型注解
- 遵循 ESLint 配置

### 提交信息
```
feat: 描述新功能
fix: 修复 bug
docs: 更新文档
refactor: 代码重构
test: 添加测试
```

## 提交 PR

1. Fork 仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License
