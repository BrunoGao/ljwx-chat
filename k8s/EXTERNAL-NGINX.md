# 外部 Nginx 配置说明

## 架构概述

```
Internet (Client)
    ↓ HTTPS
85.239.233.16 (External Nginx with SSL)
    ↓ HTTP (decrypted)
10.7.0.2:31080 (K8s Ingress Controller NodePort)
    ↓ HTTP
chat namespace (lobechat-service)
    ↓ HTTP
lobechat pods
```

## 外部 Nginx 配置 (85.239.233.16)

### 完整配置示例

在你的 nginx 配置中添加或更新：

```nginx
# chat.omniverseai.net upstream
upstream k8s_chat {
    # K8s node with ingress controller
    server 10.7.0.2:31080;

    # If you have multiple K8s nodes, add them here for load balancing
    # server 10.7.0.3:31080;
    # server 10.7.0.4:31080;

    # Health check settings
    keepalive 32;
    keepalive_timeout 60s;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name omniverseai.net *.omniverseai.net;

    # Force HTTPS
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name omniverseai.net *.omniverseai.net;

    # SSL Configuration
    ssl_certificate /path/to/omniverseai.net/fullchain.pem;
    ssl_certificate_key /path/to/omniverseai.net/privkey.pem;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Logging
    access_log /var/log/nginx/omniverseai.net-access.log;
    error_log /var/log/nginx/omniverseai.net-error.log;

    # Client upload size (match ingress settings)
    client_max_body_size 100m;

    # Proxy timeouts (match ingress settings)
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    send_timeout 600s;

    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Important: Forward original client information
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;

    # Proxy buffering settings
    proxy_buffering off;
    proxy_request_buffering off;

    # Proxy pass to K8s ingress
    location / {
        proxy_pass http://k8s_chat;

        # Additional headers for better debugging
        add_header X-Upstream-Server $upstream_addr always;
    }

    # Health check endpoint (optional)
    location /healthz {
        proxy_pass http://k8s_chat/healthz;
        access_log off;
    }
}
```

### 关键配置说明

#### 1. \*_X-Forwarded-_ Headers\*\* (重要！)

这些 header 让后端应用知道原始请求信息：

```nginx
proxy_set_header X-Real-IP $remote_addr;           # 客户端真实 IP
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  # 代理链
proxy_set_header X-Forwarded-Proto $scheme;        # 原始协议 (https)
proxy_set_header X-Forwarded-Host $host;           # 原始域名
```

**为什么重要？**

- NextAuth 需要知道原始协议 (https) 来生成正确的回调 URL
- 应用需要客户端真实 IP 用于日志和安全
- Session cookies 需要正确的域名

#### 2. **WebSocket 支持**

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

这对于实时聊天功能很重要。

#### 3. **文件上传**

```nginx
client_max_body_size 100m;
proxy_buffering off;
proxy_request_buffering off;
```

允许上传大文件，并禁用缓冲以提高上传性能。

#### 4. **超时设置**

```nginx
proxy_connect_timeout 600s;
proxy_send_timeout 600s;
proxy_read_timeout 600s;
```

AI 响应可能需要较长时间，所以超时设置要足够大。

## 验证配置

### 1. 测试 Nginx 配置

```bash
# SSH 到 85.239.233.16
sudo nginx -t
sudo nginx -s reload
```

### 2. 检查端口监听

```bash
# 在 K8s 节点 (10.7.0.2) 上
netstat -tuln | grep 31080
# 应该显示 0.0.0.0:31080 或 :::31080

# 或使用 ss
ss -tuln | grep 31080
```

### 3. 测试连通性

```bash
# 从外部 nginx 服务器测试
curl -v http://10.7.0.2:31080

# 测试 chat 子域名
curl -H "Host: chat.omniverseai.net" http://10.7.0.2:31080
```

### 4. 检查 Headers 转发

