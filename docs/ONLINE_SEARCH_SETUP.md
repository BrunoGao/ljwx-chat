# 联网搜索功能配置指南

## 问题说明

灵境万象的联网搜索功能需要配置搜索引擎后端。由于网络环境限制，公共 SearXNG 实例在中国大陆可能无法访问。

## 推荐方案

### 方案 1：使用 Tavily API（推荐）

**优势**：

- ✅ 稳定可靠，专为 AI 应用设计
- ✅ 提供免费额度（每月 1000 次调用）
- ✅ 无需代理，国内可直接访问
- ✅ 支持深度搜索和网页提取

**配置步骤**：

1. **注册 Tavily 账号**
   - 访问：<https://tavily.com/>
   - 点击 "Sign Up" 注册账号
   - 验证邮箱

2. **获取 API Key**
   - 登录后进入 Dashboard
   - 复制你的 API Key（格式：`tvly-xxxxxxxxxxxxxxxxxxxxxx`）

3. **配置环境变量**

   在 `.env.local` 文件中添加：

   ```bash
   # Tavily 搜索配置
   SEARCH_PROVIDERS=tavily
   CRAWLER_IMPLS=naive,tavily
   TAVILY_API_KEY=tvly-your_api_key_here
   ```

4. **重启服务器**

   ```bash
   pnpm dev
   ```

5. **测试功���**
   - 刷新浏览器
   - 在聊天界面启用 "联网搜索"
   - 提问："深圳今天的天气怎么样？"

---

### 方案 2：使用 Brave Search API

**优势**：

- ✅ 隐私友好
- ✅ 提供免费额度
- ✅ 搜索质量高

**配置步骤**：

1. **申请 API Key**
   - 访问：<https://brave.com/search/api/>
   - 注册并申请 API Key

2. **配置环境变量**
   ```bash
   SEARCH_PROVIDERS=brave
   CRAWLER_IMPLS=naive
   BRAVE_API_KEY=your_brave_api_key
   ```

---

### 方案 3：自建 SearXNG 实例

**优势**：

- ✅ 完全可控
- ✅ 无使用限制
- ✅ 隐私保护

**配置步骤**：

1. **使用 Docker 部署 SearXNG**

   ```bash
   docker run -d \
     --name searxng \
     -p 8080:8080 \
     -v $(pwd)/searxng:/etc/searxng \
     searxng/searxng:latest
   ```

2. **配置 JSON 输出**

   编辑 `searxng/settings.yml`：

   ```yaml
   search:
     formats:
       - html
       - json
   ```

3. **配置环境变量**
   ```bash
   SEARCH_PROVIDERS=searxng
   CRAWLER_IMPLS=naive
   SEARXNG_URL=http://localhost:8080
   ```

---

### 方案 4：使用代理访问公共 SearXNG

如果你有可用的代理，可以配置系统代理后使用公共实例：

```bash
# 设置代理
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port

# 配置 SearXNG
SEARCH_PROVIDERS=searxng
CRAWLER_IMPLS=naive
SEARXNG_URL=https://searx.be
```

---

## 配置验证

### 1. 检查环境变量

```bash
node -e "require('dotenv').config({ path: '.env.local' }); console.log('SEARCH_PROVIDERS:', process.env.SEARCH_PROVIDERS); console.log('TAVILY_API_KEY:', process.env.TAVILY_API_KEY ? '已配置' : '未配置');"
```

### 2. 查看服务器日志

```bash
# 启动服务器后查看日志
tail -f /tmp/ljwx-dev.log | grep -i "search"
```

### 3. 测试搜索功能

在聊天界面：

1. 启用 "联网搜索" 开关
2. 提问需要实时信息的问题
3. 观察是否调用搜索 API

---

## 故障排除

### 问题 1：AI 没有调用搜索工具

**可能原因**：

- 联网搜索开关未启用
- AI 判断不需要搜索
- 搜索配置未生效

**解决方案**：

1. 确认聊天界面的 "联网搜索" 开关已打开
2. 提问明确需要实时信息的问题
3. 重启服务器确保配置生效

### 问题 2：搜索请求失败

**检查步骤**：

1. 查看服务器日志中的错误信息
2. 验证 API Key 是否正确
3. 测试 API 端点是否可访问

### 问题 3：SearXNG 连接超时

**解决方案**：

- 更换其他公共实例（从 <https://searx.space/> 选择）
- 使用代理
- 切换到 Tavily 或 Brave Search

---

## 推荐配置

根据使用场景选择：

| 场景     | 推荐方案     | 理由                   |
| -------- | ------------ | ---------------------- |
| 个人开发 | Tavily       | 免费额度足够，配置简单 |
| 团队使用 | 自建 SearXNG | 无限制，可控性强       |
| 生产环境 | Brave Search | 稳定可靠，商业支持     |
| 隐私优先 | 自建 SearXNG | 数据完全自主           |

---

## 相关文档

- [Tavily API 文档](https://docs.tavily.com/)
- [Brave Search API 文档](https://brave.com/search/api/)
- [SearXNG 官方文档](https://docs.searxng.org/)
- [灵境万象联网搜索文档](./self-hosting/advanced/online-search.zh-CN.mdx)

---

## 获取帮助

如遇到问题：

1. 查看服务器日志
2. 检查环境变量配置
3. 验证 API Key 有效性
4. 提交 Issue 到项目仓库
