# Onboarding 页面创建工作区 401 错误修复计划

## 🔍 问题诊断

### 错误表现
- **用户操作**：在 `http://localhost:3000/onboarding` 页面填写工作区信息后点击"创建工作区"
- **错误信息**：页面显示 "Could not validate credentials"
- **HTTP状态码**：401 Unauthorized
- **API请求**：`POST http://localhost:8000/api/v1/workspaces/` 失败

### 根本原因
**JWT token 格式不兼容**：NextAuth v5 默认使用 JWE (加密) 格式，但后端只能验证 JWS (签名) 格式。

### 证据链
1. ✅ **Cookie 正确发送**：请求头包含 `authjs.session-token=eyJhbGciOiJkaXIi...`
2. ✅ **后端收到请求**：Network 日志显示请求到达后端
3. ❌ **Token 验证失败**：后端 `decode_token()` 函数无法解密 JWE 格式

### Token 格式分析
```javascript
// 当前 NextAuth 发送的 token header（Base64URL 解码后）
{"alg":"dir","enc":"A256CBC-HS512"}
// 这是 JWE (JSON Web Encryption) 格式 - 加密的 token

// 后端期望的 token header
{"alg":"HS256","typ":"JWT"}
// 这是 JWS (JSON Web Signature) 格式 - 签名的 token
```

---

## 🎯 修复方案

### 方案概述
配置 NextAuth v5 使用 **JWS (签名)** 而不是 **JWE (加密)** 格式，使前后端 JWT token 兼容。

### 核心修改
**文件**：`/Users/ZenoWang/Documents/project/E_Business/frontend/src/auth.ts`

**修改位置**：第 120-124 行（jwt 配置对象）

**当前代码**：
```typescript
jwt: {
    maxAge: 30 * 60,
},
```

**修改为**：
```typescript
jwt: {
    maxAge: 30 * 60,
    encode: async ({ secret, token }) => {
        // 使用 JWS 格式（签名）而不是 JWE（加密）
        return jwt.sign(token, secret, { algorithm: 'HS256' })
    },
    decode: async ({ secret, token }) => {
        // 验证 JWS 格式的 token
        try {
            return jwt.verify(token, secret, { algorithms: ['HS256'] }) as any
        } catch {
            return null
        }
    }
},
```

**需要导入**：
```typescript
import jwt from 'jsonwebtoken'  // 需要安装
```

---

## 📋 实施步骤

### 步骤 1：安装依赖
```bash
cd frontend
npm install jsonwebtoken @types/jsonwebtoken
```

### 步骤 2：修改 NextAuth 配置
**文件**：`frontend/src/auth.ts`

1. 在文件顶部添加导入（约第 21 行后）：
```typescript
import jwt from 'jsonwebtoken'
```

2. 修改 `jwt` 配置对象（第 120-124 行）：
```typescript
jwt: {
    maxAge: 30 * 60,
    encode: async ({ secret, token }) => {
        // 创建 JWS 格式的 token（签名，不加密）
        return jwt.sign(token, secret, { algorithm: 'HS256' })
    },
    decode: async ({ secret, token }) => {
        // 验证 JWS 格式的 token
        try {
            return jwt.verify(token, secret, { algorithms: ['HS256'] }) as any
        } catch {
            return null
        }
    }
},
```

### 步骤 3：验证环境变量
确保 `.env.local` 或 `.env` 中配置了 `AUTH_SECRET`：
```env
AUTH_SECRET=dev-auth-secret-change-in-production
```

**检查命令**：
```bash
cat frontend/.env.local | grep AUTH_SECRET
```

### 步骤 4：重启前端服务
```bash
# 在前端目录
cd frontend

# 停止当前服务（Ctrl+C）
# 重新启动
npm run dev
```

### 步骤 5：清除旧的 Cookie
在浏览器中：
1. F12 打开开发者工具
2. Application → Cookies → http://localhost:3000
3. 删除 `authjs.session-token` 和 `authjs.csrf-token`

### 步骤 6：测试流程
1. 访问 `http://localhost:3000/register`
2. 注册新用户（或使用现有账号登录）
3. 成功后应该跳转到 `/onboarding`
4. 填写工作区信息（名称："测试工作区"，描述可选）
5. 点击"创建工作区"
6. **预期结果**：成功创建工作区并跳转到 `/dashboard?workspace={workspaceId}`

---

## 🔍 验证方法

### 1. 检查 Token 格式
在浏览器开发者工具中：
1. F12 → Application → Cookies → http://localhost:3000
2. 查看 `authjs.session-token` 的值
3. 复制 token 并在 https://jwt.io 解码
4. **预期结果**：header 应该是 `{"alg":"HS256","typ":"JWT"}`

### 2. 监控 Network 请求
1. F12 → Network
2. 点击"创建工作区"
3. 查看 `POST /api/v1/workspaces/` 请求
4. **预期结果**：状态码 201 Created（不是 401）

### 3. 检查响应内容
成功的响应应该包含：
```json
{
  "id": "uuid",
  "name": "测试工作区",
  "slug": "ce-shi-gong-zuo-qu-xxxx",
  "description": null,
  "maxMembers": 100,
  "isActive": true,
  "createdAt": "2026-01-02T...",
  "updatedAt": "2026-01-02T...",
  "memberCount": 1
}
```

### 4. 后端日志验证
后端控制台应该显示：
```
INFO:     127.0.0.1:xxxxx - "POST /api/v1/workspaces/ HTTP/1.1" 201 Created
```

---

