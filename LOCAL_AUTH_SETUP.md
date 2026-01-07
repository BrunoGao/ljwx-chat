# 本地认证系统配置指南

本文档描述如何启用和配置 LobeChat 的本地认证系统（用户名 / 邮箱 + 密码认证）。

## 功能特性

✅ **用户注册方式**

- 邮箱 + 密码（带邮箱验证流程）
- 用户名 + 密码（无需邮箱）
- 管理员创建用户

✅ **认证功能**

- 登录（支持邮箱或用户名）
- 邮箱验证
- 密码重置（忘记密码）

✅ **管理功能**

- 管理员创建用户
- 管理员更新用户密码
- 管理员删除用户

✅ **安全特性**

- BCrypt 密码加密（10 轮加盐）
- 密码强度验证（最少 8 字符，需包含大小写、数字、特殊字符）
- 一次性令牌（邮箱验证、密码重置）
- 用户数据完全隔离（CASCADE 删除）

---

## 环境变量配置

### 1. 启用本地认证

在 `.env` 文件中添加：

```bash
# 启用 NextAuth
NEXT_PUBLIC_ENABLE_NEXT_AUTH=1

# 启用本地认证
NEXT_PUBLIC_ENABLE_LOCAL_AUTH=1

# NextAuth 密钥（必填，用于 JWT 签名）
NEXT_AUTH_SECRET=your-secret-key-here

# NextAuth 会话策略（推荐 database）
NEXT_AUTH_SSO_SESSION_STRATEGY=database
```

### 2. 数据库配置（必需）

本地认证需要 PostgreSQL 数据库：

```bash
# PostgreSQL 连接字符串
DATABASE_URL=postgresql://user:password@localhost:5432/lobechat

# 数据库驱动（Neon 或 Node.js）
DATABASE_DRIVER=node # 或 neon
```

### 3. 邮件服务配置（可选）

如果需要邮箱验证和密码重置功能，配置邮件服务：

```bash
# 启用邮件发送
EMAIL_ENABLED=true

# 发件人地址
EMAIL_FROM=noreply@your-domain.com

# 应用基础 URL（用于邮件中的链接）
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

**注意**：EmailService 当前使用日志输出，需要集成实际的邮件服务提供商（SendGrid、AWS SES 等）。

### 4. 可选配置

```bash
# SSO 提供商（可与本地认证并存）
NEXT_AUTH_SSO_PROVIDERS=github,google # 用逗号分隔

# 调试模式
NEXT_AUTH_DEBUG=false
```

---

## 数据库迁移

1. **运行 migration**：

```bash
bun run db:migrate
```

这会创建以下表：

- `users` - 添加 `password_hash` 字段和 email 索引
- `password_reset_tokens` - 密码重置令牌
- `email_verification_tokens` - 邮箱验证令牌

2. **验证 migration**：

检查数据库中是否存在新表：

```sql
\dt *tokens
SELECT column_name FROM information_schema.columns
WHERE table_name='users' AND column_name='password_hash';
```

---

## API 使用示例

### 用户注册

#### 邮箱注册

```typescript
const result = await trpc.localAuth.registerWithEmail.mutate({
  email: 'user@example.com',
  password: 'StrongPass123!',
  username: 'johndoe', // 可选
  firstName: 'John', // 可选
  lastName: 'Doe', // 可选
});
// 返回：{ success: true, userId: '...', message: '...' }
// 用户会收到验证邮件
```

#### 用户名注册

```typescript
const result = await trpc.localAuth.registerWithUsername.mutate({
  username: 'johndoe',
  password: 'StrongPass123!',
  firstName: 'John', // 可选
  lastName: 'Doe', // 可选
});
// 返回：{ success: true, userId: '...', message: '...' }
```

### 用户登录

```typescript
const result = await trpc.localAuth.login.mutate({
  identifier: 'user@example.com', // 或 'johndoe'
  password: 'StrongPass123!',
});
// 返回：{ success: true, userId: '...', email: '...', username: '...' }
```

### 邮箱验证

```typescript
// 1. 用户点击邮件中的验证链接，获取 token
const result = await trpc.localAuth.verifyEmail.mutate({
  token: 'verification-token-from-email',
});
// 返回：{ success: true, message: 'Email verified successfully' }

// 2. 重新发送验证邮件
await trpc.localAuth.resendVerificationEmail.mutate({
  email: 'user@example.com',
});
```

### 密码重置

```typescript
// 1. 请求重置
await trpc.localAuth.requestPasswordReset.mutate({
  email: 'user@example.com',
});
// 用户收到重置邮件

// 2. 执行重置
await trpc.localAuth.resetPassword.mutate({
  token: 'reset-token-from-email',
  password: 'NewStrongPass123!',
});
```

### 管理员功能

需要管理员权限（`admin` 或 `super_admin` 角色）：

```typescript
// 创建用户
await trpc.localAuth.adminCreateUser.mutate({
  email: 'newuser@example.com',
  username: 'newuser',
  password: 'TempPass123!',
  emailVerified: true, // 跳过邮箱验证
  sendWelcomeEmail: true, // 发送欢迎邮件
  firstName: 'New',
  lastName: 'User',
});

// 更新用户密码
await trpc.localAuth.adminUpdateUserPassword.mutate({
  userId: 'user-id',
  password: 'NewPass123!',
  notifyUser: true, // 发送通知邮件
});

// 删除用户
await trpc.localAuth.adminDeleteUser.mutate({
  userId: 'user-id',
});
```

---

## NextAuth 集成

本地认证通过 NextAuth Credentials Provider 实现。NextAuth 会话管理所有认证方法：

```typescript
import { signIn } from 'next-auth/react';
// 登出
import { signOut } from 'next-auth/react';

