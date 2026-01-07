# LobeChat Kubernetes 部署指南

本指南将帮助你将 LobeChat 部署到 Kubernetes 集群，并通过 `https://chat.omniverseai.net` 访问。

## 📋 前置要求

### 1. 基础设施

- Kubernetes 集群 (v1.20+)
- `kubectl` 命令行工具
- Nginx Ingress Controller
- cert-manager (用于自动 TLS 证书管理)
- PostgreSQL 数据库 (带 pgvector 扩展)
- S3 兼容的对象存储 (如 MinIO)

### 2. DNS 配置

确保域名 `chat.omniverseai.net` 已经指向你的 Kubernetes Ingress Controller 的外部 IP。

```bash
# 检查 DNS 解析
nslookup chat.omniverseai.net
```

### 3. 所需工具

- Docker (用于构建镜像)
- openssl (用于生成密钥)

## 🚀 快速部署

### 步骤 1: 构建并推送 Docker 镜像

```bash
# 设置你的 Docker Registry
export DOCKER_REGISTRY="your-registry.com"
export IMAGE_TAG="v1.0.0"

# 构建并推送镜像
./k8s/build.sh
```

或者手动构建:

```bash
docker build -t your-registry.com/lobechat:latest .
docker push your-registry.com/lobechat:latest

# 更新 k8s/deployment.yaml 中的镜像地址
```

### 步骤 2: 配置环境变量和密钥

1. 复制环境变量模板:

```bash
cp k8s/.env.template k8s/.env.k8s
```

2. 编辑 `k8s/.env.k8s` 并填入实际值:

```bash
# 生成密钥
openssl rand -base64 32 # 用于 KEY_VAULTS_SECRET
openssl rand -base64 32 # 用于 NEXTAUTH_SECRET

# 编辑配置文件
vim k8s/.env.k8s
```

必填项:

- `DATABASE_URL`: PostgreSQL 连接字符串
- `KEY_VAULTS_SECRET`: 数据库加密密钥
- `NEXTAUTH_SECRET`: NextAuth 密钥
- `S3_ACCESS_KEY_ID`: S3 访问密钥
- `S3_SECRET_ACCESS_KEY`: S3 秘密密钥
- `S3_ENDPOINT`: S3 端点 (内部)
- `S3_PUBLIC_DOMAIN`: S3 公共访问域名

3. 生成 Kubernetes Secret:

```bash
./k8s/generate-secret.sh
```

### 步骤 3: 检查并更新配置

1. 检查 `k8s/configmap.yaml`:
   - 验证 `OLLAMA_PROXY_URL` 指向正确的 Ollama 服务
   - 确认公共 URL 配置正确

2. 检查 `k8s/ingress.yaml`:
   - 验证域名 `chat.omniverseai.net`
   - 确认 cert-manager issuer 名称正确 (默认: `letsencrypt-prod`)

3. 检查 `k8s/deployment.yaml`:
   - 验证镜像地址
   - 根据需要调整资源配置 (CPU / 内存)
   - 调整副本数量 (默认: 2)

### 步骤 4: 部署到 Kubernetes

```bash
# 一键部署
./k8s/deploy.sh
```

或者手动部署:

```bash
# 应用所有配置
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# 或使用 kustomize
kubectl apply -k k8s/
```

### 步骤 5: 验证部署

```bash
# 查看 Pod 状态
kubectl get pods -n chat

# 查看 Service
kubectl get svc -n chat

# 查看 Ingress
kubectl get ingress -n chat

# 查看 Pod 日志
kubectl logs -n chat -l app=lobechat -f

# 检查 TLS 证书
kubectl get certificate -n chat
```

## 📦 配置详解

### ConfigMap (非敏感配置)

`k8s/configmap.yaml` 包含应用的非敏感配置:

- Node 环境配置
- 数据库驱动类型
- Ollama 服务地址
- 认证设置
- 公共 URL

### Secret (敏感信息)

`k8s/secret.yaml` 包含敏感信息:

- 数据库连接字符串
- 加密密钥
- S3 凭证
- API 密钥

**⚠️ 重要**: 不要将 `k8s/secret.yaml` 提交到 Git!

### Deployment

- **副本数**: 默认 2 个副本，提供高可用
- **资源限制**:
  - Requests: 512Mi 内存，250m CPU
  - Limits: 2Gi 内存，1000m CPU
- **健康检查**: 配置了 liveness 和 readiness 探针
- **反亲和性**: 尽量将 Pod 分散到不同节点

### Service

- **类型**: ClusterIP (集群内部访问)
- **端口**: 80 -> 3210
- **会话保持**: 启用 ClientIP 会话保持 (3 小时)

### Ingress

- **域名**: chat.omniverseai.net
- **TLS**: 由 cert-manager 自动管理
- **特性**:
  - 强制 HTTPS 重定向
  - WebSocket 支持
  - 文件上传限制: 100MB
  - 代理超时: 600 秒

## 🔧 高级配置

### 自定义域名

编辑 `k8s/ingress.yaml`:

```yaml
spec:
  tls:
    - hosts:
        - your-domain.com
  rules:
    - host: your-domain.com
```

同时更新 `k8s/configmap.yaml` 中的 URL:

```yaml
data:
  NEXT_PUBLIC_BASE_URL: 'https://your-domain.com'
  NEXTAUTH_URL: 'https://your-domain.com'
```

### 调整资源配置

根据实际负载调整资源:

```yaml
# k8s/deployment.yaml
resources:
  requests:
    memory: '1Gi'
    cpu: '500m'
  limits:
    memory: '4Gi'
    cpu: '2000m'
```

### 配置持久化存储

如果需要持久化数据:

```yaml
# 添加 PersistentVolumeClaim
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: lobechat-data
  namespace: chat
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

### 水平自动扩展

创建 HPA 配置:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: lobechat-hpa
  namespace: chat
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: lobechat
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## 🔍 故障排查

### 1. Pod 无法启动

```bash
# 查看 Pod 状态
kubectl describe pod -n chat <pod-name>

# 查看日志
kubectl logs -n chat <pod-name>

# 检查事件
kubectl get events -n chat --sort-by='.lastTimestamp'
```

常见问题:

- 镜像拉取失败：检查 imagePullSecrets 配置
- 环境变量错误：检查 ConfigMap 和 Secret
- 数据库连接失败：验证 DATABASE_URL

### 2. Ingress 无法访问

```bash
# 检查 Ingress 状态
kubectl describe ingress -n chat lobechat-ingress

# 查看 Ingress Controller 日志
kubectl logs -n ingress-nginx <controller-pod>

# 检查证书状态
kubectl describe certificate -n chat lobechat-tls
```

常见问题:

- DNS 未解析：检查域名 DNS 配置
- 证书未就绪：等待 cert-manager 签发证书
- 后端服务不可用：检查 Service 和 Pod 状态

### 3. 数据库连接问题

```bash
# 进入 Pod 测试连接
kubectl exec -it -n chat sh < pod-name > --

# 测试数据库连接 (如果有 psql)
# psql $DATABASE_URL
```

### 4. 查看完整日志

```bash
# 实时查看所有 Pod 日志
kubectl logs -n chat -l app=lobechat -f --tail=100

# 查看特定 Pod 的日志
kubectl logs -n chat < pod-name > --previous
```

## 🔄 更新部署

### 滚动更新

```bash
# 构建新镜像
export IMAGE_TAG="v1.1.0"
./k8s/build.sh

# 更新部署
kubectl set image deployment/lobechat \
  lobechat=your-registry.com/lobechat:v1.1.0 \
  -n chat

# 查看滚动更新状态
kubectl rollout status deployment/lobechat -n chat
```

### 回滚

```bash
# 查看部署历史
kubectl rollout history deployment/lobechat -n chat

# 回滚到上一个版本
kubectl rollout undo deployment/lobechat -n chat

# 回滚到特定版本
kubectl rollout undo deployment/lobechat -n chat --to-revision=2
```

### 更新配置

```bash
# 更新 ConfigMap
kubectl apply -f k8s/configmap.yaml

# 更新 Secret
./k8s/generate-secret.sh
kubectl apply -f k8s/secret.yaml

# 重启 Pod 使配置生效
kubectl rollout restart deployment/lobechat -n chat
```

## 📊 监控和日志

### 查看资源使用

```bash
# 查看 Pod 资源使用
kubectl top pods -n chat

# 查看节点资源使用
kubectl top nodes
```

### 集成 Prometheus (可选)

添加 ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: lobechat
  namespace: chat
spec:
  selector:
    matchLabels:
      app: lobechat
  endpoints:
    - port: http
      interval: 30s
```

## 🗑️ 清理部署

```bash
# 删除所有资源
kubectl delete -k k8s/

# 或逐个删除
kubectl delete -f k8s/ingress.yaml
kubectl delete -f k8s/service.yaml
kubectl delete -f k8s/deployment.yaml
kubectl delete -f k8s/secret.yaml
kubectl delete -f k8s/configmap.yaml
kubectl delete -f k8s/namespace.yaml
```

## 📁 文件结构

```
k8s/
├── .env.template          # 环境变量模板
├── .env.k8s              # 实际环境变量 (不提交到 Git)
├── namespace.yaml         # Namespace 定义
├── configmap.yaml         # 非敏感配置
├── secret.yaml           # 敏感信息 (由脚本生成)
├── deployment.yaml        # Deployment 配置
├── service.yaml          # Service 配置
├── ingress.yaml          # Ingress 配置
├── kustomization.yaml    # Kustomize 配置
├── generate-secret.sh    # Secret 生成脚本
├── build.sh              # 镜像构建脚本
├── deploy.sh             # 部署脚本
└── README.md             # 本文档
```

## 🔐 安全建议

1. **不要提交敏感信息到 Git**:

   ```bash
   # 添加到 .gitignore
   k8s/.env.k8s
   k8s/secret.yaml
   ```

2. **使用 RBAC 限制访问**:
   - 为应用创建专用 ServiceAccount
   - 配置最小权限原则

3. **启用 Network Policies**:
   - 限制 Pod 间通信
   - 只允许必要的入站 / 出站流量

4. **定期更新镜像**:
   - 使用特定版本标签而非 `latest`
   - 定期扫描镜像漏洞

5. **保护 Secret**:
   - 考虑使用外部密钥管理系统 (如 HashiCorp Vault)
   - 启用 Kubernetes Secret 加密

## 🆘 获取帮助

如果遇到问题:

1. 查看本文档的故障排查部分
2. 检查 Pod 日志: `kubectl logs -n chat -l app=lobechat`
3. 检查事件: `kubectl get events -n chat`
4. 访问项目 GitHub Issues

## 📚 相关文档

- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [Nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager 文档](https://cert-manager.io/docs/)
- [LobeChat 官方文档](https://github.com/lobehub/lobe-chat)
