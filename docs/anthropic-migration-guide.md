# Anthropic 配置迁移指南

本指南说明如何将 Anthropic 环境变量配置迁移到数据库，实现通过 Admin UI 管理配置。

## 背景

灵境万象系统支持两种配置方式：

1. **环境变量配置**：适用于容器化部署（如 Kubernetes）
2. **数据库配置**：支持通过 Admin UI 动态修改，无需重启

配置优先级：**数据库配置 > 环境变量配置**

## 迁移步骤

### 1. 确保环境变量已设置

```bash
# 检查环境变量
echo $ANTHROPIC_AUTH_TOKEN
echo $ANTHROPIC_BASE_URL
```

### 2. 运行迁移脚本

```bash
# 自动检测第一个用户并迁移
pnpm tsx scripts/migrate-anthropic-to-db.ts

# 或指定目标用户 ID
TARGET_USER_ID=your_user_id pnpm tsx scripts/migrate-anthropic-to-db.ts
```

### 3. 验证迁移结果

迁移成功后，你会看到：

```
🔄 开始迁移 Anthropic 配置到数据库...

✅ 找到 API 密钥
✅ 找到自定义端点: https://apiproxy.aicodeditor.com/api

👤 自动检测到用户 ID: user_xxx

📦 准备加密配置数据...
✅ 配置数据已加密

📝 创建新的 Anthropic 配置...
✅ Anthropic 配置已创建

🎉 迁移完成！
```

### 4. 重启应用

```bash
pnpm dev
```

### 5. 通过 Admin UI 管理配置

1. 访问 `/settings/provider`
2. 找到 Anthropic provider
3. 点击进入配置页面
4. 修改 API Key 或 Base URL
5. 保存配置（无需重启应用）

## 配置说明

### 数据库存储格式

配置存储在 `ai_providers` 表的 `keyVaults` 字段中：

```json
{
  "apiKey": "your_api_key",
  "baseURL": "https://apiproxy.aicodeditor.com/api"
}
```

### 加密机制

- 使用 AES-GCM 算法加密
- 加密密钥来自 `KEY_VAULTS_SECRET` 环境变量
- 确保该环境变量在所有环境中保持一致

## 故障排除

### 错误：未找到用户

```bash
❌ 错误: 数据库中没有用户
```

**解决方案**：

1. 先创建用户账号
2. 或通过 `TARGET_USER_ID` 环境变量指定用户 ID

### 错误：加密失败

```bash
❌ 迁移失败: Error: KEY_VAULTS_SECRET is not set
```

**解决方案**：
确保 `KEY_VAULTS_SECRET` 环境变量已设置：

```bash
export KEY_VAULTS_SECRET=your_secret_key
```

### 配置未生效

**检查步骤**：

1. 确认数据库中配置已保存
2. 重启应用
3. 检查应用日志

## 多环境部署

### 开发环境

- 使用环境变量配置
- 或通过 Admin UI 配置

### 生产环境（Kubernetes）

- 推荐使用 Secret 管理环境变量
- 数据库配置会覆盖环境变量
- 支持通过 Admin UI 动态调整

## 相关文档

- [Anthropic 自定义配置指南](./anthropic-custom-config.md)
- [配置完成总结](./ANTHROPIC_SETUP_COMPLETE.md)
