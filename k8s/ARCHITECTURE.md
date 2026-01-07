# LobeChat K8s 部署架构说明

## 🏗️ 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet (Clients)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           │ chat.omniverseai.net
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│           External Nginx Server (85.239.233.16)                 │
│                                                                   │
│  • SSL/TLS Termination                                          │
│  • Domain: *.omniverseai.net                                    │
│  • Certificate Management                                       │
│  • DDoS Protection / Rate Limiting                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (decrypted)
                           │ proxy_pass http://10.7.0.2:31080
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│        Kubernetes Cluster - Ingress Controller                  │
│                    (NodePort 31080)                              │
│                                                                   │
│  • Receives traffic from external nginx                         │
│  • Routes by Host header (chat.omniverseai.net)                │
│  • No TLS (already decrypted)                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Route to chat namespace
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               Namespace: chat                                    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Service: lobechat-service (ClusterIP)                  │   │
│  │  Port: 80 → 3210                                        │   │
│  └────────────────────┬────────────────────────────────────┘   │
│                       │                                          │
│           ┌───────────┼───────────┐                             │
│           ▼           ▼           ▼                             │
│      ┌────────┐  ┌────────┐  ┌────────┐                        │
│      │ Pod 1  │  │ Pod 2  │  │ Pod N  │                        │
│      │ :3210  │  │ :3210  │  │ :3210  │                        │
│      └────────┘  └────────┘  └────────┘                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
           │                              │
           │ PostgreSQL                   │ S3/MinIO
           ▼                              ▼
    ┌──────────────┐              ┌──────────────┐
    │   Database   │              │    Storage   │
    │  (PGVector)  │              │   (Files)    │
    └──────────────┘              └──────────────┘
```

## 📊 流量路径

### 1. 用户访问流程

```
User Browser
    ↓ DNS Lookup: chat.omniverseai.net → 85.239.233.16
    ↓
    ↓ HTTPS Request (TLS encrypted)
    ↓
External Nginx (85.239.233.16)
    ↓ SSL Termination (decrypt)
    ↓ Add X-Forwarded-* headers
    ↓ HTTP Request
    ↓
K8s Ingress Controller (10.7.0.2:31080)
    ↓ Check Host header: chat.omniverseai.net
    ↓ Route to chat namespace
    ↓
Service: lobechat-service
    ↓ Load balance across pods
    ↓
LobeChat Pod
    ↓ Process request
    ↓ Return response
    ↓
(Response follows reverse path)
```

### 2. Header 传递链

```
Client → External Nginx → K8s Ingress → App

Original Headers:
  Host: chat.omniverseai.net
  User-Agent: Mozilla/5.0...

External Nginx adds:
  X-Real-IP: <client-ip>
  X-Forwarded-For: <client-ip>
  X-Forwarded-Proto: https
  X-Forwarded-Host: chat.omniverseai.net

K8s Ingress preserves these headers and forwards to app
```

## 🔧 关键组件配置

### External Nginx (85.239.233.16)

**职责**:

- SSL/TLS 终止
- 域名路由
- 安全防护 (DDoS, Rate Limiting)
- 请求转发到 K8s

**配置要点**:

```nginx
server {
    listen 443 ssl http2;
    server_name omniverseai.net *.omniverseai.net;

    # SSL certs
    ssl_certificate /path/to/cert;
    ssl_certificate_key /path/to/key;

    # Forward headers (IMPORTANT!)
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Proxy to K8s
    proxy_pass http://10.7.0.2:31080;
}
```

### K8s Ingress Controller

**职责**:

- 接收来自外部 Nginx 的流量
- 基于 Host header 路由到不同 namespace
- 不处理 SSL (已由外部 Nginx 处理)

**配置要点**:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  type: NodePort
  ports:
    - port: 80
      nodePort: 31080 # 固定端口，匹配外部 nginx 配置
```

### Chat Namespace Ingress

**职责**:

- 定义 chat.omniverseai.net 的路由规则
- 信任并转发 X-Forwarded-\* headers

**配置要点**:

```yaml
annotations:
  nginx.ingress.kubernetes.io/ssl-redirect: 'false' # 不重定向，已是 HTTPS
  nginx.ingress.kubernetes.io/use-forwarded-headers: 'true' # 信任转发的 headers
```

### LobeChat Application

**配置要点**:

```yaml
env:
  - name: NEXT_PUBLIC_BASE_URL
    value: 'https://chat.omniverseai.net' # 使用公网域名
  - name: NEXTAUTH_URL
    value: 'https://chat.omniverseai.net' # NextAuth 回调 URL
  - name: AUTH_TRUST_HOST
    value: 'true' # 信任 X-Forwarded-Host
```

## 🚀 部署流程

### Phase 1: 准备 K8s Ingress Controller

1. **检查 Ingress Controller 是否已安装**:

```bash
kubectl get svc -n ingress-nginx
```

2. **如果未安装，安装 nginx ingress controller**:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

3. **配置 NodePort 31080**:

```bash
# 方法 1: 使用提供的配置文件
kubectl apply -f k8s/ingress-nodeport.yaml

# 方法 2: 手动 patch 现有服务
kubectl patch svc ingress-nginx-controller -n ingress-nginx -p '{"spec":{"type":"NodePort","ports":[{"port":80,"targetPort":80,"protocol":"TCP","nodePort":31080,"name":"http"}]}}'
```

4. **验证 NodePort**:

```bash
kubectl get svc -n ingress-nginx
# 应该显示 80:31080/TCP

# 测试端口
curl http://10.7.0.2:31080
```

### Phase 2: 部署 LobeChat

1. **构建镜像**:

```bash
export DOCKER_REGISTRY="your-registry.com"
./k8s/build.sh
```

2. **配置环境变量**:

```bash
cp k8s/.env.template k8s/.env.k8s
vim k8s/.env.k8s
./k8s/generate-secret.sh
```

3. **部署应用**:

```bash
./k8s/deploy.sh
```

4. **验证部署**:

```bash
kubectl get pods -n chat
kubectl get svc -n chat
kubectl get ingress -n chat

# 测试从 K8s 节点访问
curl -H "Host: chat.omniverseai.net" http://localhost:31080
```

### Phase 3: 配置外部 Nginx

1. **SSH 到外部服务器**:

```bash
ssh user@85.239.233.16
```

2. **配置 Nginx**:
   参考 `k8s/EXTERNAL-NGINX.md` 中的完整配置

3. **测试并重载**:

```bash
sudo nginx -t
sudo nginx -s reload
```

4. **验证**:

```bash
curl -v https://chat.omniverseai.net
```

## 🔍 故障排查

### 问题 1: 502 Bad Gateway

**症状**: 访问 chat.omniverseai.net 返回 502

**排查步骤**:

1. **检查外部 Nginx 到 K8s 的连通性**:

```bash
# 在 85.239.233.16 上
curl http://10.7.0.2:31080
telnet 10.7.0.2 31080
```

2. **检查 K8s Ingress Controller**:

```bash
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx <ingress-controller-pod>
```

3. **检查 LobeChat Pods**:

```bash
kubectl get pods -n chat
kubectl logs -n chat <lobechat-pod>
```

### 问题 2: NextAuth 重定向错误

**症状**: 登录后重定向到错误的 URL (如 http 而非 https)

**原因**: X-Forwarded-Proto header 未正确传递

**解决**:

1. **检查外部 Nginx 配置**:

```nginx
proxy_set_header X-Forwarded-Proto $scheme;  # 必须是 https
```

2. **检查应用环境变量**:

```bash
kubectl exec -n chat env < pod > -- | grep NEXTAUTH_URL
# 应该是 https://chat.omniverseai.net
```

3. **检查 Ingress annotations**:

```yaml
nginx.ingress.kubernetes.io/use-forwarded-headers: 'true'
```

### 问题 3: WebSocket 连接失败

**症状**: 实时功能不工作，浏览器控制台显示 WebSocket 错误

**解决**:

1. **检查外部 Nginx WebSocket 配置**:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

2. **检查 Ingress WebSocket 支持**:

```yaml
nginx.ingress.kubernetes.io/websocket-services: 'lobechat-service'
```

### 问题 4: 文件上传失败

**症状**: 上传大文件时超时或失败

**解决**:

1. **检查外部 Nginx 上传限制**:

```nginx
client_max_body_size 100m;
```

2. **检查超时设置**:

```nginx
proxy_read_timeout 600s;
```

3. **检查 Ingress 配置**:

```yaml
nginx.ingress.kubernetes.io/proxy-body-size: '100m'
```

## 📊 监控和日志

### 查看外部 Nginx 日志

```bash
ssh user@85.239.233.16
tail -f /var/log/nginx/omniverseai.net-access.log
tail -f /var/log/nginx/omniverseai.net-error.log
```

### 查看 Ingress Controller 日志

```bash
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx -f
```

### 查看 LobeChat 日志

```bash
kubectl logs -n chat -l app=lobechat -f
```

### 追踪完整请求链

```bash
# 1. 检查外部 Nginx 是否收到请求
ssh user@85.239.233.16 "tail -n 50 /var/log/nginx/omniverseai.net-access.log"

# 2. 检查 Ingress Controller 是否收到请求
kubectl logs -n ingress-nginx < controller-pod > --tail=50

# 3. 检查应用是否收到请求
kubectl logs -n chat -l app=lobechat --tail=50
```

## 🔐 安全考虑

### 1. Network Policies

限制 chat namespace 的网络访问:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: lobechat-network-policy
  namespace: chat
spec:
  podSelector:
    matchLabels:
      app: lobechat
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
  egress:
    - to:
        - podSelector: {} # Same namespace
    - to:
        - namespaceSelector: {} # Database, etc
```

### 2. 外部 Nginx 防护

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=chat_limit:10m rate=10r/s;
limit_req zone=chat_limit burst=20;

# IP 黑名单
deny 1.2.3.4;

# 只允许特定方法
if ($request_method !~ ^(GET|POST|PUT|DELETE|HEAD|OPTIONS)$ ) {
    return 444;
}
```

### 3. 定期更新

- [ ] 定期更新 SSL 证书
- [ ] 定期更新 Kubernetes 版本
- [ ] 定期更新 LobeChat 镜像
- [ ] 监控安全漏洞

## 📚 相关文档

- [外部 Nginx 配置详解](./EXTERNAL-NGINX.md)
- [快速部署指南](./QUICKSTART.md)
- [完整部署文档](./README.md)
- [Ingress Controller 说明](./ingress-nodeport.yaml)

## 🆘 联系支持

如遇到问题，请按以下顺序检查:

1. 查看本文档的故障排查部分
2. 检查各层日志 (Nginx → Ingress → App)
3. 验证网络连通性
4. 检查配置文件语法
5. 查看 K8s 事件: `kubectl get events -n chat`
