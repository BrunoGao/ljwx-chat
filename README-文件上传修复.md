# 文件上传修复 - 快速参考

## 🎯 问题

**错误消息**: "文件上传失败，请确认你的网络是否正常，并检查文件存储服务跨域配置是否正确"

**根本原因**: 预签名 URL 使用了浏览器无法访问的内部地址 `host.docker.internal:9002`

## ✅ 解决方案

已修复代码，现在会自动将内部地址替换为公网地址。

## 🚀 立即应用 (二选一)

### 方法 1: 一键修复

```bash
./rebuild-and-restart.sh
```

### 方法 2: 手动执行

```bash
docker-compose -f docker-compose.lingjingwanxiang.yml down
docker build -t lingjingwanxiang:latest .
docker-compose -f docker-compose.lingjingwanxiang.yml up -d
```

## ⏱️ 预计时间

- 构建: 5-10 分钟
- 启动: 10-20 秒
- **总计: \~10 分钟**

## ✨ 验证

1. 访问: <http://192.168.1.83:3210>
2. 上传一个文件
3. ✅ 成功！

## 📚 详细文档

- 📖 [立即修复文件上传.md](./立即修复文件上传.md) - 完整操作指南
- 🔧 [文件上传问题修复.md](./文件上传问题修复.md) - 技术详解
- 🔍 [文件上传故障排查.md](./文件上传故障排查.md) - 故障排查

## 🛠️ 修改的文件

- ✅ `src/server/modules/S3/index.ts` - 核心修复
- ✅ `src/server/modules/S3/index.test.ts` - 测试用例

## ❓ 常见问题

**Q: 会丢失数据吗？**
A: 不会，只更新代码，数据保持不变

**Q: 需要重新配置吗？**
A: 不需要，环境变量保持不变

**Q: 如果还是失败？**
A: 运行 `./test-upload.sh` 诊断问题

---

**👉 从 [立即修复文件上传.md](./立即修复文件上传.md) 开始**
