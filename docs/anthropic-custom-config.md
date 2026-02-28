# Anthropic 自定义配置指南

## 环境变量配置

系统现已支持使用自定义 Anthropic API 凭证和端点。

### 支持的环境变量

#### API 密钥（二选一）

- `ANTHROPIC_API_KEY` - 标准 Anthropic API 密钥
- `ANTHROPIC_AUTH_TOKEN` - 自定义认证令牌（别名）

#### API 端点（二选一）

- `ANTHROPIC_PROXY_URL` - 标准代理 URL
- `ANTHROPIC_BASE_URL` - 自定义基础 URL（别名）

### 配置示例

在 `.env.local` 文件中添加：

```bash
# 使用自定义环境变量名称
ANTHROPIC_AUTH_TOKEN=your_token_here
ANTHROPIC_BASE_URL=https://your-custom-endpoint.com

# 或使用标准环境变量名称
ANTHROPIC_API_KEY=sk-ant-api03-xxx
ANTHROPIC_PROXY_URL=https://api.anthropic.com
```

### 自定义模型配置

如果需要使用自定义模型 ID（如 `claude-sonnet-4-6`），可以通过以下方式配置：

```bash
# 指定可用的模型列表
ANTHROPIC_MODEL_LIST=claude-sonnet-4-6,claude-opus-4-6
```

### 验证配置

1. 重启开发服务器：

   ```bash
   pnpm dev
   ```

2. 检查 Anthropic provider 是否已启用：
   - 系统会自动检测 `ANTHROPIC_API_KEY` 或 `ANTHROPIC_AUTH_TOKEN`
   - 如果任一变量存在，Anthropic provider 将自动启用

3. 在应用中选择 Anthropic 模型进行测试

## 技术实现

### 环境变量优先级

系统按以下优先级读取环境变量：

1. **API 密钥**: `ANTHROPIC_API_KEY` > `ANTHROPIC_AUTH_TOKEN`
2. **Base URL**: `ANTHROPIC_PROXY_URL` > `ANTHROPIC_BASE_URL`

### 代码修改位置

- `src/envs/llm.ts` - 环境变量定义和读取逻辑
- `src/server/modules/ModelRuntime/index.ts` - Runtime 初始化逻辑
- `.env.example` - 环境变量示例文档

## 注意事项

1. 环境变量修改后需要重启服务器才能生效
2. 自定义模型 ID 需要确保与 API 端点兼容
3. 如果使用自定义端点，请确保端点实现了 Anthropic API 兼容接口
