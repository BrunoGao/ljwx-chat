# Anthropic 配置工具和文档

本目录包含了配置和管理 Anthropic Claude 模型的完整工具集和文档。

## 📚 文档

### [ANTHROPIC_SETUP_COMPLETE.md](./ANTHROPIC_SETUP_COMPLETE.md)

配置完成总结，包括：

- 配置状态概览
- 已完成的修改说明
- 使用方法（环境变量 vs 数据库配置）
- 技术细节和注意事项

### [anthropic-custom-config.md](./anthropic-custom-config.md)

环境变量配置详细指南，包括：

- 环境变量设置方法
- 自定义模型配置
- 配置验证步骤
- 技术实现细节

### [anthropic-migration-guide.md](./anthropic-migration-guide.md)

数据库配置迁移指南，包括：

- 迁移步骤说明
- 配置管理方法
- 故障排除指南
- 多环境部署建议

## 🛠️ 工具脚本

### 环境变量验证

```bash
# 验证环境变量配置
node scripts/verify-anthropic-config.js
```

### 数据库配置迁移

```bash
# 自动检测第一个用户并迁移
pnpm tsx scripts/migrate-anthropic-to-db.ts

# 指定目标用户 ID
TARGET_USER_ID=your_user_id pnpm tsx scripts/migrate-anthropic-to-db.ts
```

### 数据库配置验证

```bash
# 验证数据库中的配置
pnpm tsx scripts/verify-anthropic-db-config.ts

# 指定用户 ID
TARGET_USER_ID=your_user_id pnpm tsx scripts/verify-anthropic-db-config.ts
```

## 🚀 快速开始

### 方式 1: 环境变量配置（适用于容器化部署）

1. 设置环境变量：

```bash
export ANTHROPIC_AUTH_TOKEN=your_api_key
export ANTHROPIC_BASE_URL=https://apiproxy.aicodeditor.com/api
```

2. 验证配置：

```bash
node scripts/verify-anthropic-config.js
```

3. 启动应用：

```bash
pnpm dev
```

### 方式 2: 数据库配置（推荐，支持动态修改）

1. 确保环境变量已设置（用于初始迁移）：

```bash
export ANTHROPIC_AUTH_TOKEN=your_api_key
export ANTHROPIC_BASE_URL=https://apiproxy.aicodeditor.com/api
```

2. 运行迁移脚本：

```bash
pnpm tsx scripts/migrate-anthropic-to-db.ts
```

3. 验证配置：

```bash
pnpm tsx scripts/verify-anthropic-db-config.ts
```

4. 启动应用：

```bash
pnpm dev
```

5. 通过 Admin UI 管理配置：
   - 访问 `/settings/provider`
   - 找到 Anthropic provider
   - 修改配置并保存（无需重启）

## 📊 配置优先级

系统按以下优先级读取配置：

1. **数据库配置** - 最高优先级
   - 存储在 `ai_providers` 表的 `keyVaults` 字段
   - 支持通过 Admin UI 动态修改
   - 修改后无需重启应用

2. **环境变量配置** - 备用方案
   - 适用于容器化部署（如 Kubernetes）
   - 修改后需要重启应用

## 🔑 支持的环境变量

### API 密钥

- `ANTHROPIC_API_KEY` (优先)
- `ANTHROPIC_AUTH_TOKEN` (备用)

### API 端点

- `ANTHROPIC_PROXY_URL` (优先)
- `ANTHROPIC_BASE_URL` (备用)

### 自定义模型列表

- `ANTHROPIC_MODEL_LIST` (可选)
  - 示例: `claude-sonnet-4-6,claude-opus-4-6`

## 🔒 安全性

### 环境变量

- 敏感信息存储在环境变量中
- 不要将 `.env.local` 提交到版本控制

### 数据库配置

- 使用 AES-GCM 算法加密
- 加密密钥来自 `KEY_VAULTS_SECRET` 环境变量
- 确保该环境变量在所有环境中保持一致

## 🐛 故障排除

### 配置未生效

1. 检查配置优先级（数据库 > 环境变量）
2. 验证环境变量是否正确设置
3. 重启应用
4. 查看应用日志

### 迁移失败

1. 确保数据库中存在用户
2. 检查 `KEY_VAULTS_SECRET` 环境变量
3. 查看错误日志

### 加密错误

1. 确保 `KEY_VAULTS_SECRET` 已设置
2. 确保该环境变量在所有环境中一致
3. 检查数据库连接

## 📞 获取帮助

如遇到问题，请：

1. 查看相关文档
2. 运行验证脚本检查配置
3. 查看应用日志
4. 提交 Issue

## 🔄 更新日志

### 2025-02-XX

- ✅ 添加环境变量支持
- ✅ 添加数据库配置支持
- ✅ 创建迁移和验证工具
- ✅ 完善配置文档
