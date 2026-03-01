<div align="center">

# 灵境万象 OMNIVERSE

**一个基于 LobeChat 定制的企业级 AI 助手平台**

支持本地 Ollama 模型 | 知识库管理 | 多模态对话 | 插件系统

[快速开始](#-快速开始) · [本地开发](#️-本地开发) · [生产部署](#-生产部署) · [技术栈](#-技术栈)

</div>

---

## 📖 项目简介

灵境万象（OMNIVERSE）是基于开源 AI 助手框架 LobeChat 定制开发的企业级对话平台。项目支持本地化部署，集成了 Ollama 本地大语言模型、MinIO 对象存储、PostgreSQL 数据库等企业级基础设施。

### ✨ 核心特性

- 🤖 **本地模型支持** - 集成 Ollama，支持 `lingjingwanxiang:32b` 等本地模型
- 📚 **知识库管理** - 支持文档上传、向量检索、知识库问答
- 🎨 **多模态对话** - 支持文本、图像、语音等多种交互方式
- 🔌 **MCP 插件系统** - 可扩展的插件架构，一键安装各类工具
- 🔐 **本地认证系统** - 内置用户认证和权限管理
- 🗄️ **灵活的数据存储** - 支持本地数据库（PGLite）和远程数据库（PostgreSQL）
- ☁️ **对象存储** - 集成 MinIO 用于文件和媒体存储
- 🌙 **现代化设计** - 精美的 UI 界面，支持深色模式和主题定制

---

## 🚀 快速开始

### 环境要求

- Node.js 18.x 或更高版本
- pnpm 9.x 或更高版本
- PostgreSQL 14+ (带 pgvector 扩展)
- MinIO (对象存储)
- Ollama (可选，用于本地模型)

### 一键启动（开发环境）

```bash
# 克隆项目
git clone <repository-url>
cd ljwx-chat

# 安装依赖
pnpm install

# 配置环境变量（参考 .env.local.example）
cp .env.local.example .env.local

# 启动开发服务器
pnpm dev
```

访问 <http://localhost:3210> 即可使用。

---

## 🖥️ 本地开发

完整的本地开发环境需要配置以下服务：

### 1️⃣ 数据库配置 (PostgreSQL + pgvector)

```bash
# macOS 安装
brew install postgresql@14 pgvector
brew services start postgresql@14

# 创建数据库
psql -c "CREATE DATABASE ljwx_chat;"
psql -d ljwx_chat -c "CREATE EXTENSION vector;"

# 运行数据库迁移
bun run db:migrate
```

### 2️⃣ 对象存储配置 (MinIO)

```bash
# 使用 Docker Compose 启动 MinIO
docker-compose -f docker-compose.minio.yml up -d

# 配置 MinIO bucket（首次运行）
./setup-minio.sh
```

MinIO 管理界面：<http://127.0.0.1:9002>

### 3️⃣ Ollama 本地模型配置

```bash
# macOS 安装 Ollama
brew install ollama

# 配置 Ollama 支持远程访问
launchctl setenv OLLAMA_ORIGINS "*"
launchctl setenv OLLAMA_HOST "0.0.0.0:11434"

# 重启 Ollama
pkill ollama && open -a Ollama

# 下载灵境万象模型
ollama pull lingjingwanxiang:32b
```

### 4️⃣ 环境变量配置

创建 `.env.local` 文件：

```bash
# 数据库配置
DATABASE_URL=postgresql://user@localhost:5432/ljwx_chat
DATABASE_DRIVER=node
KEY_VAULTS_SECRET=<使用 openssl rand -base64 32 生成>

# S3/MinIO 存储配置
S3_ENDPOINT=http://127.0.0.1:9002
S3_BUCKET=ljwx-chat
S3_PUBLIC_DOMAIN=http://127.0.0.1:9002
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_ENABLE_PATH_STYLE=1
S3_SET_ACL=0

# Ollama 配置（使用本地 IP 以支持远程访问）
OLLAMA_PROXY_URL=http://192.168.1.x:11434
ENABLED_OLLAMA=1

# 应用配置
NEXT_PUBLIC_BASE_URL=http://localhost:3210
```

### 开发命令

```bash
# 启动开发服务器 (端口 3210)
pnpm dev

# 代码检查和类型检查
pnpm lint
pnpm type-check

# 数据库操作
pnpm db:studio   # 打开数据库管理界面
pnpm db:generate # 生成数据库迁移文件
pnpm db:migrate  # 执行数据库迁移
```

---

## 🚢 生产部署

### 构建项目

```bash
# 构建生产版本
pnpm build

# 构建过程包括：
# - TypeScript 类型检查
# - ESLint 代码检查
# - Next.js 优化构建
# - 数据库迁移
```

### 启动生产服务器

#### 方法 1：直接启动

```bash
# 启动生产服务器（默认端口 3210）
pnpm start

# 服务地址：
# - 本地: http://localhost:3210
# - 局域网: http://<your-ip>:3210
```

#### 方法 2：使用 PM2（推荐）

PM2 提供进程守护、自动重启、日志管理等功能：

```bash
# 全局安装 PM2
npm install -g pm2

# 启动应用
pm2 start "pnpm start" --name lingjingwanxiang

# 设置开机自启
pm2 startup
pm2 save

# 常用 PM2 命令
pm2 status                   # 查看状态
pm2 logs lingjingwanxiang    # 查看日志
pm2 restart lingjingwanxiang # 重启应用
pm2 stop lingjingwanxiang    # 停止应用
pm2 delete lingjingwanxiang  # 删除进程
```

### 更新部署

```bash
# 拉取最新代码
git pull

# 安装依赖
pnpm install

# 重新构建
pnpm build

# 重启服务（PM2）
pm2 restart lingjingwanxiang

# 或直接重启（非 PM2）
pkill -f "next start" && pnpm start
```

### Kubernetes 部署

项目支持 Kubernetes 部署，相关配置文件位于 `k8s/` 目录。

CI/CD 工作流说明见：`docs/GITHUB-GITEA-WORKFLOW-GUIDE.md`。

---

## 🛠️ 技术栈

### 前端框架

- **Next.js 15** - React 全栈框架
- **React 19** - 用户界面库
- **TypeScript** - 类型安全
- **Ant Design** + **@lobehub/ui** - 组件库
- **antd-style** - CSS-in-JS 解决方案
- **Zustand** - 状态管理
- **SWR** - 数据获取
- **react-i18next** - 国际化

### 后端技术

- **tRPC** - 类型安全的 API 层
- **PostgreSQL** - 关系型数据库
- **Drizzle ORM** - 数据库 ORM
- **PGLite** - 浏览器端数据库（WASM）
- **pgvector** - 向量数据库扩展
- **MinIO** - 对象存储服务
- **Ollama** - 本地大语言模型运行时

### AI 能力

- **Ollama** - 本地模型支持（lingjingwanxiang:32b）
- **OpenAI API** - 云端模型支持
- **LangChain** - AI 应用框架
- **pgvector** - 向量检索
- **MCP (Model Context Protocol)** - 插件系统

### 开发工具

- **pnpm** - 包管理器
- **bun** - 脚本运行器
- **Vitest** - 单元测试
- **ESLint** + **Stylelint** - 代码规范
- **Husky** - Git hooks

---

## 📋 开发规范

### Git 工作流

- 使用 `git rebase` 进行代码拉取
- 提交信息使用 gitmoji 前缀
- 分支命名格式：`tj/feat/feature-name`

### 代码规范

- 遵循 TypeScript 最佳实践
- 使用 ESLint 和 Stylelint 进行代码检查
- 参考 `.cursor/rules/typescript.mdc` 了解详细规范

### 测试规范

```bash
# 运行测试（指定文件）
bunx vitest run --silent='passed-only' 'src/**/*.test.ts'

# 运行 packages 中的测试
cd packages/database && bunx vitest run
```

---

## 🔗 相关资源

- [LobeChat 官方文档](https://lobehub.com/docs)
- [Ollama 官网](https://ollama.ai)
- [MinIO 文档](https://min.io/docs)
- [Drizzle ORM 文档](https://orm.drizzle.team)

---

## 📄 许可证

本项目基于 [MIT License](./LICENSE) 开源。

---

<div align="center">

**灵境万象 OMNIVERSE** - 让 AI 触手可及

</div>
