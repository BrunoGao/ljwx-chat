# 📚 Kubernetes 部署文档索引

欢迎使用 LobeChat Kubernetes 部署套件！

## 🎯 快速导航

### 新手入门

- **[开始这里](./DEPLOY-TO-EXISTING.md)** - 3 步快速部署到现有架构 ⭐ 推荐
- **[快速开始](./QUICKSTART.md)** - 5 分钟快速部署指南

### 详细文档

- **[架构说明](./ARCHITECTURE.md)** - 了解整体架构和流量路径
- **[外部 Nginx 配置](./EXTERNAL-NGINX.md)** - 外部 Nginx 详细配置指南
- **[完整部署文档](./README.md)** - 详尽的部署和故障排查指南

## 📋 文件清单

### 配置文件 (YAML)

| 文件                    | 说明               | 用途                          |
| ----------------------- | ------------------ | ----------------------------- |
| `namespace.yaml`        | Namespace 定义     | 创建 chat namespace           |
| `configmap.yaml`        | 环境变量配置       | 非敏感配置                    |
| `secret.yaml`           | 敏感信息           | 数据库、密钥等 (由脚本生成)   |
| `deployment.yaml`       | 应用部署           | Pod 定义、资源限制、健康检查  |
| `service.yaml`          | Service 定义       | ClusterIP 服务                |
| `ingress.yaml`          | Ingress 路由       | chat.omniverseai.net 路由规则 |
| `ingress-nodeport.yaml` | Ingress Controller | NodePort 31080 配置           |
| `kustomization.yaml`    | Kustomize 配置     | 一键部署                      |

### 脚本工具 (Shell)

| 文件                 | 说明             | 用法                       |
| -------------------- | ---------------- | -------------------------- |
| `build.sh`           | 构建 Docker 镜像 | `./k8s/build.sh`           |
| `generate-secret.sh` | 生成 Secret      | `./k8s/generate-secret.sh` |
| `deploy.sh`          | 一键部署         | `./k8s/deploy.sh`          |

### 文档 (Markdown)

| 文件                    | 内容           | 适合场景                |
| ----------------------- | -------------- | ----------------------- |
| `DEPLOY-TO-EXISTING.md` | 部署到现有架构 | 已有外部 Nginx + K8s ⭐ |
| `QUICKSTART.md`         | 快速开始       | 快速部署                |
| `ARCHITECTURE.md`       | 架构说明       | 了解系统架构            |
| `EXTERNAL-NGINX.md`     | Nginx 配置     | 配置外部 Nginx          |
| `README.md`             | 完整文档       | 详细参考                |
| `INDEX.md`              | 本文档         | 文档导航                |

### 配置模板

| 文件            | 说明         |
| --------------- | ------------ |
| `.env.template` | 环境变量模板 |
| `.gitignore`    | Git 忽略规则 |

## 🚀 快速开始流程

### 场景 1: 部署到现有架构 (推荐)

你的环境:

- ✅ 外部 Nginx: 85.239.233.16
- ✅ K8s 节点: 10.7.0.2
- ✅ Nginx 反向代理到 10.7.0.2:31080

**跟随这个文档**: [DEPLOY-TO-EXISTING.md](./DEPLOY-TO-EXISTING.md)

### 场景 2: 全新部署

从零开始部署到 Kubernetes

**跟随这个文档**: [QUICKSTART.md](./QUICKSTART.md)

## 📊 部署架构

### 当前架构 (外部 Nginx + K8s)

```
Internet → 85.239.233.16 (Nginx + SSL)
         → 10.7.0.2:31080 (K8s Ingress)
         → chat namespace
         → LobeChat Pods
```

关键配置:

- TLS 在外部 Nginx 终止
- K8s Ingress 使用 NodePort 31080
- 必须正确转发 X-Forwarded-\* headers

**详细说明**: [ARCHITECTURE.md](./ARCHITECTURE.md)

## 🔧 部署步骤概览

### Step 1: 配置 K8s Ingress Controller

```bash
kubectl apply -f k8s/ingress-nodeport.yaml
```

