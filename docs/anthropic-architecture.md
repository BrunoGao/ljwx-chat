# Anthropic 配置系统架构

本文档详细说明灵境万象系统中 Anthropic 配置的完整架构和实现细节。

## 系统概览

灵境万象支持两种 Anthropic 配置方式：

1. **环境变量配置**：适用于容器化部署
2. **数据库配置**：支持通过 Admin UI 动态管理

配置优先级：**数据库配置 > 环境变量配置**

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      用户配置来源                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  环境变量配置      │         │   数据库配置       │         │
│  │                  │         │                  │         │
│  │ ANTHROPIC_       │         │ ai_providers     │         │
│  │ AUTH_TOKEN       │         │ table            │         │
│  │                  │         │                  │         │
│  │ ANTHROPIC_       │         │ keyVaults        │         │
│  │ BASE_URL         │         │ (encrypted)      │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                            │                   │
│           │                            │ 优先级更高          │
│           └────────────┬───────────────┘                   │
│                        │                                   │
└────────────────────────┼───────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   配置读取和合并逻辑             │
         │                               │
         │  initModelRuntimeWithUser     │
         │  Payload                      │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   ModelRuntime 初始化          │
         │                               │
         │  - 解密 keyVaults             │
         │  - 创建 Anthropic 客户端       │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   Anthropic API 调用           │
         └───────────────────────────────┘
```

## 核心组件

### 1. 环境变量管理 (`src/envs/llm.ts`)

**职责**：

- 读取和验证环境变量
- 支持多个环境变量别名
- 自动启用 Anthropic provider

**关键代码**：

```typescript
// 第 38-39 行：配置项定义
ANTHROPIC_API_KEY: z.string().optional(),
ANTHROPIC_PROXY_URL: z.string().optional(),

// 第 247-249 行：环境变量读取
ENABLED_ANTHROPIC: !!process.env.ANTHROPIC_API_KEY || !!process.env.ANTHROPIC_AUTH_TOKEN,
ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
ANTHROPIC_PROXY_URL: process.env.ANTHROPIC_PROXY_URL || process.env.ANTHROPIC_BASE_URL,
```

### 2. 数据库 Schema (`packages/database/src/schemas/aiProvider.ts`)

**职责**：

- 定义 AI Provider 数据结构
- 存储加密的 keyVaults

**表结构**：

```typescript
export const aiProviders = pgTable('ai_providers', {
  id: text('id').notNull(),
  userId: text('user_id').notNull(),
  keyVaults: text('key_vaults'), // 加密的配置
  config: jsonb('config'),
  enabled: boolean('enabled'),
  source: text('source'), // 'builtin' | 'custom'
  // ... 其他字段
});
```

### 3. KeyVaults 类型定义 (`packages/types/src/user/settings/keyVaults.ts`)

**职责**：

- 定义各 Provider 的配置类型
- 提供类型安全

**关键类型**：

```typescript
export interface AnthropicKeyVault {
  apiKey?: string;
  baseURL?: string;
}

export interface UserKeyVaults {
  openai?: OpenAICompatibleKeyVault;
  azure?: AzureOpenAIKeyVault;
  anthropic?: AnthropicKeyVault; // 新增
  // ... 其他 providers
}
```

### 4. 加密管理 (`src/server/modules/KeyVaultsEncrypt/index.ts`)

**职责**：

- 加密和解密 keyVaults
- 使用 AES-GCM 算法

**关键方法**：

```typescript
class KeyVaultsGateKeeper {
  static async initWithEnvKey(): Promise<KeyVaultsGateKeeper>;
  async encrypt(data: string): Promise<string>;
  async decrypt(encryptedData: string): Promise<string>;
}
```

### 5. AiProvider Model (`packages/database/src/models/aiProvider.ts`)

**职责**：

- 管理 AI Provider 的 CRUD 操作
- 处理配置的加密和解密

**关键方法**：

```typescript
class AiProviderModel {
  // 创建 provider
  create(params: CreateAiProviderParams, encryptor?: EncryptUserKeyVaults);

