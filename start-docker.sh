#!/bin/bash
# 灵境万象 - Docker 启动脚本

set -e

echo "======================================="
echo "  灵境万象 - Docker 启动"
echo "======================================="
echo ""

cd ~/work/codes/AI/lobe-chat

# 检查必要的服务是否运行
echo "1️⃣  检查必要服务状态..."
echo ""

# 检查 PostgreSQL
echo "📊 PostgreSQL:"
if psql -d lingjingwanxiang -c "SELECT 1;" > /dev/null 2>&1; then
    echo "  ✅ 运行中 (localhost:5432)"
else
    echo "  ❌ 未运行"
    echo "  请启动 PostgreSQL: brew services start postgresql@14"
    exit 1
fi

# 检查 MinIO
echo ""
echo "💾 MinIO:"
if curl -s http://127.0.0.1:9002/minio/health/live > /dev/null 2>&1; then
    echo "  ✅ 运行中 (localhost:9002)"
else
    echo "  ❌ 未运行"
    echo "  请启动 MinIO:"
    echo "  minio server ~/minio/data --console-address ':9003' --address ':9002' &"
    exit 1
fi

# 检查 Ollama
echo ""
echo "🤖 Ollama:"
if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo "  ✅ 运行中 (localhost:11434)"

    # 检查 qwen3:32b 模型
    if ollama list | grep -q "qwen3:32b"; then
        echo "  ✅ qwen3:32b 模型可用"
    else
        echo "  ⚠️  qwen3:32b 模型未找到"
        echo "  可运行: ollama pull qwen3:32b"
    fi
else
    echo "  ❌ 未运行"
    echo "  请启动 Ollama: ollama serve &"
    exit 1
fi

echo ""
echo "======================================="
echo ""

# 停止正在运行的 dev 服务器
echo "2️⃣  停止开发服务器..."
lsof -ti:3010 2>/dev/null | xargs kill -9 2>/dev/null || true
echo "  ✅ 已停止"
echo ""

# 启动 Docker Compose
echo "3️⃣  启动 Docker 容器..."
echo ""

docker-compose -f docker-compose.lingjingwanxiang.yml up -d

echo ""
echo "======================================="
echo "  ✅ 启动完成！"
echo "======================================="
echo ""
echo "📊 服务状态:"
echo ""
echo "  • 灵境万象:     http://localhost:3210"
echo "  • MinIO 控制台: http://localhost:9003"
echo "  • PostgreSQL:   localhost:5432"
echo "  • Ollama:       localhost:11434"
echo ""
echo "📝 管理命令:"
echo ""
echo "  查看日志:"
echo "  docker-compose -f docker-compose.lingjingwanxiang.yml logs -f"
echo ""
echo "  停止服务:"
echo "  docker-compose -f docker-compose.lingjingwanxiang.yml down"
echo ""
echo "  重启服务:"
echo "  docker-compose -f docker-compose.lingjingwanxiang.yml restart"
echo ""
echo "======================================="
