# 前端功能测试用例集合

**文档版本:** 1.1.0  
**最后更新:** 2026-03-10  
**测试范围:** 用户认证、机器人管理、项目集成、测试通知

---

## 单元测试用例

### UT-001: 密码强度验证函数

**测试函数:** `validatePasswordStrength(password: string): ValidationResult`

**测试数据:**

```typescript
const testCases = [
  // (输入, 预期结果)
  {
    password: "admin@123",
    expected: {
      isValid: true,
      hasLowercase: true,
      hasNumbers: true,
      hasSpecialChars: true,
      lengthValid: true,
      errors: []
    }
  },
  
  {
    password: "admin123",
    expected: {
      isValid: false,
      hasLowercase: true,
      hasNumbers: true,
      hasSpecialChars: false,
      lengthValid: true,
      errors: [
        "必须包含至少一个特殊字符"
      ]
    }
  },
  
  {
    password: "pass#9901234567890",
    expected: {
      isValid: false,
      lengthValid: false,
      errors: ["密码长度不应超过20个字符"]
    }
  },
  
  {
    password: "pass@",
    expected: {
      isValid: false,
      lengthValid: false,
      errors: ["密码长度至少需要8个字符"]
    }
  }
];
```

**实现代码建议:**

```typescript
interface ValidationResult {
  isValid: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
  lengthValid: boolean;
  errors: string[];
}

export function validatePasswordStrength(
  password: string,
  policy?: PasswordPolicy
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /[0-9]/.test(password),
    hasSpecialChars: /[!@#$%^&*]/.test(password),
    lengthValid: password.length >= 8 && password.length <= 20,
    errors: []
  };

  if (!result.hasLowercase) {
    result.errors.push("必须包含至少一个小写字母");
    result.isValid = false;
  }
  if (!result.hasNumbers) {
    result.errors.push("必须包含至少一个数字");
    result.isValid = false;
  }
  if (!result.hasSpecialChars) {
    result.errors.push("必须包含至少一个特殊字符 (!@#$%^&*)");
    result.isValid = false;
  }
  if (password.length < 8) {
    result.errors.push("密码长度至少需要8个字符");
    result.isValid = false;
  }
  if (password.length > 20) {
    result.errors.push("密码长度不应超过20个字符");
    result.isValid = false;
  }

  return result;
}
```

---

### UT-002: 机器人数据验证

**测试函数:** `validateRobotData(robot: RobotInput): ValidationResult`

| 字段 | 验证规则 | 有效值 | 无效值 |
|------|---------|--------|---------|
| name | 1-50字符，非空 | "生产部署" | "", "x".repeat(51) |
| webhookUrl | 有效HTTP(S)URL | "https://open.feishu.cn/..." | "invalid", "" |
| status | enum | "active", "inactive" | "unknown" |

---

## 集成测试用例

### IT-001: 登录流程 - Happy Path

**场景:** 用户使用正确凭证登录

**前置条件:**
- Admin用户存在且密码已修改为 `admin@123`
- 后端服务运行正常
- 前端应用正常加载

**执行步骤:**
1. 访问登录页面 http://localhost:5175/login
2. 输入用户名 "admin"
3. 输入密码 "admin@123"
4. 点击"登录"按钮
5. 等待响应

**预期结果:**
- ✓ 重定向到Dashboard页面
- ✓ localStorage中保存了JWT token
- ✓ 显示欢迎信息
- ✓ 页面标题为"飞书通知系统 - Dashboard"

---

### IT-002: 登录流程 - 强制修改密码

**场景:** Admin首次登录被强制修改密码

**前置条件:**
- Admin用户存在且 `passwordChanged = false`
- 使用默认密码 `admin`

**执行步骤:**
1. 输入admin/admin登录
2. 点击登录

**预期结果:**
- ✓ 重定向到"强制修改密码"页面
- ✓ 显示密码要求检查表
- ✓ 显示新密码和确认密码输入框

