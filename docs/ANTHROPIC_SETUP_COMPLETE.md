# Anthropic Claude 配置完成

## ✅ 配置状态

系统已成功配置为使用自定义 Anthropic API 凭证，支持两种配置方式：

### 方式 1: 环境变量配置

- **API 密钥**: ✅ 已配置 (来源: `ANTHROPIC_AUTH_TOKEN`)
- **API 端点**: ✅ 已配置 (来源: `ANTHROPIC_BASE_URL`)
- **Provider 状态**: ✅ 将自动启用

### 方式 2: 数据库配置（推荐）

- **配置管理**: ✅ 支持通过 Admin UI 动态修改
- **配置持久化**: ✅ 存储在数据库中
- **配置优先级**: ✅ 数据库配置 > 环境变量配置

## 📝 已完成的修改

### 1. 环境变量支持 (`src/envs/llm.ts`)

添加了对以下环境变量的支持：

```typescript
// API 密钥（优先级：ANTHROPIC_API_KEY > ANTHROPIC_AUTH_TOKEN）
ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;

// Base URL（优先级：ANTHROPIC_PROXY_URL > ANTHROPIC_BASE_URL）
ANTHROPIC_PROXY_URL: process.env.ANTHROPIC_PROXY_URL || process.env.ANTHROPIC_BASE_URL;

// 自动启用检测
ENABLED_ANTHROPIC: !!process.env.ANTHROPIC_API_KEY || !!process.env.ANTHROPIC_AUTH_TOKEN;
```

### 2. 环境变量示例 (`.env.example`)

更新了文档，说明支持的环境变量别名：

```bash
# ANTHROPIC_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Alternative: ANTHROPIC_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ANTHROPIC_PROXY_URL=https://api.anthropic.com
# Alternative: ANTHROPIC_BASE_URL=https://api.anthropic.com
```

### 3. 配置文档

创建了详细的配置指南：

- `docs/anthropic-custom-config.md` - 环境变量配置指南
- `docs/anthropic-migration-guide.md` - 数据库配置迁移指南

### 4. 数据库配置支持 (`packages/types/src/user/settings/keyVaults.ts`)

添加了 Anthropic KeyVault 类型定义：

```typescript
export interface AnthropicKeyVault {
  apiKey?: string;
  baseURL?: string;
}

export interface UserKeyVaults {
  // ... 其他 providers
  anthropic?: AnthropicKeyVault;
}
```

### 5. 迁移和验证脚本

创建了自动化工具：

- `scripts/migrate-anthropic-to-db.ts` - 将环境变量配置迁移到数据库
- `scripts/verify-anthropic-db-config.ts` - 验证数据库配置
- `scripts/verify-anthropic-config.js` - 验证环境变量配置

## 🚀 使用方法

### 方式 1: 使用环境变量（适用于容器化部署）

你的环境变量已经正确设置：

```bash
ANTHROPIC_AUTH_TOKEN=sk_1d0e119...9635
ANTHROPIC_BASE_URL=https://apiproxy.aicodeditor.com/api
```

重启开发服务器以应用配置：

```bash
pnpm dev
```

### 方式 2: 使用数据库配置（推荐，支持动态修改）

#### 步骤 1: 迁移配置到数据库

```bash
# 自动检测第一个用户并迁移
pnpm tsx scripts/migrate-anthropic-to-db.ts

# 或指定目标用户 ID
TARGET_USER_ID=your_user_id pnpm tsx scripts/migrate-anthropic-to-db.ts
```

#### 步骤 2: 验证配置

```bash
pnpm tsx scripts/verify-anthropic-db-config.ts
```

#### 步骤 3: 通过 Admin UI 管理配置

1. 访问 `/settings/provider`
2. 找到 Anthropic provider
3. 点击进入配置页面
4. 修改 API Key 或 Base URL
5. 保存配置（无需重启应用）

### 使用 Claude 模型

1. 打开应用
2. 在模型选择器中选择 Anthropic provider
3. 选择可用的 Claude 模型（如 Claude Sonnet 4.5, Claude Opus 4.1 等）
4. 开始对话

### 使用自定义模型 ID

如果需要使用 `claude-sonnet-4-6` 或其他自定义模型 ID，在 `.env.local` 中添加：

```bash
ANTHROPIC_MODEL_LIST=claude-sonnet-4-6,claude-opus-4-6
```

## 🔍 验证配置

### 验证环境变量配置

```bash
node scripts/verify-anthropic-config.js
```

### 验证数据库配置

```bash
pnpm tsx scripts/verify-anthropic-db-config.ts
```

## 📚 技术细节

### 配置优先级

系统按以下优先级读取配置：

1. **数据库配置** (`ai_providers` 表的 `keyVaults` 字段) - 最高优先级
2. **环境变量配置** - 备用方案

### 环境变量优先级

系统按以下优先级读取环境变量：

1. **API 密钥**: `ANTHROPIC_API_KEY` > `ANTHROPIC_AUTH_TOKEN`
2. **Base URL**: `ANTHROPIC_PROXY_URL` > `ANTHROPIC_BASE_URL`

### 数据库配置格式

配置存储在 `ai_providers` 表中，使用 AES-GCM 加密：

```json
{
  "apiKey": "your_api_key",
  "baseURL": "https://apiproxy.aicodeditor.com/api"
}
```

### 代码流程

1. `src/envs/llm.ts` - 读取和验证环境变量
2. `src/server/modules/ModelRuntime/index.ts` - 初始化 Anthropic provider
3. `packages/model-runtime/src/providers/anthropic/index.ts` - 创建 Anthropic 客户端

### 自动启用逻辑

当以下任一条件满足时，Anthropic provider 将自动启用：

- `ANTHROPIC_API_KEY` 环境变量存在
- `ANTHROPIC_AUTH_TOKEN` 环境变量存在

## ⚠️ 注意事项

### 环境变量配置

1. **环境变量修改后需要重启服务器**
2. **自定义模型 ID 需要确保与 API 端点兼容**
3. **如果使用自定义端点，请确保端点实现了 Anthropic API 兼容接口**

### 数据库配置

1. **配置修改后无需重启应用**
2. **确保 `KEY_VAULTS_SECRET` 环境变量在所有环境中保持一致**
3. **数据库配置会覆盖环境变量配置**
4. **在 Kubernetes 等环境中，推荐使用数据库配置以支持动态调整**

## 🎯 下一步

### 使用环境变量配置

1. 重启开发服务器: `pnpm dev`
2. 在应用中测试 Anthropic 模型
3. 如需使用特定模型版本，配置 `ANTHROPIC_MODEL_LIST` 环境变量

### 使用数据库配置（推荐）

1. 运行迁移脚本: `pnpm tsx scripts/migrate-anthropic-to-db.ts`
2. 验证配置: `pnpm tsx scripts/verify-anthropic-db-config.ts`
3. 重启应用: `pnpm dev`
4. 通过 Admin UI 管理配置: `/settings/provider`

## 📖 相关文档

- [Anthropic 自定义配置指南](./anthropic-custom-config.md)
- [Anthropic 配置迁移指南](./anthropic-migration-guide.md)
- [环境变量配置](./.env.example)
- [模型列表](../packages/model-bank/src/aiModels/anthropic.ts)
