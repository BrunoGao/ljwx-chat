# 灵境万象 - Docker 生产环境部署说明

## 🎯 概述

本文档介绍如何使用 Docker 将灵境万象部署到生产环境。

**配置特点:**

- ✅ 默认模型: Ollama qwen3:32b
- ✅ 知识库: PostgreSQL + PGVector
- ✅ 文件存储: MinIO (S3 兼容)
- ✅ 生产模式: Docker 容器化部署
- ✅ 开发模式认证绕过：无需登录

---

## 📋 系统要求

### 已安装的服务

在启动 Docker 容器之前，确保以下服务正在运行：

| 服务                      | 端口                       | 状态检查命令                                   |
| ------------------------- | -------------------------- | ---------------------------------------------- |
| PostgreSQL\@14 + PGVector | 5432                       | `psql -d lingjingwanxiang -c "SELECT 1;"`      |
| MinIO                     | 9002 (API), 9003 (Console) | `curl http://127.0.0.1:9002/minio/health/live` |
| Ollama (qwen3:32b)        | 11434                      | `ollama list \| grep qwen3:32b`                |

### Docker

确保已安装 Docker Desktop 或 Docker Engine:

```bash
docker --version
docker-compose --version
```

---

## 🚀 快速启动

### 方法 1: 使用启动脚本 (推荐)

```bash
# 进入项目目录
cd ~/work/codes/AI/lobe-chat

# 添加执行权限
chmod +x start-docker.sh

# 启动服务
./start-docker.sh
```

脚本会自动:

1. 检查所有必要服务是否运行
2. 停止开发模式服务器
3. 启动 Docker 容器
4. 显示访问地址和管理命令

### 方法 2: 手动启动

```bash
# 1. 确保必要服务正在运行
psql -d lingjingwanxiang -c "SELECT 1;"      # PostgreSQL
curl http://127.0.0.1:9002/minio/health/live # MinIO
ollama list | grep qwen3:32b                 # Ollama 模型

# 2. 停止开发服务器 (如果正在运行)
lsof -ti:3010 | xargs kill -9

# 3. 启动 Docker Compose
cd ~/work/codes/AI/lobe-chat
docker-compose -f docker-compose.lingjingwanxiang.yml up -d
```

---

## 🔧 配置说明

### 环境变量

环境变量存储在 `.env.docker` 文件中:

```bash
# 数据库加密密钥 (与开发模式相同)
KEY_VAULTS_SECRET=ViDaP5K/rQX0fBY5ggsqupHN4GkQYU95OKO0gieQNkg=

# NextAuth 密钥
NEXTAUTH_SECRET=iH3sVoHNBBVacCwVijDWk3MSx5E5VZvGua0xy3XGJ2g=
NEXT_AUTH_SECRET=iH3sVoHNBBVacCwVijDWk3MSx5E5VZvGua0xy3XGJ2g=
```

⚠️ **重要**: 不要修改 `KEY_VAULTS_SECRET`，必须与开发模式一致，否则无法读取现有数据。

### Docker Compose 配置

`docker-compose.lingjingwanxiang.yml` 配置了：

#### 应用端口

- **应用**: `3210` (生产模式标准端口)

#### 数据库连接

```yaml
DATABASE_URL: postgresql://brunogao@host.docker.internal:5432/lingjingwanxiang
```

- 使用 `host.docker.internal` 连接主机上的 PostgreSQL

#### S3/MinIO 连接

```yaml
S3_ENDPOINT: http://host.docker.internal:9002
S3_BUCKET: lingjingwanxiang
S3_PUBLIC_DOMAIN: http://localhost:9002
```

#### Ollama 连接

```yaml
ENABLED_OLLAMA: 1
OLLAMA_PROXY_URL: http://host.docker.internal:11434
```

---

## 📊 访问应用

### 主应用

访问: **<http://localhost:3210>**

默认配置:

- 模型提供商: Ollama
- 默认模型: qwen3:32b
- 无需登录 (开发模式认证绕过)

### 相关服务

- **MinIO 控制台**: <http://localhost:9003>
  - 用户名: `minioadmin`
  - 密码: `minioadmin`

---

## 🛠 管理命令

### 查看日志

```bash
# 实时查看日志
docker-compose -f docker-compose.lingjingwanxiang.yml logs -f

# 查看最近 100 行
docker-compose -f docker-compose.lingjingwanxiang.yml logs --tail=100
```

### 停止服务

```bash
# 停止但不删除容器
docker-compose -f docker-compose.lingjingwanxiang.yml stop

# 停止并删除容器
docker-compose -f docker-compose.lingjingwanxiang.yml down
```

### 重启服务

