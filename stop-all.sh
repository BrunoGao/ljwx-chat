#!/bin/bash

# 停止所有服务

echo "=== 停止所有服务 ==="
echo ""

echo "停止 LobeChat..."
docker-compose -f docker-compose.lingjingwanxiang.yml down

echo "停止 MinIO..."
docker-compose -f docker-compose.minio.yml down

echo ""
echo "✓ 所有服务已停止"
echo ""
echo "如需完全清理 (包括数据):"
echo "  docker-compose -f docker-compose.minio.yml down -v"
echo "  rm -rf minio-data"
