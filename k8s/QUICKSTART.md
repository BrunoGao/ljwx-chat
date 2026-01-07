# 🚀 快速部署到 Kubernetes

本指南帮助你快速将 LobeChat 部署到 Kubernetes 的 chat namespace，并通过 <https://chat.omniverseai.net> 访问。

## 📋 准备工作检查清单

- [ ] Kubernetes 集群已就绪
- [ ] kubectl 已安装并配置
- [ ] Docker 已安装 (用于构建镜像)
- [ ] Nginx Ingress Controller 已部署
- [ ] cert-manager 已部署 (用于 TLS 证书)
- [ ] PostgreSQL 数据库已准备就绪
- [ ] S3/MinIO 存储已配置
- [ ] 域名 chat.omniverseai.net 已指向 Ingress IP

## ⚡ 快速部署 (5 分钟)

### 1️⃣ 构建 Docker 镜像

```bash
# 设置你的 Docker Registry
export DOCKER_REGISTRY="your-registry.com"
export IMAGE_TAG="v1.0.0"

# 构建并推送
./k8s/build.sh
```

### 2️⃣ 配置环境变量

```bash
# 复制模板
cp k8s/.env.template k8s/.env.k8s

# 生成密钥
echo "KEY_VAULTS_SECRET=$(openssl rand -base64 32)"
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"

# 编辑配置 (填入上面生成的密钥和其他配置)
vim k8s/.env.k8s
```

**必填配置项**:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
KEY_VAULTS_SECRET=<刚生成的密钥>
NEXTAUTH_SECRET=<刚生成的密钥>
S3_ENDPOINT=http://minio-service:9000
S3_PUBLIC_DOMAIN=https://s3.omniverseai.net
S3_ACCESS_KEY_ID=<你的 Access Key>
S3_SECRET_ACCESS_KEY=<你的 Secret Key>
```

### 3️⃣ 生成 Secret

```bash
./k8s/generate-secret.sh
```

### 4️⃣ 更新部署配置

编辑 `k8s/deployment.yaml`，更新镜像地址:

```yaml
image: your-registry.com/lobechat:v1.0.0
```

### 5️⃣ 部署到 Kubernetes

```bash
# 一键部署
./k8s/deploy.sh

# 或手动部署
kubectl apply -k k8s/
```

### 6️⃣ 验证部署

```bash
# 查看 Pod 状态 (应该显示 Running)
kubectl get pods -n chat

# 查看服务
kubectl get svc,ingress -n chat

# 查看日志
kubectl logs -n chat -l app=lobechat -f
```

### 7️⃣ 访问应用

打开浏览器访问: <https://chat.omniverseai.net>

## 🔍 常见问题

### Pod 启动失败？

```bash
kubectl describe pod -n chat <pod-name>
kubectl logs -n chat <pod-name>
```

### 证书未签发？

```bash
# 检查证书状态
kubectl describe certificate -n chat lobechat-tls

# 查看 cert-manager 日志
kubectl logs -n cert-manager <cert-manager-pod>
```

### 无法访问应用？

1. 检查 DNS: `nslookup chat.omniverseai.net`
2. 检查 Ingress: `kubectl get ingress -n chat`
3. 检查证书: `kubectl get certificate -n chat`
4. 检查 Pod: `kubectl get pods -n chat`

### 数据库连接失败？

1. 验证 DATABASE_URL 格式正确
2. 确保数据库可从集群内访问
3. 检查数据库凭证是否正确

## 📊 查看状态

```bash
# 完整状态概览
kubectl get all -n chat

# 实时日志
kubectl logs -n chat -l app=lobechat -f --tail=50

# 资源使用
kubectl top pods -n chat
```

## 🔄 更新部署

```bash
# 构建新版本
export IMAGE_TAG="v1.1.0"
./k8s/build.sh

# 更新部署
kubectl set image deployment/lobechat \
  lobechat=your-registry.com/lobechat:v1.1.0 \
  -n chat

# 查看更新状态
kubectl rollout status deployment/lobechat -n chat
```

## 🗑️ 清理部署

```bash
# 删除所有资源 (保留 namespace)
kubectl delete deployment,service,ingress,configmap,secret -n chat --all

# 删除 namespace
kubectl delete namespace chat
```

## 📚 详细文档

查看完整文档: [k8s/README.md](./README.md)

## 🆘 需要帮助？

1. 查看详细文档: `k8s/README.md`
2. 查看 Pod 日志
3. 检查 Kubernetes 事件
4. 访问项目 Issues

---

**⚠️ 安全提示**:

- 不要将 `k8s/.env.k8s` 和 `k8s/secret.yaml` 提交到 Git
- 定期更新密钥和凭证
- 使用强密码
- 启用 HTTPS (已在 Ingress 中配置)