  // 更新配置
  updateConfig(id: string, value: UpdateAiProviderConfigParams, encryptor?: EncryptUserKeyVaults);

  // 获取配置（带解密）
  getAiProviderById(id: string, decryptor?: DecryptUserKeyVaults);

  // 获取运行时配置
  getAiProviderRuntimeConfig(decryptor?: DecryptUserKeyVaults);
}
```

### 6. ModelRuntime 初始化 (`src/server/modules/ModelRuntime/index.ts`)

**职责**：

- 初始化 AI Provider 的运行时
- 合并数据库配置和环境变量配置

**配置读取逻辑**（第 30-41 行）：

```typescript
default: {
  let upperProvider = provider.toUpperCase();
  const apiKey = apiKeyManager.pick(
    payload?.apiKey || llmConfig[`${upperProvider}_API_KEY`]
  );
  const baseURL = payload?.baseURL || process.env[`${upperProvider}_PROXY_URL`];
  return baseURL ? { apiKey, baseURL } : { apiKey };
}
```

### 7. 客户端认证 (`src/services/_auth.ts`)

**职责**：

- 从 store 读取用户配置
- 创建认证 payload
- 混淆敏感信息

**关键方法**：

```typescript
// 获取 provider 的认证 payload
export const getProviderAuthPayload = (provider: string, keyVaults: any) => {
  // Anthropic 使用默认的 OpenAI 兼容格式
  return {
    apiKey: clientApiKeyManager.pick(keyVaults?.apiKey),
    baseURL: keyVaults?.baseURL,
  };
};

// 创建带 keyVaults 的 payload
export const createPayloadWithKeyVaults = (provider: string) => {
  let keyVaults = aiProviderSelectors.providerKeyVaults(provider)(useAiInfraStore.getState()) || {};

  return {
    ...getProviderAuthPayload(runtimeProvider, keyVaults as any),
    runtimeProvider,
  };
};
```

## 配置流程

### 环境变量配置流程

```
1. 设置环境变量
   ├─ ANTHROPIC_AUTH_TOKEN=xxx
   └─ ANTHROPIC_BASE_URL=xxx

2. 启动应用
   └─ src/envs/llm.ts 读取环境变量

3. 用户发起聊天请求
   └─ src/services/_auth.ts 创建认证 header

4. 服务端处理请求
   ├─ src/server/modules/ModelRuntime/index.ts
   │  └─ 初始化 Anthropic runtime
   └─ 调用 Anthropic API
```

### 数据库配置流程

```
1. 运行迁移脚本
   ├─ scripts/migrate-anthropic-to-db.ts
   ├─ 读取环境变量
   ├─ 加密配置
   └─ 存储到数据库

2. 启动应用
   └─ 加载数据库配置到 store

3. 用户发起聊天请求
   ├─ src/services/_auth.ts
   │  └─ 从 store 读取 keyVaults
   └─ 创建认证 header

4. 服务端处理请求
   ├─ 解密 keyVaults
   ├─ 初始化 Anthropic runtime
   └─ 调用 Anthropic API
```

### Admin UI 配置流程

```
1. 用户访问 /settings/provider

2. 选择 Anthropic provider

3. 修改配置
   ├─ API Key
   └─ Base URL

4. 保存配置
   ├─ src/server/routers/lambda/aiProvider.ts
   │  └─ updateAiProviderConfig
   ├─ 加密配置
   └─ 更新数据库

5. 配置立即生效
   └─ 无需重启应用
