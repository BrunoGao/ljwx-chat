# 模型映射功能测试指南

## 功能概述

实现了透明的模型映射机制：

- **前端显示**: `lingjingwanxiang:32b`
- **后端实际调用**: Anthropic Claude API (`claude-sonnet-4-6`)

## 已完成的修改

### 1. 环境变量配置

**文件**: `.env.local`

```bash
ANTHROPIC_API_KEY=sk_1d0e119b46617712413a82bb732d4f78e3b254eae4d2fa3d1c96aa96a9099635
ANTHROPIC_PROXY_URL=https://apiproxy.aicodeditor.com/api
```

### 2. 模型映射配置

**文件**: `src/services/_auth.ts`

- 添加 `MODEL_PROVIDER_MAPPING` 常量（第 8-15 行）
- 修改 `createPayloadWithKeyVaults` 函数支持模型映射（第 128 行）

### 3. 客户端 Runtime 初始化

**文件**: `src/services/chat/clientModelRuntime.ts`

- 修改 `initializeWithClientStore` 函数接收 model 参数（第 11-35 行）

### 4. Chat 服务调用

**文件**: `src/services/chat/index.ts`

- 修改 `fetchOnClient` 方法传递 model 参数（第 467 行）

### 5. 服务端 Runtime 初始化

**文件**: `src/server/modules/ModelRuntime/index.ts`

- 导入 `MODEL_PROVIDER_MAPPING`（第 8 行）
- 修改 `initModelRuntimeWithUserPayload` 函数支持模型映射（第 202-217 行）

### 6. API 路由处理

**文件**: `src/app/(backend)/webapi/chat/[provider]/route.ts`

- 调整请求处理顺序，先获取 data 再初始化 runtime
- 传递 model 参数给 `initModelRuntimeWithUserPayload`

## 测试步骤

### 1. 验证配置

```bash
# 运行配置测试
node scripts/test-model-mapping-simple.ts
```

预期输出：

```
✅ 映射配置正确:
  - 前端显示: lingjingwanxiang:32b
  - 实际 Provider: anthropic
  - 实际 Model: claude-sonnet-4-6
```

### 2. 启动应用

```bash
npm run dev
```

应用将在 <http://localhost:3210> 启动

### 3. 前端测试

1. 打开浏览器访问 <http://localhost:3210>
2. 在模型选择器中选择 `lingjingwanxiang:32b`
3. 发送一条测试消息
4. 观察响应是否来自 Anthropic Claude

### 4. 验证 API 调用

打开浏览器开发者工具（F12），查看 Network 标签：

1. 找到 `/webapi/chat/ollama` 请求
2. 检查请求 payload 中的 model 字段应为 `lingjingwanxiang:32b`
3. 响应应该来自 Anthropic Claude API

### 5. 检查日志

在终端查看服务器日志，应该看到：

- 模型映射检测日志
- Anthropic API 调用日志

## 工作原理

```
用户选择模型
    ↓
lingjingwanxiang:32b
    ↓
客户端检测映射 (clientModelRuntime.ts)
    ↓
传递 runtimeProvider: 'anthropic'
传递 runtimeModel: 'claude-sonnet-4-6'
    ↓
服务端应用映射 (ModelRuntime/index.ts)
    ↓
调用 Anthropic API
    ↓
返回 Claude 响应
```

## 配置优先级

1. **模型映射配置**（最高优先级）
   - 定义在 `MODEL_PROVIDER_MAPPING`

2. **用户 keyVaults 配置**
   - 用户自定义的 API keys

3. **环境变量配置**
   - `.env.local` 中的配置

## 故障排查

### 问题 1: 仍然调用 Ollama

**检查**:

- 确认 `MODEL_PROVIDER_MAPPING` 中有正确的映射
- 检查浏览器控制台是否有错误
- 查看服务器日志确认映射是否被应用

### 问题 2: Anthropic API 调用失败

**检查**:

- 验证 `ANTHROPIC_API_KEY` 是否正确
- 确认 `ANTHROPIC_PROXY_URL` 可访问
- 检查网络连接

### 问题 3: 前端显示错误

**检查**:

- 清除浏览器缓存
- 重启开发服务器
- 检查浏览器控制台错误

## 扩展映射

如需添加更多模型映射，编辑 `src/services/_auth.ts`:

```typescript
const MODEL_PROVIDER_MAPPING: Record<string, { provider: string; model: string }> = {
  'lingjingwanxiang:32b': {
    provider: 'anthropic',
    model: 'claude-sonnet-4.5',
  },
  // 添加新的映射
  'custom-model-name': {
    provider: 'openai',
    model: 'gpt-4',
  },
};
```

## 注意事项

1. 模型映射是透明的，用户在前端看到的始终是 `lingjingwanxiang:32b`
2. 所有 API 调用都会自动路由到 Anthropic
3. 不需要修改数据库或用户配置
4. 映射配置在代码层面，重启应用后生效

## 相关文件

- `src/services/_auth.ts` - 映射配置和认证逻辑
- `src/services/chat/clientModelRuntime.ts` - 客户端 runtime 初始化
- `src/services/chat/index.ts` - Chat 服务
- `src/server/modules/ModelRuntime/index.ts` - 服务端 runtime 初始化
- `src/app/(backend)/webapi/chat/[provider]/route.ts` - API 路由处理
