# 后端 Dockerfile（多阶段构建）
# 阶段1：编译 TypeScript
FROM node:18-alpine AS builder

WORKDIR /app

# 安装所有依赖（包含 devDependencies 用于 tsc 编译）
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 阶段2：生产镜像（仅含编译产物 + 生产依赖）
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 从编译阶段拷贝构建产物
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["npm", "start"]
