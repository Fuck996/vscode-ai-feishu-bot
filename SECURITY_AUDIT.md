# 系统安全审查报告

**审查日期**: 2026-03-11  
**审查对象**: 飞书 AI 通知系统 v1.1.0  
**部署环境**: 本地开发 + 计划 Docker 容器化  

---

## 🔐 安全性现状

### ✅ 已实现的安全措施

| 安全层面 | 当前状态 | 详情 |
|---------|---------|------|
| **认证** | ✅ JWT | 使用 HS256 算法，过期时间 7 天 |
| **密码存储** | ✅ bcrypt | cost factor 10 |
| **授权** | ✅ 资源所有权校验 | 所有 API 都检查 userId 匹配 |
| **会话隔离** | ✅ localStorage | token 仅存客户端，不存 cookies |
| **CORS** | ✅ 配置 | 支持自定义 CORS_ORIGIN |
| **传输加密** | ⚠️ 部分 | 开发环境 HTTP；生产环境需 HTTPS |
| **数据验证** | ✅ 服务端验证 | 所有输入都在后端校验 |
| **速率限制** | ✅ 实现 | 15 分钟 100 请求/IP |
| **日志记录** | ✅ Pino | 结构化日志，敏感信息过滤 |

---

## ⚠️ 风险评估

### 1. **传输层加密** (高优先级)

**当前状态**: ❌ 不安全（开发环境）  
**风险**: HTTP 传输的 JWT 考虑可被中间人攻击

**改进方案**:
```bash
# 生产环境要求
- 使用 HTTPS (TLS 1.3)
- 自签名证书或 Let's Encrypt
- Nginx 反向代理配置 SSL
- HSTS 头部配置（强制 HTTPS）
```

**NAS 部署建议**:
```yaml
# docker-compose.yml 中的 Nginx
nginx:
  ports:
    - "80:80"     # HTTP 重定向到 HTTPS
    - "443:443"   # HTTPS
  volumes:
    - ./certs:/etc/nginx/certs:ro  # SSL 证书挂载
```

---

### 2. **JWT 密钥管理** (中优先级)

**当前状态**: ⚠️ 环境变量存储

**风险等级**: 中等
- 开发时使用 "dev-secret-key"（演示用）
- 生产环境密钥暴露风险

**改进方案**:
```bash
# 环境变量使用强密钥
JWT_SECRET=<50+ 字符随机密钥>

# 不要提交到 Git
echo "JWT_SECRET=..." >> .env
echo ".env" >> .gitignore
```

**NAS 部署**:
```bash
# 通过 Docker 环境变量或 secret 注入
docker run \
  -e JWT_SECRET=$(openssl rand -base64 32) \
  ...
```

---

### 3. **CORS 配置** (中优先级)

**当前状态**: ✅ 可配置