// 使用本地认证登录
await signIn('credentials', {
  identifier: 'user@example.com',
  password: 'password',
  callbackUrl: '/',
});

await signOut({ callbackUrl: '/login' });
```

---

## 管理员角色配置

本地认证使用现有的 RBAC 系统。为用户分配管理员角色：

```sql
-- 创建 admin 角色（如果不存在）
INSERT INTO rbac_roles (name, description, is_system)
VALUES ('admin', 'Administrator role', true)
ON CONFLICT (name) DO NOTHING;

-- 分配角色给用户
INSERT INTO rbac_user_roles (user_id, role_id)
VALUES (
  'user-id-here',
  (SELECT id FROM rbac_roles WHERE name = 'admin')
);
```

---

## 密码策略

当前密码策略（在 `src/utils/server/password.ts` 中定义）：

- **最短长度**：8 字符
- **最长长度**：128 字符
- **必须包含**：
  - 至少一个小写字母 (a-z)
  - 至少一个大写字母 (A-Z)
  - 至少一个数字 (0-9)
  - 至少一个特殊字符 (!@#$%^&\*(),.?":{}|<>)

可以在 `validatePasswordStrength()` 函数中修改策略。

---

## 邮件模板自定义

邮件模板位于 `src/server/modules/EmailService.ts`，包含：

- `sendVerificationEmail()` - 邮箱验证
- `sendPasswordResetEmail()` - 密码重置
- `sendWelcomeEmail()` - 欢迎邮件

可以修改 HTML 和文本内容以匹配品牌风格。

---

## 安全考虑

### 已实现

1. ✅ **密码加密**：使用 BCrypt 10 轮加盐
2. ✅ **令牌安全**：
   - 邮箱验证令牌：24 小时有效期
   - 密码重置令牌：1 小时有效期
   - 一次性使用（验证后立即删除）
3. ✅ **用户隔离**：所有数据库查询都过滤 `userId`
4. ✅ **CASCADE 删除**：删除用户时自动清理相关数据
5. ✅ **防信息泄露**：密码重置和邮箱重发不透露用户是否存在

### 建议额外措施

1. **速率限制**：为登录、注册、密码重置添加速率限制
2. **账户锁定**：多次失败登录后锁定账户
3. **2FA**：添加双因素认证支持
4. **审计日志**：记录认证相关操作
5. **密码历史**：防止重复使用旧密码

---

## 与现有认证方式共存

本地认证可以与其他认证方式（Clerk、OAuth）并存：

```bash
# 同时启用多种认证方式
NEXT_PUBLIC_ENABLE_CLERK_AUTH=1       # Clerk 托管认证
NEXT_PUBLIC_ENABLE_NEXT_AUTH=1        # NextAuth (SSO + Local)
NEXT_PUBLIC_ENABLE_LOCAL_AUTH=1       # 本地认证
NEXT_AUTH_SSO_PROVIDERS=github,google # OAuth 提供商
```

用户可以选择任一方式登录。

---

## 故障排除

### 问题：无法注册用户

**检查**：

1. 数据库 migration 是否执行成功
2. `NEXT_PUBLIC_ENABLE_LOCAL_AUTH` 是否设置为 `1`
3. `NEXT_AUTH_SECRET` 是否配置

### 问题：验证邮件未发送

**检查**：

1. `EMAIL_ENABLED=true` 是否设置
2. `NEXT_PUBLIC_BASE_URL` 是否正确
3. 查看服务器日志中的 `[EMAIL]` 开头的消息

### 问题：管理员端点返回 403

**检查**：

1. 用户是否被分配了 `admin` 或 `super_admin` 角色
2. RBAC 表中是否存在角色记录

### 问题：数据库错误 "column does not exist"

**解决**：重新运行 migration

```bash
bun run db:migrate
```

---

## 开发和测试

### 测试数据

```sql
-- 创建测试用户（密码：TestPass123!）
INSERT INTO users (id, email, username, password_hash, email_verified_at)
VALUES (
  'test-user-1',
  'test@example.com',
  'testuser',
  '$2a$10$example_hash_here',  -- 使用实际的 bcrypt hash
  NOW()
);

-- 创建管理员角色并分配
INSERT INTO rbac_roles (name, description, is_system)
VALUES ('admin', 'Administrator', true)
ON CONFLICT DO NOTHING;

INSERT INTO rbac_user_roles (user_id, role_id)
VALUES ('test-user-1', (SELECT id FROM rbac_roles WHERE name='admin'));
```

### 密码哈希生成

```typescript
import { hashPassword } from '@/utils/server/password';

const hash = await hashPassword('TestPass123!');
console.log(hash);
```

---

## 文件结构

```
src/
├── server/
│   ├── routers/lambda/
│   │   └── localAuth.ts          # tRPC 路由
│   └── modules/
│       └── EmailService.ts        # 邮件服务
├── libs/next-auth/
│   ├── auth.config.ts             # NextAuth 配置
│   └── providers/
│       └── credentials.ts         # Credentials Provider
├── utils/server/
│   └── password.ts                # 密码工具函数
├── envs/
│   └── auth.ts                    # 认证环境变量
packages/database/
├── src/
│   ├── models/
│   │   ├── localAuth.ts           # 令牌管理 Model
│   │   └── user.ts                # 用户 Model (扩展)
│   └── schemas/
│       └── user.ts                # 用户表 Schema (扩展)
└── migrations/
    └── 0048_dark_blue_blade.sql   # 本地认证 migration
```

---

## 许可证

本功能遵循 LobeChat 项目的开源许可证。
