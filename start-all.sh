#!/bin/bash

# 一键启动脚本 - 启动 MinIO 和 LobeChat

set -e  # 遇到错误立即退出

echo "=== 灵境万象 - 启动脚本 ==="
echo ""

# 检查必要的文件
if [ ! -f "docker-compose.minio.yml" ]; then
    echo "❌ 错误: docker-compose.minio.yml 不存在"
    exit 1
fi

if [ ! -f "docker-compose.lingjingwanxiang.yml" ]; then
    echo "❌ 错误: docker-compose.lingjingwanxiang.yml 不存在"
    exit 1
fi

echo "步骤 1: 启动 MinIO 服务..."
docker-compose -f docker-compose.minio.yml up -d

# 等待 MinIO 启动
echo "等待 MinIO 启动..."
sleep 5

# 检查 MinIO 是否运行
MAX_RETRIES=10
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:9002/minio/health/live > /dev/null 2>&1; then
        echo "✓ MinIO 已启动"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo "❌ MinIO 启动超时"
        echo "请检查日志: docker logs lingjingwanxiang-minio"
        exit 1
    fi
    echo "等待 MinIO 启动... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done
echo ""

echo "步骤 2: 配置 MinIO (创建 bucket 和 CORS)..."
if [ -f "setup-minio.sh" ]; then
    chmod +x setup-minio.sh
    ./setup-minio.sh
else
    echo "⚠️ 警告: setup-minio.sh 不存在,请手动配置 MinIO"
    echo "   访问 http://localhost:9003 进行配置"
fi
echo ""

echo "步骤 3: 启动 LobeChat 应用..."
docker-compose -f docker-compose.lingjingwanxiang.yml up -d

# 等待应用启动
echo "等待应用启动..."
sleep 3
echo ""

echo "=== 启动完成 ==="
echo ""
echo "服务信息:"
echo "  LobeChat:     http://192.168.1.83:3210"
echo "  MinIO API:    http://192.168.1.83:9002"
echo "  MinIO 控制台:  http://localhost:9003 (minioadmin / minioadmin)"
echo ""
echo "查看日志:"
echo "  docker logs -f lingjingwanxiang        # LobeChat 日志"
echo "  docker logs -f lingjingwanxiang-minio  # MinIO 日志"
echo ""
echo "停止服务:"
echo "  ./stop-all.sh"
echo ""