```bash
# 重启所有服务
docker-compose -f docker-compose.lingjingwanxiang.yml restart

# 重启单个服务
docker-compose -f docker-compose.lingjingwanxiang.yml restart lingjingwanxiang
```

### 查看状态

```bash
# 查看运行状态
docker-compose -f docker-compose.lingjingwanxiang.yml ps

# 查看资源使用
docker stats lingjingwanxiang
```

### 进入容器

```bash
# 进入容器 shell
docker exec -it lingjingwanxiang /bin/sh

# 查看容器内环境变量
docker exec lingjingwanxiang env
```

---

## 🔄 更新部署

### 重新构建镜像

当修改了源代码后:

```bash
cd ~/work/codes/AI/lobe-chat

# 重新构建镜像
docker build -t lingjingwanxiang:latest .

# 重启服务应用新镜像
docker-compose -f docker-compose.lingjingwanxiang.yml up -d --force-recreate
```

### 拉取最新代码

```bash
cd ~/work/codes/AI/lobe-chat

# 拉取更新
git pull origin next

# 安装依赖
pnpm install

# 重新构建
docker build -t lingjingwanxiang:latest .

# 重启
docker-compose -f docker-compose.lingjingwanxiang.yml up -d --force-recreate
```

---

## 🐛 故障排查

### 问题 1: 容器无法启动

**检查日志**:

```bash
docker-compose -f docker-compose.lingjingwanxiang.yml logs
```

**常见原因**:

- PostgreSQL 未运行
- MinIO 未运行
- Ollama 未运行
- 端口 3210 被占用

### 问题 2: 无法连接到数据库

**检查数据库连接**:

```bash
# 从主机测试
psql -d lingjingwanxiang -c "SELECT 1;"

# 从容器内测试
docker exec lingjingwanxiang node -e "const { Pool } = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT 1').then(() => console.log('OK')).catch(console.error);"
```

**解决方案**:

- 确保 PostgreSQL 允许本地连接
- 检查 `DATABASE_URL` 配置

### 问题 3: 无法访问 MinIO

**检查 MinIO 状态**:

```bash
curl http://127.0.0.1:9002/minio/health/live
```

**从容器测试**:

```bash
docker exec lingjingwanxiang sh -c "curl http://host.docker.internal:9002/minio/health/live"
```

**解决方案**:

- 确保 MinIO 正在运行
- 检查端口是否正确 (9002)

### 问题 4: Ollama 模型不可用

**检查 Ollama**:

```bash
# 查看可用模型
ollama list

# 测试 Ollama API
curl http://127.0.0.1:11434/api/tags
```

**从容器测试**:

```bash
docker exec lingjingwanxiang sh -c "curl http://host.docker.internal:11434/api/tags"
```

**解决方案**:

- 确保 Ollama 服务运行中
- 确保 qwen3:32b 已下载

### 问题 5: 健康检查失败

**查看健康状态**:

```bash
docker inspect lingjingwanxiang | grep -A 10 Health
```

**解决方案**:

- 等待应用完全启动 (约 40 秒)
- 查看日志排查启动错误

---

## 📝 生产环境建议

### 安全配置

1. **更改默认密钥**:

   ```bash
   # 生成新的密钥
   openssl rand -base64 32
   
   # 更新 .env.docker
   ```

2. **启用真实认证**:
   - 配置 NextAuth 或 Clerk
   - 移除开发模式认证绕过

3. **配置 HTTPS**:
   - 使用 Nginx 反向代理
   - 配置 SSL 证书

### 数据备份

```bash
# 备份 PostgreSQL 数据库
pg_dump lingjingwanxiang > backup_$(date +%Y%m%d).sql

# 备份 MinIO 数据
mc mirror local/lingjingwanxiang ~/backups/minio/$(date +%Y%m%d)
```

### 监控

```bash
# 查看资源使用
docker stats lingjingwanxiang

# 设置日志大小限制
# 在 docker-compose.yml 中添加:
logging:
driver: "json-file"
options:
max-size: "10m"
max-file: "3"
```

---

## 📞 技术支持

### 系统信息

| 组件       | 版本             |
| ---------- | ---------------- |
| Next.js    | 16.0.4           |
| PostgreSQL | 14.19            |
| PGVector   | 0.8.1            |
| MinIO      | 2025-10-15       |
| Ollama     | qwen3:32b (20GB) |
| Docker     | latest           |

### 有用的命令

```bash
# 查看 Docker 镜像
docker images | grep lingjingwanxiang

# 清理未使用的镜像
docker image prune

# 查看容器详细信息
docker inspect lingjingwanxiang

# 导出日志
docker-compose -f docker-compose.lingjingwanxiang.yml logs > logs.txt
```

---

**最后更新**: 2025-11-26
**状态**: 生产就绪
**默认模型**: Ollama qwen3:32b