**密码强度反馈测试:**

| 输入密码 | 小写 | 数字 | 特符 | 长度 | 有效 | 备注 |
|---------|------|------|------|------|------|------|
| `admin` | ✓ | ✗ | ✗ | ✓ | ✗ | 缺数字和特符 |
| `admin123` | ✓ | ✓ | ✗ | ✓ | ✗ | 缺特殊字符 |
| `admin@123` | ✓ | ✓ | ✓ | ✓ | ✓ | 有效！ |
| `pass#99` | ✓ | ✓ | ✓ | ✓ | ✓ | 8字符有效 |
| `pass#9901234567890` | ✓ | ✓ | ✓ | ✗ | ✗ | 21字符超过限制 |

**错误场景:**
- 两个密码框不匹配时，点击确认显示"密码不匹配"错误
- 输入有效密码后，点击确认保存成功，重定向到Dashboard

---

### IT-003: 创建机器人 - 完整流程

**前置条件:**
- 已登录为admin
- 密码已修改

**Phase 1 - 进入机器人管理:**
1. 在Dashboard左侧菜单点击"🤖 机器人"
2. 点击"新建"按钮

**预期:** 打开"新建机器人"向导

**Phase 2 - 填入基本信息:**
1. 机器人名称输入: "生产部署通知"
2. 描述输入: "部署成功/失败通知"
3. 状态选择: "活跃"
4. 点击"下一步"

**预期:** 进入第二步：Webhook配置

**Phase 3 - 配置Webhook:**
1. 粘贴Webhook地址: `https://open.feishu.cn/open-apis/bot/v2/hook/xxx`
2. 点击"测试连接"
3. 点击"保存"

**预期结果:**
- ✓ 后端数据库中存在新机器人
- ✓ 机器人名称正确: "生产部署通知"
- ✓ Webhook URL被加密存储
- ✓ 状态为: active
- ✓ 重定向到机器人列表
- ✓ 新创建的机器人出现在列表中

---

### IT-004: 删除机器人

**前置条件:**
- 已创建至少一个机器人

**执行步骤:**
1. 在机器人列表中找到目标机器人
2. 点击"删除"按钮
3. 在确认对话框中点击"删除"

**预期结果:**
- ✓ 确认对话框显示警告信息
- ✓ 显示"此操作不可撤销"
- ✓ 删除成功后机器人从列表消失
- ✓ 后端数据库中相关记录被删除
- ✓ 关联的所有集成配置也被删除

---

### IT-005: 测试通知功能

**前置条件:**
- 机器人已创建且配置了有效的飞书Webhook
- 后端服务运行中

**执行步骤:**
1. 在机器人列表中找到机器人
2. 点击"[✓] 测试"按钮

**预期结果:**
- ✓ 按钮显示"测试中..."
- ✓ API调用成功返回 200 OK
- ✓ 显示"✅ 连接测试通过"
- ✓ 飞书群组收到测试通知消息

**测试通知内容验证:**
```
标题: 🧪 飞书通知系统 - 测试消息
正文: 
  连接测试成功！
  时间: [当前时间]
  机器人: [机器人名称]
  来自: 系统测试
```

**错误场景:**
- Webhook地址无效 → 显示"❌ 连接失败: Webhook地址无效"
- 飞书服务不可用 → 显示"❌ 连接失败: 服务暂不可用"
- 网络超时 → 显示"❌ 连接失败: 请求超时"

---

### IT-006: 为机器人添加项目集成 - Jenkins

**前置条件:**
- 已创建机器人"生产部署通知"
- 在机器人编辑页面

**执行步骤:**
1. 滚至"项目集成"部分
2. 点击"添加项目集成"
3. 从下拉菜单选择 "Jenkins"
4. 填入配置：
   - 项目名称: "api-backend"
   - Jenkins URL: "http://jenkins.example.com:8080"
   - Job名称: "deploy-production"
   - 用户名: "jenkins-user"
   - API Token: "11e3c4d5e6f7a8b9c0d1"
