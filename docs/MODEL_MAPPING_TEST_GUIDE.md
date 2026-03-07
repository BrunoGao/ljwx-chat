# 模型映射与平台路由测试指南

## 功能概述

当前 `lingjingwanxiang:32b` 已拆成两层：

- **平台真相源**：`ljwx-deploy/platform/routing/routes.dev.yaml` 与 `routes.prod.yaml`
- **浏览器兼容桥**：`src/config/modelRouting.ts`
- **服务端实际决策**：`src/server/services/platformRouting/index.ts`

目标是让服务端路由从 Git 配置解释，而不是继续依赖 `ljwx-chat` 内部硬编码。

## 已完成的修改

### 1. 环境变量配置

**文件**: `.env.local`

```bash
OPENCLAW_GATEWAY_TOKEN=<openclaw-gateway-token>
OPENCLAW_GATEWAY_URL=https://openclaw.lingjingwanxiang.cn/v1
OPENCLAW_GATEWAY_ORIGIN=https://openclaw.lingjingwanxiang.cn
```

### 2. 平台路由配置

**文件**: `../ljwx-deploy/platform/routing/routes.dev.yaml`, `../ljwx-deploy/platform/routing/routes.prod.yaml`

- 为 `general_chat` 和 `knowledge_qa` 增加 `entrypoints.ljwx_chat`
- 通过同一个 `visible_models` 暴露 `lingjingwanxiang:32b`
- 将主模型与 fallback 条件放在平台配置中维护

### 3. 浏览器兼容桥

**文件**: `src/config/modelRouting.ts`, `src/services/_auth.ts`

- 保留最小兼容映射，供浏览器侧 auth/runtime hint 使用
- 不再作为服务端运行时真相源

### 4. 服务端路由读取

**文件**: `src/server/services/platformRouting/index.ts`

- 按环境加载 `routes.dev.yaml` 或 `routes.prod.yaml`
- 解析 `entrypoints.ljwx_chat.visible_models`
- 按 `visible_model + 请求特征(enabledSearch/plugins/tools)` 选择具体 route
- 输出 `route_id / selected_model / fallback_reason` 决策字段

### 5. 服务端 Runtime 初始化

**文件**: `src/server/modules/ModelRuntime/index.ts`

- 仅读取平台路由，不再回退到兼容桥映射

### 6. API 路由处理

**文件**: `src/app/(backend)/webapi/chat/[provider]/route.ts`

- 在请求入口记录平台路由决策日志
- 命中 `openclaw-gateway` 时直接走 OpenClaw
- OpenClaw 建连失败时按 route fallback 切回 runtime
- 未命中时继续走原有 runtime 初始化路径

## 测试步骤

### 1. 验证配置

```bash
# 验证平台路由文件中已存在 ljwx_chat 入口
sed -n '1,120p' ../ljwx-deploy/platform/routing/routes.dev.yaml
```

预期输出：

```
entrypoints:
  ljwx_chat:
    transport: openclaw-gateway
    visible_models:
      - lingjingwanxiang:32b
```

### 2. 启动应用

```bash
npm run dev
```

应用将在 <http://localhost:3210> 启动

### 3. 前端测试

#### 普通聊天路径

1. 打开浏览器访问 <http://localhost:3210>
2. 在模型选择器中选择 `lingjingwanxiang:32b`
3. 发送一条测试消息
4. 确认未开启搜索时命中 `general_chat`

#### 知识问答路径

1. 保持模型为 `lingjingwanxiang:32b`
2. 打开搜索或构造 `enabledSearch=true` 请求
3. 发送一条需要检索的测试消息
4. 确认命中 `knowledge_qa`

### 4. 验证 API 调用

打开浏览器开发者工具（F12），查看 Network 标签：

1. 找到 `/webapi/chat/openai` 请求
2. 检查请求 payload 中的 `model` 字段仍为 `lingjingwanxiang:32b`
3. 服务端日志中应出现平台路由决策记录
4. 搜索开启时，日志里的 `route_id` 应从 `general_chat` 切到 `knowledge_qa`

### 5. 检查日志

在终端查看服务器日志，应该看到：

- `route_id`
- `selected_model`
- `fallback_reason`
- `selected_provider`
- OpenClaw 调用日志

## 工作原理

```
用户选择模型
    ↓
lingjingwanxiang:32b
    ↓
浏览器侧兼容桥生成 auth/runtime hint
    ↓
传递 runtimeProvider: 'openai'
保留可见模型名: 'lingjingwanxiang:32b'
    ↓
服务端读取 ljwx-deploy 路由配置并匹配 entrypoint
    ↓
根据 enabledSearch 等请求特征选择 route_id
    ↓
服务端识别 OpenClaw 路由并建立 WebSocket 会话
    ↓
调用 OpenClaw Gateway
    ↓
返回实际模型响应
```

## 配置优先级

1. **平台路由配置**（最高优先级）
   - 定义在 `ljwx-deploy/platform/routing/routes.*.yaml`

2. **浏览器兼容桥**
   - 定义在 `MODEL_PROVIDER_MAPPING`
   - 仅用于浏览器侧 auth/runtime hint，不参与服务端选路

3. **用户 keyVaults 配置**
   - 用户自定义的 API keys

4. **环境变量配置**
   - `.env.local` 中的配置

## 故障排查

### 问题 1: 仍然调用 Ollama

**检查**:

- 确认 `routes.dev.yaml` 或 `routes.prod.yaml` 中存在 `entrypoints.ljwx_chat`
- 确认 `MODEL_PROVIDER_MAPPING` 仍保留兼容桥映射
- 检查浏览器控制台是否有错误
- 查看服务器日志确认映射是否被应用

### 问题 2: OpenClaw 调用失败

**检查**:

- 验证 `OPENCLAW_GATEWAY_TOKEN` 是否正确
- 确认 `OPENCLAW_GATEWAY_URL` 可访问
- 检查网络连接
- 查看是否出现 runtime fallback 日志

### 问题 3: 前端显示错误

**检查**:

- 清除浏览器缓存
- 重启开发服务器
- 检查浏览器控制台错误

## 扩展映射

如需新增新的 ljwx-chat 可见模型，优先编辑 `ljwx-deploy/platform/routing/routes.*.yaml`：

```yaml
entrypoints:
  ljwx_chat:
    transport: openclaw-gateway
    visible_models:
      - lingjingwanxiang:32b
      - custom-model-name
```

## 注意事项

1. 模型映射是透明的，用户在前端看到的始终是 `lingjingwanxiang:32b`
2. 同一个可见模型可以按请求特征命中不同 route_id
3. 服务端不再依赖兼容桥做运行时选路
4. 不需要修改数据库或用户配置
5. 服务端路由真相在 deploy repo，更新后需要通过 Git 评审和发布链路生效

## 相关文件

- `src/config/modelRouting.ts` - 映射配置
- `src/server/services/platformRouting/index.ts` - 平台路由读取
- `src/services/_auth.ts` - 认证与 provider payload 构造
- `src/services/chat/clientModelRuntime.ts` - 客户端 runtime 初始化
- `src/services/chat/index.ts` - Chat 服务
- `src/server/modules/ModelRuntime/index.ts` - 服务端 runtime 初始化
- `src/app/(backend)/webapi/chat/[provider]/route.ts` - API 路由处理
- `../ljwx-deploy/platform/routing/routes.dev.yaml` - dev 路由真相源
- `../ljwx-deploy/platform/routing/routes.prod.yaml` - prod 路由真相源
