# 灵境万象 - 生产模式使用指南

## 🚀 当前状态

**应用已运行在生产模式！**

- **访问地址**: <http://192.168.1.83:3210>
- **默认模型**: lingjingwanxiang:32b
- **进程管理**: PM2

---

## 📋 PM2 常用命令

### 查看状态

```bash
pm2 status                # 查看所有进程状态
pm2 info lingjingwanxiang # 查看详细信息
pm2 monit                 # 实时监控
```

### 进程管理

```bash
pm2 restart lingjingwanxiang # 重启应用
pm2 reload lingjingwanxiang  # 平滑重载（零停机）
pm2 stop lingjingwanxiang    # 停止应用
pm2 start lingjingwanxiang   # 启动应用
pm2 delete lingjingwanxiang  # 删除进程
```

### 日志查看

```bash
pm2 logs lingjingwanxiang             # 实时日志
pm2 logs lingjingwanxiang --lines 100 # 查看最近100行
pm2 logs lingjingwanxiang --nostream  # 显示日志不跟踪
pm2 flush lingjingwanxiang            # 清空日志
```

### 开机自启动

**首次配置**（需要 sudo 权限）：
\`\`\`bash
sudo env PATH=$PATH:/Users/brunogao/.nvm/versions/node/v21.7.3/bin \\
/Users/brunogao/.nvm/versions/node/v21.7.3/lib/node_modules/pm2/bin/pm2 \\
startup launchd -u brunogao --hp /Users/brunogao
\`\`\`

**保存当前进程列表**：
\`\`\`bash
pm2 save
\`\`\`

---

## 🔄 模式切换

### 从开发模式切换到生产模式

1. **停止开发服务器**：
   \`\`\`bash
   pkill -f "next dev"
   \`\`\`

2. **启动生产服务器**：
   \`\`\`bash
   pm2 start ecosystem.config.js
   \`\`\`

### 从生产模式切换到开发模式

1. **停止生产服务器**：
   \`\`\`bash
   pm2 stop lingjingwanxiang
   \`\`\`

2. **启动开发服务器**：
   \`\`\`bash
   pnpm dev
   \`\`\`

---

## 🔨 重新构建

当代码更新后，需要重新构建：

\`\`\`bash

# 停止服务器

pm2 stop lingjingwanxiang

# 重新构建

pnpm run build

# 重启服务器

pm2 restart lingjingwanxiang
\`\`\`

或者使用一键脚本：
\`\`\`bash
pm2 stop lingjingwanxiang && pnpm run build && pm2 restart lingjingwanxiang
\`\`\`

---

## 📊 性能监控

### 基础监控

\`\`\`bash
pm2 monit # 实时 CPU 和内存监控
pm2 status # 进程状态概览
\`\`\`

### 查看资源使用

\`\`\`bash
pm2 info lingjingwanxiang # 详细信息包括内存、CPU、重启次数等
\`\`\`

---

## 🔧 配置文件

### PM2 配置文件

**位置**: `/Users/brunogao/work/codes/AI/lobe-chat/ecosystem.config.js`

**主要配置**：

- **名称**: lingjingwanxiang
- **端口**: 3210
- **实例数**: 1
- **执行模式**: fork
- **自动重启**: 是
- **最大内存**: 2GB
- **日志目录**: `./logs/`

### 启动脚本

**位置**: `/Users/brunogao/work/codes/AI/lobe-chat/start-production.sh`

---

## 📝 日志位置

- **PM2 输出日志**: `./logs/pm2-out.log`
- **PM2 错误日志**: `./logs/pm2-error.log`
- **PM2 系统日志**: `~/.pm2/logs/`

---

## ⚡️ 快速命令

### 一键重启

\`\`\`bash
pm2 restart lingjingwanxiang
\`\`\`

### 查看实时日志

\`\`\`bash
pm2 logs lingjingwanxiang
\`\`\`

### 检查应用健康状态

\`\`\`bash
curl -s <http://localhost:3210> | grep "<title>"
\`\`\`

---

## 🆘 故障排查

### 应用无法启动

1. 查看日志：`pm2 logs lingjingwanxiang`
2. 检查端口占用：`lsof -i :3210`
3. 验证构建：确保 `.next` 目录存在
4. 检查数据库连接：`psql -U brunogao -d lingjingwanxiang -c "SELECT 1;"`

### 应用频繁重启

1. 查看重启原因：`pm2 info lingjingwanxiang`
2. 检查内存使用：应用可能超过 2GB 限制
3. 查看错误日志：`pm2 logs lingjingwanxiang --err`

### 性能问题

1. 增加内存限制：编辑 `ecosystem.config.js` 中的 `max_memory_restart`
2. 使用集群模式：将 `instances` 改为 `max` 或具体数字
3. 启用缓存：确保环境变量配置正确

---

## 🎯 最佳实践

1. **定期备份数据库**：
   \`\`\`bash
   pg_dump -U brunogao lingjingwanxiang > backup-$(date +%Y%m%d).sql
   \`\`\`

2. **监控日志大小**：
   \`\`\`bash
   pm2 flush lingjingwanxiang # 定期清理日志
   \`\`\`

3. **优雅重启**：
   \`\`\`bash
   pm2 reload lingjingwanxiang # 零停机重启
   \`\`\`

4. **保存 PM2 配置**：
   \`\`\`bash
   pm2 save # 更改后保存
   \`\`\`

---

## 📞 支持信息

- **应用路径**: /Users/brunogao/work/codes/AI/lobe-chat
- **Node 版本**: v21.7.3
- **PM2 版本**: 运行 `pm2 -v` 查看
- **数据库**: PostgreSQL 14.19

---

## 🔗 相关文档

- [Ollama 模型配置](./LINGJINGWANXIANG-32B-SETUP.md)
- [PM2 官方文档](https://pm2.keymetrics.io/)
- [Next.js 生产部署](https://nextjs.org/docs/deployment)