```

## 配置优先级详解

### 读取顺序

1. **数据库配置**（最高优先级）
   - 位置：`ai_providers.keyVaults`
   - 读取：`AiProviderModel.getAiProviderById()`
   - 解密：`KeyVaultsGateKeeper.decrypt()`

2. **环境变量配置**（备用）
   - 位置：`process.env`
   - 读取：`src/envs/llm.ts`
   - 优先级：`ANTHROPIC_API_KEY` > `ANTHROPIC_AUTH_TOKEN`

### 合并逻辑

在 `initModelRuntimeWithUserPayload` 中：

```typescript
// payload 来自数据库配置
const apiKey = payload?.apiKey || llmConfig[`${upperProvider}_API_KEY`];
const baseURL = payload?.baseURL || process.env[`${upperProvider}_PROXY_URL`];
```

如果 `payload` 存在（数据库配置），则使用数据库配置；否则使用环境变量。

## 安全性

### 加密机制

1. **算法**：AES-GCM
2. **密钥来源**：`KEY_VAULTS_SECRET` 环境变量
3. **加密范围**：整个 `keyVaults` 对象

### 传输安全

1. **客户端到服务端**：
   - 使用 XOR 混淆
   - 通过 `LOBE_CHAT_AUTH_HEADER` 传输

2. **服务端到 API**：
   - HTTPS 加密
   - API Key 在 header 中传输

### 存储安全

1. **数据库**：
   - keyVaults 字段加密存储
   - 只有拥有 `KEY_VAULTS_SECRET` 的服务才能解密

2. **环境变量**：
   - 不要提交到版本控制
   - 使用 Secret 管理工具（如 Kubernetes Secrets）

## 扩展性

### 添加新的 Provider

1. 在 `packages/types/src/user/settings/keyVaults.ts` 添加类型：

```typescript
export interface NewProviderKeyVault {
  apiKey?: string;
  // ... 其他配置
}

export interface UserKeyVaults {
  // ... 现有 providers
  newProvider?: NewProviderKeyVault;
}
```

2. 在 `src/services/_auth.ts` 添加认证逻辑：

```typescript
case ModelProvider.NewProvider: {
  return {
    apiKey: clientApiKeyManager.pick(keyVaults?.apiKey),
    // ... 其他配置
  };
}
```

3. 在 `src/envs/llm.ts` 添加环境变量支持（可选）

### 添加新的配置项

1. 更新 KeyVault 类型定义
2. 更新 Admin UI 表单
3. 更新 ModelRuntime 初始化逻辑

## 测试

### 单元测试

- `packages/database/src/models/__tests__/aiProvider.test.ts`
- `src/server/routers/lambda/__tests__/aiProvider.test.ts`

### 集成测试

1. 环境变量配置测试：

```bash
node scripts/verify-anthropic-config.js
```

2. 数据库配置测试：

```bash
pnpm tsx scripts/verify-anthropic-db-config.ts
```

## 故障排除

### 配置未生效

**检查清单**：

1. ✅ 数据库配置是否存在？
2. ✅ 环境变量是否正确设置？
3. ✅ 应用是否重启？
4. ✅ `KEY_VAULTS_SECRET` 是否一致？

### 加密 / 解密失败

**可能原因**：

1. `KEY_VAULTS_SECRET` 未设置
2. `KEY_VAULTS_SECRET` 在不同环境中不一致
3. 数据库中的加密数据损坏

**解决方案**：

1. 检查环境变量
2. 重新运行迁移脚本
3. 查看应用日志

### Admin UI 无法保存配置

**可能原因**：

1. 用户权限不足
2. 数据库连接失败
3. 加密失败

**解决方案**：

1. 检查用户权限
2. 检查数据库连接
3. 查看服务端日志

## 性能考虑

### 配置缓存

- 数据库配置在应用启动时加载到 store
- 修改配置后自动更新 store
- 无需每次请求都查询数据库

### 加密性能

- 使用高效的 AES-GCM 算法
- 只在配置读写时加密 / 解密
- 运行时使用解密后的配置

## 最佳实践

### 开发环境

- 使用环境变量配置
- 或通过 Admin UI 配置
- 不要提交 `.env.local` 到版本控制

### 生产环境

- 推荐使用数据库配置
- 环境变量作为备用方案
- 使用 Secret 管理工具
- 定期轮换 API Key

### Kubernetes 部署

- 使用 Secret 存储环境变量
- 使用数据库配置支持动态调整
- 确保 `KEY_VAULTS_SECRET` 在所有 Pod 中一致

## 相关资源

- [Anthropic API 文档](https://docs.anthropic.com/)
- [LobeChat 文档](https://lobehub.com/docs)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
