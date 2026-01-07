# 🚀 部署到现有架构 - 快速指南

适用于已有外部 Nginx (85.239.233.16) + K8s 集群的场景

## 📋 前提条件

✅ 外部 Nginx 服务器: 85.239.233.16
✅ K8s 节点: 10.7.0.2
✅ 域名: \*.omniverseai.net 已指向 85.239.233.16
✅ Nginx 反向代理: proxy_pass <http://10.7.0.2:31080>

## ⚡ 3 步快速部署

### 步骤 1: 配置 K8s Ingress Controller (5 分钟)

```bash
# 1. 检查 ingress controller 是否已安装
kubectl get svc -n ingress-nginx

# 2. 配置 NodePort 31080 (使用提供的配置文件)
kubectl apply -f k8s/ingress-nodeport.yaml

# 或者手动 patch 现有服务
kubectl patch svc ingress-nginx-controller -n ingress-nginx \
  -p '{"spec":{"type":"NodePort","ports":[{"port":80,"nodePort":31080,"name":"http"}]}}'

# 3. 验证配置
kubectl get svc -n ingress-nginx | grep 31080
# 应该看到: 80:31080/TCP

# 4. 测试端口
curl http://10.7.0.2:31080
# 应该返回 404 (表示 ingress 正在工作，只是还没有路由规则)
```

### 步骤 2: 部署 LobeChat 到 K8s (10 分钟)

```bash
# 1. 构建 Docker 镜像
export DOCKER_REGISTRY="your-registry.com"
export IMAGE_TAG="v1.0.0"
./k8s/build.sh

# 2. 配置环境变量
cp k8s/.env.template k8s/.env.k8s

# 生成密钥
openssl rand -base64 32 # 用于 KEY_VAULTS_SECRET
openssl rand -base64 32 # 用于 NEXTAUTH_SECRET

# 编辑配置文件，填入必要的值
vim k8s/.env.k8s

# 3. 生成 Secret
./k8s/generate-secret.sh

# 4. 更新 deployment.yaml 中的镜像地址
vim k8s/deployment.yaml
# 修改: image: your-registry.com/lobechat:v1.0.0

# 5. 部署到 K8s
./k8s/deploy.sh

# 6. 验证部署
kubectl get pods -n chat
kubectl get ingress -n chat

# 7. 测试 ingress 路由
curl -H "Host: chat.omniverseai.net" http://10.7.0.2:31080
# 应该返回 LobeChat 的 HTML
```

### 步骤 3: 配置外部 Nginx (5 分钟)

**重要**: 外部 Nginx 需要正确转发 headers!

```bash
# 1. SSH 到外部服务器
ssh user@85.239.233.16

# 2. 编辑 nginx 配置
sudo vim /etc/nginx/sites-available/omniverseai.net.conf
```

**添加或更新以下配置**:

```nginx
upstream k8s_chat {
    server 10.7.0.2:31080;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name omniverseai.net *.omniverseai.net;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 文件上传限制
    client_max_body_size 100m;

    # 超时设置
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;

    # WebSocket 支持
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # ⚠️ 重要: 必须转发这些 headers!
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;  # 这个很重要!
    proxy_set_header X-Forwarded-Host $host;

    # 禁用缓冲 (提高上传性能)
    proxy_buffering off;
    proxy_request_buffering off;

    location / {
        proxy_pass http://k8s_chat;
    }
}
```

**测试并重载**:

```bash
# 3. 测试配置
sudo nginx -t

# 4. 重载配置
sudo nginx -s reload

# 5. 验证
curl -v https://chat.omniverseai.net
```

## ✅ 验证部署

### 1. 检查各层状态

```bash
# K8s Pods
kubectl get pods -n chat
# 应该显示: Running

# K8s Service
kubectl get svc -n chat
# 应该有 lobechat-service

# K8s Ingress
kubectl get ingress -n chat
# 应该显示 chat.omniverseai.net

# Ingress Controller
kubectl get svc -n ingress-nginx
# 应该显示 31080 NodePort
```

### 2. 测试连通性