```bash
# 测试 headers 是否正确转发
curl -v https://chat.omniverseai.net/ -H "X-Debug: test"
```

查看响应头中是否有 `X-Upstream-Server`，这表明请求成功到达 K8s。

## 常见问题

### 1. 502 Bad Gateway

**原因**: Nginx 无法连接到 K8s ingress

**检查**:

```bash
# 在外部 nginx 上
telnet 10.7.0.2 31080

# 检查防火墙
iptables -L | grep 31080

# 检查 K8s ingress controller
kubectl get svc -n ingress-nginx
kubectl get pods -n ingress-nginx
```

### 2. 504 Gateway Timeout

**原因**: 响应时间超过超时设置

**解决**: 增加超时时间（已在上面配置中设置为 600s）

### 3. WebSocket 连接失败

**原因**: 缺少 WebSocket 相关 headers

**解决**: 确保配置了 `Upgrade` 和 `Connection` headers

### 4. NextAuth 重定向错误

**原因**: `X-Forwarded-Proto` 未正确设置

**解决**: 确保配置了 `proxy_set_header X-Forwarded-Proto $scheme;`

## 安全加固 (可选)

### 1. 限制访问源 IP

如果你想只允许特定 IP 访问管理功能：

```nginx
location /admin {
    allow 1.2.3.4;      # 你的 IP
    deny all;
    proxy_pass http://k8s_chat;
}
```

### 2. 添加安全 Headers

```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### 3. 速率限制

```nginx
# 在 http 块中定义
limit_req_zone $binary_remote_addr zone=chat_limit:10m rate=10r/s;

# 在 server 块中使用
location / {
    limit_req zone=chat_limit burst=20 nodelay;
    proxy_pass http://k8s_chat;
}
```

## 监控和日志

### 查看访问日志

```bash
tail -f /var/log/nginx/omniverseai.net-access.log
```

### 查看错误日志

```bash
tail -f /var/log/nginx/omniverseai.net-error.log
```

### 有用的日志格式

在 nginx.conf 的 http 块中添加：

```nginx
log_format detailed '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'upstream: $upstream_addr '
                    'upstream_status: $upstream_status '
                    'request_time: $request_time '
                    'upstream_response_time: $upstream_response_time';

# 然后在 server 块中使用
access_log /var/log/nginx/omniverseai.net-access.log detailed;
```

## 完整部署检查清单

- [ ] 外部 Nginx (85.239.233.16) 已配置并重载
- [ ] SSL 证书已配置且有效
- [ ] K8s Ingress Controller 已暴露在 NodePort 31080
- [ ] 可以从外部 Nginx 访问 10.7.0.2:31080
- [ ] DNS 解析 chat.omniverseai.net 指向 85.239.233.16
- [ ] X-Forwarded-\* headers 已正确配置
- [ ] WebSocket 支持已启用
- [ ] 文件上传限制已设置
- [ ] 超时设置足够大
- [ ] 日志正常记录

## 更新 Nginx 配置步骤

```bash
# 1. SSH 到外部服务器
ssh user@85.239.233.16

# 2. 编辑配置文件
sudo vim /etc/nginx/sites-available/omniverseai.net.conf
# 或
sudo vim /etc/nginx/conf.d/omniverseai.net.conf

# 3. 测试配置
sudo nginx -t

# 4. 如果测试通过，重载配置
sudo nginx -s reload

# 5. 查看日志确认
sudo tail -f /var/log/nginx/omniverseai.net-access.log
```

## 后续优化

### 1. 添加缓存

对于静态资源可以添加缓存：

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
    proxy_pass http://k8s_chat;
    proxy_cache_valid 200 7d;
    proxy_cache_use_stale error timeout invalid_header updating;
    add_header X-Cache-Status $upstream_cache_status;
}
```

### 2. 启用 HTTP/2

已在配置中启用：`listen 443 ssl http2;`

### 3. 启用 gzip 压缩

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```
