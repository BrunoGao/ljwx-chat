#!/bin/bash

echo "=========================================="
echo "  灵境万象 - Docker 镜像构建"
echo "=========================================="
echo ""
echo "不使用代理，直接构建..."
echo ""

cd ~/work/codes/AI/lobe-chat

docker build \
  --build-arg NEXT_PUBLIC_ENABLE_NEXT_AUTH=0 \
  -t lingjingwanxiang:latest \
  .

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "  ✅ 镜像构建成功！"
    echo "=========================================="
    echo ""
    echo "镜像信息:"
    docker images lingjingwanxiang:latest
    echo ""
    echo "下一步: 启动服务"
    echo "  ./start-docker.sh"
    echo ""
else
    echo ""
    echo "=========================================="
    echo "  ❌ 镜像构建失败"
    echo "=========================================="
    echo ""
    exit 1
fi
