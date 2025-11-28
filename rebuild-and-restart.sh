#!/bin/bash

# 重新构建并重启应用

set -e

echo "=== 重新构建并重启灵境万象 ==="
echo ""

echo "步骤 1: 停止当前运行的容器..."
docker-compose -f docker-compose.lingjingwanxiang.yml down
echo "✓ 容器已停止"
echo ""

echo "步骤 2: 重新构建 Docker 镜像..."
echo "这可能需要几分钟时间,请耐心等待..."
echo ""

# 使用代理构建(如果需要)
if [ -f "./build-docker.sh" ]; then
    ./build-docker.sh
else
    docker build -t lingjingwanxiang:latest .
fi

if [ $? -ne 0 ]; then
    echo "❌ Docker 镜像构建失败"
    exit 1
fi

echo ""
echo "✓ Docker 镜像构建成功"
echo ""

echo "步骤 3: 启动应用..."
docker-compose -f docker-compose.lingjingwanxiang.yml up -d

# 等待应用启动
echo "等待应用启动..."
sleep 5

echo ""
echo "=== 重启完成 ==="
echo ""
echo "应用访问地址: http://192.168.1.83:3210"
echo ""
echo "查看日志:"
echo "  docker logs -f lingjingwanxiang"
echo ""
echo "现在可以测试文件上传功能了!"
