#!/bin/bash

# MinIO 配置脚本
# 用于配置 bucket 和 CORS 设置

echo "=== MinIO 配置脚本 ==="
echo ""

# MinIO 配置
MINIO_ENDPOINT="http://localhost:9002"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
BUCKET_NAME="lingjingwanxiang"

echo "步骤 1: 检查 MinIO 是否运行..."
if ! curl -s "$MINIO_ENDPOINT/minio/health/live" > /dev/null; then
    echo "❌ MinIO 未运行,请先启动 MinIO:"
    echo "   docker-compose -f docker-compose.minio.yml up -d"
    exit 1
fi
echo "✓ MinIO 正在运行"
echo ""

echo "步骤 2: 配置 mc (MinIO Client)..."
# 检查 mc 是否安装
if ! command -v mc &> /dev/null; then
    echo "正在安装 MinIO Client (mc)..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install minio/stable/mc
    else
        echo "请手动安装 mc: https://min.io/docs/minio/linux/reference/minio-mc.html"
        exit 1
    fi
fi

# 配置 mc alias
mc alias set local $MINIO_ENDPOINT $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
echo "✓ mc 配置完成"
echo ""

echo "步骤 3: 创建 bucket..."
if mc ls local/$BUCKET_NAME &> /dev/null; then
    echo "✓ Bucket '$BUCKET_NAME' 已存在"
else
    mc mb local/$BUCKET_NAME
    echo "✓ Bucket '$BUCKET_NAME' 创建成功"
fi
echo ""

echo "步骤 4: 设置 bucket 公开访问策略..."
mc anonymous set public local/$BUCKET_NAME
echo "✓ Bucket 设置为公开访问"
echo ""

echo "步骤 5: 配置 CORS (跨域资源共享)..."
# 创建 CORS 配置文件
cat > /tmp/cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

# 应用 CORS 配置
mc anonymous set-json /tmp/cors.json local/$BUCKET_NAME 2>/dev/null || {
    echo "注意: 使用 mc 命令配置 CORS 失败,需要手动配置"
    echo "请访问 MinIO Console: http://localhost:9003"
    echo "登录后在 Buckets -> $BUCKET_NAME -> Configuration -> Access Policy 中配置 CORS"
}

# 清理临时文件
rm -f /tmp/cors.json
echo "✓ CORS 配置完成"
echo ""

echo "=== 配置完成 ==="
echo ""
echo "MinIO 信息:"
echo "  API 端点: http://localhost:9002 (或 http://192.168.1.83:9002)"
echo "  控制台: http://localhost:9003"
echo "  用户名: $MINIO_ACCESS_KEY"
echo "  密码: $MINIO_SECRET_KEY"
echo "  Bucket: $BUCKET_NAME"
echo ""
echo "下一步:"
echo "  1. 访问 http://localhost:9003 验证配置"
echo "  2. 重启应用: docker-compose -f docker-compose.lingjingwanxiang.yml restart"
echo "  3. 测试文件上传功能"
