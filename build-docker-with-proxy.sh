#!/bin/bash

# 设置代理
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
export NO_PROXY=localhost,127.0.0.1

echo "=========================================="
echo "  灵境万象 - Docker 镜像构建"
echo "=========================================="
echo ""
echo "代理设置:"
echo "  HTTP_PROXY=$HTTP_PROXY"
echo "  HTTPS_PROXY=$HTTPS_PROXY"
echo ""
echo "开始构建..."
echo ""

cd ~/work/codes/AI/lobe-chat

docker build \
  --build-arg HTTP_PROXY=$HTTP_PROXY \
  --build-arg HTTPS_PROXY=$HTTPS_PROXY \
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
    echo "  chmod +x start-docker.sh"
    echo "  ./start-docker.sh"
    echo ""
else
    echo ""
    echo "=========================================="
    echo "  ❌ 镜像构建失败"
    echo "=========================================="
    echo ""
    echo "请检查:"
    echo "  1. 代理是否正常运行在 7890 端口"
    echo "  2. 查看构建日志以获取详细信息"
    echo ""
    exit 1
fi