## ⚠️ 注意事项

### 安全性影响
- **JWE (加密)**：Token 内容被加密，无法被读取
- **JWS (签名)**：Token 内容可以被 Base64 解码读取（但无法被篡改）

**评估**：
- ✅ **安全性仍然足够**：HMAC-SHA256 签名防止了篡改
- ✅ **HTTPS 保护**：生产环境中 HTTPS 加密传输层保护
- ⚠️ **敏感信息**：避免在 token 中存储密码、API密钥等敏感数据

### 当前 Token 内容
```json
{
  "id": "user@example.com",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234567890,
  "jti": "random-uuid"
}
```
这些信息不是敏感数据，可以安全使用 JWS 格式。

### 兼容性
- ✅ **后端兼容**：后端 `security.py:139-165` 已使用 HS256 算法
- ✅ **NextAuth 兼容**：NextAuth v5 支持自定义 encode/decode
- ✅ **标准协议**：JWS 是 JWT 标准格式

### 回滚方案
如果修改后出现问题，可以：
1. 恢复原始 `frontend/src/auth.ts` 文件（git checkout）
2. 重启前端服务
3. 清除浏览器 Cookie
4. 重新登录

---

## 📚 相关文件

### 修改文件
- `/Users/ZenoWang/Documents/project/E_Business/frontend/src/auth.ts` - NextAuth 配置（主修改）
- `/Users/ZenoWang/Documents/project/E_Business/frontend/package.json` - 添加依赖

### 参考文件（仅读取，不修改）
- `/Users/ZenoWang/Documents/project/E_Business/backend/app/core/security.py` - JWT 验证逻辑
- `/Users/ZenoWang/Documents/project/E_Business/backend/app/api/deps_auth.py` - 认证依赖
- `/Users/ZenoWang/Documents/project/E_Business/backend/app/core/config.py` - AUTH_SECRET 配置

---

## ✅ 完成标准

- [ ] 安装 `jsonwebtoken` 和 `@types/jsonwebtoken` 依赖
- [ ] 修改 `frontend/src/auth.ts` 添加 jwt 导入
- [ ] 修改 `frontend/src/auth.ts` 的 jwt 配置（添加 encode/decode）
- [ ] 验证 `.env.local` 中 `AUTH_SECRET` 已配置
- [ ] 重启前端开发服务器
- [ ] 清除浏览器旧 Cookie
- [ ] 注册/登录新用户
- [ ] 成功创建工作区
- [ ] 跳转到 dashboard
- [ ] 验证 token 格式为 JWS（HS256）

---

## 🐛 故障排查

### 问题 1：仍然返回 401
**可能原因**：AUTH_SECRET 不匹配

**检查命令**：
```bash
# 前端
cat frontend/.env.local | grep AUTH_SECRET

# 后端
cat backend/.env | grep auth_secret
```

**修复**：确保两端使用相同的密钥

### 问题 2：Token 格式仍然是 JWE
**可能原因**：前端服务未重启，使用了旧代码

**修复**：
```bash
# 停止前端服务（Ctrl+C）
# 重新启动
cd frontend
npm run dev
```

### 问题 3：安装依赖失败
**可能原因**：网络问题或 npm 版本

**修复**：
```bash
# 清理缓存
npm cache clean --force

# 重新安装
npm install jsonwebtoken @types/jsonwebtoken
```

### 问题 4：后端未运行
**可能原因**：后端服务未启动

**检查命令**：
```bash
curl http://localhost:8000/api/v1/docs
```

**修复**：
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

---

## 📖 技术说明

### JWT 格式对比

#### JWS (JSON Web Signature) - 签名
```
Header: {"alg":"HS256","typ":"JWT"}
Payload: {"user":"id","exp":123}
Signature: HMAC-SHA256(header.payload, secret)
```
- **用途**：防篡改，内容可读
- **算法**：HMAC-SHA256（对称加密）或 RSA（非对称）
- **后端支持**：✅ 原生支持

#### JWE (JSON Web Encryption) - 加密
```
Header: {"alg":"dir","enc":"A256CBC-HS512"}
Encrypted Key: [encrypted]
IV: [initialization vector]
Ciphertext: [encrypted payload]
Tag: [auth tag]
```
- **用途**：防篡改 + 防读取
- **算法**：AES-256-CBC + HMAC-SHA512
- **后端支持**：❌ 不支持（需要额外库）

### 为什么会出现这个问题？

NextAuth v5 的默认行为：
- v4 使用 JWS（签名）
- v5 改为使用 JWE（加密）以增强安全性
- 后端代码是为 v4 或自定义 JWT 设计的

### 为什么这个解决方案安全？

1. **签名保证完整性**：HMAC-SHA256 签名防止 token 被篡改
2. **HTTPS 加密传输**：生产环境使用 HTTPS，传输层加密
3. **过期机制**：30 分钟自动过期，限制攻击窗口
4. **无敏感数据**：token 只包含 user ID 和 email，不包含密码等敏感信息
5. **业界标准**：大多数认证系统使用 JWS 而非 JWE

---

## 🎓 学习要点

`★ Insight ─────────────────────────────────────`
1. **JWT 两种格式**：JWS（签名）vs JWE（加密）- JWS 更通用，JWE 更安全但兼容性差
2. **NextAuth 版本差异**：v4 默认 JWS，v5 默认 JWE - 升级时需注意后端兼容性
3. **对称加密优势**：HS256 使用共享密钥，比 RSA 非对称加密性能更好
`─────────────────────────────────────────────────`
