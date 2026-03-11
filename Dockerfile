# 统一构建前后端单镜像
# 阶段1：编译前端
FROM node:18-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend . 
RUN npm run build

# 阶段2：编译后端 + 集成前端产物
FROM node:18-alpine AS backend-builder

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend . 

# 从前端编译阶段拷贝前端产物到后端 public 目录
COPY --from=frontend-builder /frontend/dist ./public

# 编译后端 TypeScript
RUN npm run build

# 阶段3：生产运行时
FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 从编译阶段拷贝后端编译产物
COPY --from=backend-builder /app/dist ./dist

# 拷贝前端静态文件
COPY --from=backend-builder /app/public ./public

# 后端将在 3000 端口运行并提供 public 下的前端文件
EXPOSE 3000

CMD ["npm", "start"]