**参考**: [DEPLOY-TO-EXISTING.md# 步骤 1](./DEPLOY-TO-EXISTING.md)

### Step 2: 部署 LobeChat

```bash
./k8s/build.sh
./k8s/generate-secret.sh
./k8s/deploy.sh
```

**参考**: [DEPLOY-TO-EXISTING.md# 步骤 2](./DEPLOY-TO-EXISTING.md)

### Step 3: 配置外部 Nginx

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
proxy_pass http://10.7.0.2:31080;
```

**参考**: [EXTERNAL-NGINX.md](./EXTERNAL-NGINX.md)

## 📖 按任务查找文档

| 任务             | 查看文档                                           |
| ---------------- | -------------------------------------------------- |
| 我想快速部署     | [DEPLOY-TO-EXISTING.md](./DEPLOY-TO-EXISTING.md)   |
| 了解系统架构     | [ARCHITECTURE.md](./ARCHITECTURE.md)               |
| 配置外部 Nginx   | [EXTERNAL-NGINX.md](./EXTERNAL-NGINX.md)           |
| 构建 Docker 镜像 | [QUICKSTART.md# 构建镜像](./QUICKSTART.md)         |
| 配置环境变量     | [.env.template](./.env.template)                   |
| 故障排查         | [ARCHITECTURE.md# 故障排查](./ARCHITECTURE.md)     |
| 更新部署         | [README.md# 更新部署](./README.md)                 |
| 查看日志         | [ARCHITECTURE.md# 监控和日志](./ARCHITECTURE.md)   |
| 安全加固         | [EXTERNAL-NGINX.md# 安全加固](./EXTERNAL-NGINX.md) |

## 🔍 常见问题快速查找

| 问题                | 解决方案                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| 502 Bad Gateway     | [ARCHITECTURE.md - 问题 1](./ARCHITECTURE.md#问题-1-502-bad-gateway)     |
| NextAuth 重定向错误 | [ARCHITECTURE.md - 问题 2](./ARCHITECTURE.md#问题-2-nextauth-重定向错误) |
| WebSocket 失败      | [ARCHITECTURE.md - 问题 3](./ARCHITECTURE.md#问题-3-websocket-连接失败)  |
| 文件上传失败        | [ARCHITECTURE.md - 问题 4](./ARCHITECTURE.md#问题-4-文件上传失败)        |

## ⚠️ 重要注意事项

### 必须配置

1. **X-Forwarded-Proto** (外部 Nginx)

   ```nginx
   proxy_set_header X-Forwarded-Proto $scheme;
   ```

   缺少会导致 HTTPS 重定向错误！

2. **NodePort 31080** (K8s)

   ```bash
   kubectl get svc -n ingress-nginx | grep 31080
   ```

   必须匹配外部 Nginx 的 proxy_pass 端口

3. **环境变量**
   ```bash
   NEXT_PUBLIC_BASE_URL=https://chat.omniverseai.net
   NEXTAUTH_URL=https://chat.omniverseai.net
   ```
   必须使用公网域名

### 不要提交到 Git

- `k8s/.env.k8s` - 包含敏感信息
- `k8s/secret.yaml` - 由脚本生成，包含密钥
- `k8s/*.secret.yaml` - 任何包含 secret 的文件

已在 `.gitignore` 中配置

## 🎯 推荐阅读顺序

### 第一次部署

1. [DEPLOY-TO-EXISTING.md](./DEPLOY-TO-EXISTING.md) - 快速部署
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - 理解架构
3. [EXTERNAL-NGINX.md](./EXTERNAL-NGINX.md) - Nginx 配置

### 遇到问题

1. [ARCHITECTURE.md - 故障排查](./ARCHITECTURE.md#故障排查)
2. 检查日志（文档中有详细说明）
3. [README.md](./README.md) - 查看完整文档

### 深入了解

1. [ARCHITECTURE.md](./ARCHITECTURE.md) - 完整架构
2. [README.md](./README.md) - 高级配置
3. [EXTERNAL-NGINX.md](./EXTERNAL-NGINX.md) - Nginx 优化

## 📞 获取帮助

1. 查看对应文档的故障排查部分
2. 检查日志: `kubectl logs -n chat -l app=lobechat`
3. 查看事件: `kubectl get events -n chat`
4. 验证配置: `kubectl describe ingress -n chat`

## 🔄 版本信息

- Kubernetes: 1.20+
- Nginx Ingress Controller: v1.8+
- LobeChat: Latest
- Node.js: 24 (in Docker)

---

**快速链接**:

- 🚀 [立即开始部署](./DEPLOY-TO-EXISTING.md)
- 📖 [查看架构](./ARCHITECTURE.md)
- 🔧 [配置 Nginx](./EXTERNAL-NGINX.md)
- 📚 [完整文档](./README.md)