```bash
# 从 K8s 节点测试
curl -H "Host: chat.omniverseai.net" http://localhost:31080

# 从外部 Nginx 服务器测试
curl -H "Host: chat.omniverseai.net" http://10.7.0.2:31080

# 从任何地方测试最终访问
curl -v https://chat.omniverseai.net
```

### 3. 检查日志

```bash
# LobeChat 应用日志
kubectl logs -n chat -l app=lobechat -f

# Ingress Controller 日志
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx -f

# 外部 Nginx 日志
ssh user@85.239.233.16 "tail -f /var/log/nginx/access.log"
```

## 🔧 必须配置项检查清单

### K8s 层

- [ ] Ingress Controller 监听 NodePort 31080
- [ ] LobeChat Deployment 已部署到 chat namespace
- [ ] Service 类型为 ClusterIP
- [ ] Ingress 配置了 `chat.omniverseai.net`
- [ ] Ingress 不配置 TLS (由外部 Nginx 处理)
- [ ] Ingress 配置了 `use-forwarded-headers: "true"`
- [ ] ConfigMap 中 URL 为 `https://chat.omniverseai.net`

### 外部 Nginx 层

- [ ] 监听 443 端口 (HTTPS)
- [ ] SSL 证书已配置
- [ ] proxy_pass 指向 `http://10.7.0.2:31080`
- [ ] **X-Forwarded-Proto** 设置为 `$scheme` ⚠️ 重要！
- [ ] **X-Forwarded-For** 设置为 `$proxy_add_x_forwarded_for`
- [ ] **Host** header 正确转发
- [ ] WebSocket headers (Upgrade, Connection) 已配置
- [ ] client_max_body_size 至少 100m
- [ ] 超时时间至少 600s

## 🐛 常见问题速查

### 问题: 502 Bad Gateway

```bash
# 检查 K8s ingress controller
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx | grep 31080

# 从外部 nginx 测试连通性
telnet 10.7.0.2 31080
```

### 问题：登录后重定向错误 (http instead of https)

**原因**: X-Forwarded-Proto 未设置

**解决**: 在外部 Nginx 添加:

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

### 问题: WebSocket 连接失败

**解决**: 在外部 Nginx 添加:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### 问题：文件上传失败

**解决**: 增加上传限制:

```nginx
# 外部 Nginx
client_max_body_size 100m;

# K8s Ingress (已在配置中)
nginx.ingress.kubernetes.io/proxy-body-size: "100m"
```

## 📊 架构流程图

```
User Browser
    ↓ HTTPS
    ↓ chat.omniverseai.net
    ↓
85.239.233.16 (External Nginx)
    ↓ SSL Termination
    ↓ HTTP + X-Forwarded-* headers
    ↓
10.7.0.2:31080 (K8s Ingress NodePort)
    ↓ Route by Host header
    ↓
chat namespace → lobechat-service → pods
```

## 📚 详细文档

- **架构说明**: `k8s/ARCHITECTURE.md`
- **外部 Nginx 配置**: `k8s/EXTERNAL-NGINX.md`
- **完整部署文档**: `k8s/README.md`

## 🎯 下一步

部署成功后:

1. ✅ 访问 <https://chat.omniverseai.net>
2. ✅ 创建管理员账号
3. ✅ 配置 AI 模型
4. ✅ 测试文件上传
5. ✅ 配置监控和日志

## 💡 关键配置对比

| 配置项     | 标准部署               | 当前架构        |
| ---------- | ---------------------- | --------------- |
| TLS 终止   | Ingress (cert-manager) | 外部 Nginx      |
| 外部访问   | LoadBalancer           | NodePort 31080  |
| SSL 重定向 | Ingress 层             | 外部 Nginx 层   |
| Headers    | Ingress 添加           | 外部 Nginx 添加 |

---

**重要提示**:

- X-Forwarded-Proto 是最关键的配置，缺少会导致 HTTPS 重定向问题
- 确保外部 Nginx 和 K8s Ingress 都支持 WebSocket
- 文件上传限制需要在两层都配置
