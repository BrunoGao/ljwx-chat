# Kubernetes 部署文档结构

k8s/
├── 📖 文档索引
│   └── INDEX.md                    ← 从这里开始！文档导航
│
├── 🚀 快速部署指南
│   ├── DEPLOY-TO-EXISTING.md       ← 推荐：部署到现有架构（3步）
│   └── QUICKSTART.md               ← 5分钟快速开始
│
├── 📚 详细文档
│   ├── ARCHITECTURE.md             ← 系统架构和故障排查
│   ├── EXTERNAL-NGINX.md           ← 外部 Nginx 完整配置
│   └── README.md                   ← 完整部署文档
│
├── ⚙️ 配置文件
│   ├── namespace.yaml              ← 创建 chat namespace
│   ├── configmap.yaml              ← 环境变量配置
│   ├── secret.yaml                 ← 敏感信息（由脚本生成）
│   ├── deployment.yaml             ← Pod 定义
│   ├── service.yaml                ← ClusterIP Service
│   ├── ingress.yaml                ← Ingress 路由规则
│   ├── ingress-nodeport.yaml       ← Ingress Controller NodePort
│   └── kustomization.yaml          ← Kustomize 配置
│
├── 🔧 工具脚本
│   ├── build.sh                    ← 构建 Docker 镜像
│   ├── generate-secret.sh          ← 生成 K8s Secret
│   └── deploy.sh                   ← 一键部署
│
└── 📝 配置模板
    ├── .env.template               ← 环境变量模板
    └── .gitignore                  ← Git 忽略规则

推荐阅读顺序:
1️⃣ INDEX.md - 了解文档结构
2️⃣ DEPLOY-TO-EXISTING.md - 快速部署（适合当前架构）
3️⃣ ARCHITECTURE.md - 理解系统架构
4️⃣ EXTERNAL-NGINX.md - 配置外部 Nginx

遇到问题？
→ 查看 ARCHITECTURE.md 的故障排查部分
→ 检查日志: kubectl logs -n chat -l app=lobechat