**代码位置**: [backend/src/server.ts](backend/src/server.ts#L32)

```typescript
cors: {
  origin: (process.env.CORS_ORIGIN || '*').split(','),
}
```

**本地开发**: `CORS_ORIGIN=http://localhost:5173,http://localhost:3001`

**生产环境应该**:
```bash
# 只允许特定前端源
CORS_ORIGIN=https://yourdomain.com
```

---

### 4. **数据库安全** (中优先级)

**当前状态**: ✅ 文件系统存储（开发用）

**文件位置**: `backend/data/notifications.db` (JSON 文件)

**风险分析**:
| 风险 | 影响 | 缓解方案 |
|------|------|---------|
| 无加密 | 敏感数据明文存储 | ✓ 文件系统权限限制（600） |
| 无备份 | 数据丢失 | ✓ Docker volumes 备份策略 |
| 并发写入 | 数据腐败 | ✓ 单线程 JSON 文件操作 |

**改进建议**:
```bash
# Docker 挂载卷做备份
docker run \
  -v app-data:/app/backend/data \
  -v app-backup:/app/backup \
  ...
```

---

### 5. **前端安全** (中优先级)

**XSS 防护**: ✅  
- React 自动转义输出
- 无 `dangerouslySetInnerHTML` 使用

**CSRF 防护**: ✅  
- JSON API (不使用 HTML 表单)
- SameSite cookies (虽未使用 cookies)

**前端令牌存储**: ⚠️ localStorage
```typescript
// 当前做法 - 可被 XSS 脚本访问
localStorage.setItem('auth_token', token);

// 建议：添加 HttpOnly cookie（需后端支持）
// Set-Cookie: auth_token=...; HttpOnly; Secure; SameSite=Strict
```

---

### 6. **API 安全** (高优先级)

**速率限制**: ✅  
```typescript
// helmet 中间件限制 15分钟100请求
```

**输入验证**: ✅  
```typescript
// 所有路由都验证必填字段和数据类型
if (!name || !webhookUrl) {
  return res.status(400).json({ error: '参数不完整' });
}
```

**输出验证**: ✅  
- 返回统一的 `{ success, data, error }` 格式
- 错误信息不暴露内部细节

---

## 📋 部署前安全清单

### 🟢 生产环境必做

- [ ] **HTTPS 配置**
  - [ ] 自签名证书或 Let's Encrypt
  - [ ] Nginx SSL 配置
  - [ ] HSTS 头部

- [ ] **环境变量安全**
  - [ ] `JWT_SECRET` 设置 50+ 字符强密钥
  - [ ] `CORS_ORIGIN` 限制为前端域名
  - [ ] 环境变量不提交到 Git

- [ ] **数据库安全**
  - [ ] Docker volume 备份
  - [ ] 文件权限 600 (仅所有者读写)
  - [ ] 定期备份策略

- [ ] **Nginx 加固**
  - [ ] 隐藏版本号：`server_tokens off`
  - [ ] 头部安全：Security Headers
  - [ ] 请求体大小限制：`10MB`

- [ ] **日志安全**
  - [ ] 不记录敏感信息（passwords, tokens）
  - [ ] 日志日志轮转（防止磁盘满）
  - [ ] 访问日志分离

- [ ] **容器安全**
  - [ ] 使用非 root 用户运行
  - [ ] 只暴露必要端口
  - [ ] 定期更新基础镜像

### 🟡 建议改进

- [ ] 添加审计日志（记录所有操作）
- [ ] 实现 WebAuthn/2FA 支持
- [ ] 前端使用 HttpOnly cookies
- [ ] API 版本控制和弃用策略
- [ ] 定期渗透测试

---

## 🛡️ NAS 部署的特殊考虑

### 群晖 (Synology)

**安全建议**:
1. **使用群晖内置 SSL 证书**
   ```bash
   # 群晖控制面板 → 安全 → 证书
   # 使用自签名或申请 Let's Encrypt
   ```

2. **网络隔离**
   ```bash
   # 创建独立 Docker 网络，不暴露主机端口
   docker create network app-net --driver bridge
   ```

3. **备份策略**
   ```bash
   # 启用群晖备份任务
   - 每天备份 /volume1/docker/app-data
   - 同步到云存储或外部硬盘
   ```

4. **防火墙规则**
   ```bash
   # 控制面板 → 安全 → 防火墙
   - 只允许需要的IP访问 443 端口
   - 限制登录尝试
   ```

5. **监控**
   ```bash
   # 启用 Docker 容器监控
   - 内存限制：512MB
   - CPU 限制：50%
   ```

---

## 🔐 安全最佳实践代码示例

### 1. 安全的环境配置

```bash
# .env.example (提交到 Git，仅示例)
PORT=3001
HOST=localhost
JWT_SECRET=<change-in-production>
FEISHU_WEBHOOK_URL=https://open.feishu.cn/...
CORS_ORIGIN=http://localhost:5173
DATABASE_PATH=./data/notifications.db
LOG_LEVEL=info

# .env (本地，不提交)
JWT_SECRET=aBc123...XyZ789 # 随机生成的生产密钥
CORS_ORIGIN=https://yourdomain.com
FEISHU_WEBHOOK_URL=https://open.feishu.cn/...
```

### 2. Nginx 安全配置

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL 证书
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;

    # 安全头部
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 隐藏版本
    server_tokens off;

    # 反向代理
    location /api {
        proxy_pass http://backend:3001;
        proxy_set_header Authorization $http_authorization;
    }

    # 前端静态文件
    location / {
        proxy_pass http://frontend:5173;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 3. Docker 安全最佳实践

```dockerfile
# Dockerfile
FROM node:18-alpine

# 创建非 root 用户
RUN addgroup -g 1001 -S app && adduser -S app -u 1001

# 工作目录
WORKDIR /app

# 复制依赖（分层缓存）
COPY package*.json ./

# 安装依赖
ENV NODE_ENV=production
RUN npm ci --only=production

# 复制应用代码
COPY --chown=app:app . .

# 切换用户
USER app

# 非 root 运行
CMD ["node", "dist/server.js"]

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/version', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
```

---

## ✅ 我的建议

### 目前状态
**安全级别**: ⭐⭐⭐ (开发级别)
- 本地开发环境安全实践良好
- JWT + bcrypt + CORS 已实现
- 但生产环境需要加固

### 改进优先级
1. 🔴 **HTTPS/TLS** - 必须（生产部署前）
2. 🟠 **JWT 密钥管理** - 必须
3. 🟠 **CORS 限制** - 建议（部署时）
4. 🟡 **容器安全加固** - 强烈建议
5. 🟡 **审计日志** - 建议（后续）

### NAS 部署前清单
- [ ] 申请 SSL 证书（群晖 Let's Encrypt）
- [ ] 配置 Nginx 反向代理 + HTTPS
- [ ] 设置强 JWT_SECRET
- [ ] 限制 CORS_ORIGIN 为前端地址
- [ ] 配置自动备份任务
- [ ] 启用防火墙限制访问

---

## 📚 参考资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT 最佳实践](https://tools.ietf.org/html/rfc8725)
- [Docker 安全指南](https://docs.docker.com/engine/security/)
- [Nginx 安全加固](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [群晖 SSL 配置](https://kb.synology.com/)

---

**审查完成**  
当前系统对于开发和测试是安全的。生产部署时按上述清单执行加固措施。
