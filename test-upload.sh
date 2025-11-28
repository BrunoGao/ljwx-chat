#!/bin/bash

# 文件上传诊断测试脚本

echo "=== 文件上传诊断测试 ==="
echo ""

# 测试 1: MinIO 健康检查
echo "测试 1: MinIO 健康检查..."
if curl -s http://localhost:9002/minio/health/live > /dev/null; then
    echo "✓ MinIO 运行正常 (localhost:9002)"
else
    echo "❌ MinIO 无法访问 (localhost:9002)"
fi

if curl -s http://192.168.1.83:9002/minio/health/live > /dev/null; then
    echo "✓ MinIO 运行正常 (192.168.1.83:9002)"
else
    echo "❌ MinIO 无法访问 (192.168.1.83:9002)"
fi
echo ""

# 测试 2: Bucket 访问
echo "测试 2: Bucket 访问测试..."
BUCKET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9002/lingjingwanxiang/)
if [ "$BUCKET_STATUS" = "200" ] || [ "$BUCKET_STATUS" = "403" ]; then
    echo "✓ Bucket 可访问 (状态码: $BUCKET_STATUS)"
else
    echo "❌ Bucket 无法访问 (状态码: $BUCKET_STATUS)"
fi
echo ""

# 测试 3: CORS 配置
echo "测试 3: CORS 配置测试..."
echo "测试来源: http://192.168.1.83:3210"
CORS_RESPONSE=$(curl -s -X OPTIONS http://localhost:9002/lingjingwanxiang/ \
    -H "Origin: http://192.168.1.83:3210" \
    -H "Access-Control-Request-Method: PUT" \
    -H "Access-Control-Request-Headers: content-type" \
    -i 2>&1 | grep -i "access-control-allow-origin")

if [ -n "$CORS_RESPONSE" ]; then
    echo "✓ CORS 已配置: $CORS_RESPONSE"
else
    echo "❌ CORS 未正确配置"
fi

echo ""
echo "测试来源: http://localhost:3210"
CORS_RESPONSE2=$(curl -s -X OPTIONS http://localhost:9002/lingjingwanxiang/ \
    -H "Origin: http://localhost:3210" \
    -H "Access-Control-Request-Method: PUT" \
    -H "Access-Control-Request-Headers: content-type" \
    -i 2>&1 | grep -i "access-control-allow-origin")

if [ -n "$CORS_RESPONSE2" ]; then
    echo "✓ CORS 已配置: $CORS_RESPONSE2"
else
    echo "❌ CORS 未正确配置"
fi
echo ""

# 测试 4: 创建测试文件并上传
echo "测试 4: 文件上传测试..."
TEST_FILE="/tmp/test-upload-$(date +%s).txt"
echo "This is a test file" > "$TEST_FILE"

# 使用 mc 上传
mc cp "$TEST_FILE" local/lingjingwanxiang/ 2>&1
if [ $? -eq 0 ]; then
    echo "✓ 文件上传成功 (使用 mc)"

    # 测试文件下载
    TEST_FILENAME=$(basename "$TEST_FILE")
    DOWNLOAD_URL="http://192.168.1.83:9002/lingjingwanxiang/$TEST_FILENAME"

    echo "测试下载 URL: $DOWNLOAD_URL"
    DOWNLOAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOWNLOAD_URL")

    if [ "$DOWNLOAD_STATUS" = "200" ]; then
        echo "✓ 文件可通过公网 URL 访问 (状态码: $DOWNLOAD_STATUS)"
    else
        echo "❌ 文件无法通过公网 URL 访问 (状态码: $DOWNLOAD_STATUS)"
    fi

    # 清理测试文件
    mc rm "local/lingjingwanxiang/$TEST_FILENAME" 2>&1 > /dev/null
else
    echo "❌ 文件上传失败"
fi

rm -f "$TEST_FILE"
echo ""

# 测试 5: 模拟 LobeChat 上传流程
echo "测试 5: 模拟预签名 URL 上传..."
echo "注意: 这需要从 LobeChat 应用获取预签名 URL"
echo "请在浏览器中打开开发者工具 (F12) → Network 标签"
echo "尝试上传文件,查找 'createS3PreSignedUrl' 请求"
echo ""

# 测试 6: 检查容器网络连通性
echo "测试 6: 容器网络连通性..."
docker exec lingjingwanxiang wget -q -O- http://host.docker.internal:9002/minio/health/live > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ 容器可以访问 host.docker.internal:9002"
else
    echo "❌ 容器无法访问 host.docker.internal:9002"
fi
echo ""

echo "=== 诊断完成 ==="
echo ""
echo "如果所有测试都通过但仍然无法上传,请检查:"
echo "1. 浏览器控制台 (F12) 的错误信息"
echo "2. Network 标签中失败的请求详情"
echo "3. 确认浏览器访问地址 (localhost:3210 vs 192.168.1.83:3210)"
echo ""
echo "常见问题:"
echo "- 如果使用 localhost:3210 访问,CORS 可能不匹配"
echo "- 预签名 URL 可能使用了内部地址而非公网地址"
echo "- 防火墙可能阻止了 9002 端口访问"