5. 选择触发事件：构建成功、构建失败、部署成功、部署失败
6. 选择通知策略：总是通知
7. 点击"测试"
8. 点击"保存"

**预期结果:**
- ✓ Jenkins连接测试通过
- ✓ 集成配置保存成功
- ✓ 集成出现在机器人的集成列表中
- ✓ 配置被加密存储

---

### IT-007: 发送测试通知 - API调用

**前置条件:**
- 机器人已创建且配置了有效的飞书Webhook
- 后端服务运行中

**执行脚本:**
```bash
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build Complete",
    "summary": "Production build succeeded",
    "status": "success",
    "action": "build",
    "details": {
      "buildNumber": "12345",
      "duration": 300
    }
  }'
```

**预期结果:**
- ✓ API返回 200 OK
- ✓ 响应包含 notificationId
- ✓ 飞书群组收到通知消息
- ✓ 消息包含标题、摘要和详情

---

## 端到端测试用例 (E2E)

### E2E-001: 完整工作流 - Jenkins集成到通知

**场景:** 从Jenkins触发部署到收到飞书通知的完整流程

**Phase 1: 前端配置 (10分钟)**
1. Admin登录 (admin → admin@123)
2. 创建机器人 "生产环境通知"
3. 配置飞书Webhook地址
4. 添加Jenkins集成
5. 保存配置

**Phase 2: Jenkins执行 (5分钟)**
1. 在Jenkins中手动触发Job构建
2. 观察构建进度
3. 等待构建完成

**Phase 3: 验证通知 (2分钟)**
1. 检查飞书群组消息
2. 验证消息内容正确
3. 回到前端查看Dashboard统计更新

**验证检查表:**
- ✓ 前端配置所有字段正确保存
- ✓ Jenkins-通知服务集成正常
- ✓ 飞书成功接收并展示消息
- ✓ Dashboard统计数据实时更新

---

## 性能测试用例

### PT-001: 密码验证性能

**测试:** 密码强度检查函数的执行时间

```javascript
console.time('passwordValidation');
for (let i = 0; i < 1000; i++) {
  validatePasswordStrength('admin@123');
}
console.timeEnd('passwordValidation');
```

**预期:** < 100ms (1000次调用)

---

### PT-002: 机器人列表加载

**测试:** 加载100个机器人的页面响应时间

**预期:**
- 后端应该在: < 500ms
- 前端渲染应该在: < 1s

---

## 安全性测试用例

### SEC-001: SQL注入防护

**测试输入:**
```
用户名: admin' OR '1'='1
密码: anything
```

**预期:** 登录失败，显示"用户名或密码错误"

---

### SEC-002: XSS防护

**测试输入:**
```
机器人名称: "><script>alert('XSS')</script><"
```

**预期:** 
- 脚本不执行
- 字符被正确转义显示
- 数据库中存储转义后的字符串

---

## 测试报告模板

```markdown
# 测试执行报告

**测试日期:** YYYY-MM-DD  
**测试环境:** Windows 11, Node.js 25.8.0, React 18.2.0  
**测试人员:** [name]  
**测试版本:** v1.0.0

## 测试摘要

| 指标 | 结果 |
|------|------|
| 总测试用例数 | 30 |
| 通过 | 29 |
| 失败 | 1 |
| 通过率 | 97% |

## 失败用例

### TC-002: Admin首次登录修改密码
- **失败原因:** 密码长度验证有bug
- **优先级:** P1

## 遗留问题

1. **Bug-001:** 密码长度计算错误
   - 修复建议: 检查length计算逻辑

---

**签名:**  
测试负责人: _______________  
日期: _______________
```

---

**版本更新:**
- v1.1.0 - 更新密码验证规则（移除大写字母要求）、补充删除机器人和测试通知用例
- v1.0.0 - 初始版本
