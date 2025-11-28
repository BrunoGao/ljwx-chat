#!/bin/bash
# 灵境万象 - 完成设置脚本
# 在 pnpm install 完成后运行此脚本

set -e

echo "======================================"
echo "  灵境万象 - 完成设置"
echo "======================================"
echo ""

cd ~/work/codes/AI/lobe-chat

# 1. 检查依赖
echo "1️⃣  检查依赖安装..."
if [ ! -f "node_modules/.bin/tsx" ]; then
    echo "❌ 依赖未完全安装"
    echo "正在运行 pnpm install..."
    pnpm install
else
    echo "✅ 依赖已安装"
fi
echo ""

# 2. 检查数据库连接
echo "2️⃣  检查数据库连接..."
if psql -d lingjingwanxiang -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ 数据库连接正常"
else
    echo "❌ 数据库连接失败"
    echo "请检查 PostgreSQL 是否运行:"
    echo "  brew services list | grep postgresql"
    exit 1
fi
echo ""

# 3. 检查 Vector 扩展
echo "3️⃣  检查 Vector 扩展..."
vector_check=$(psql -d lingjingwanxiang -t -c "SELECT COUNT(*) FROM pg_available_extensions WHERE name = 'vector' AND installed_version IS NOT NULL;")
if [ "$vector_check" -eq 1 ]; then
    echo "✅ Vector 扩展已启用"
else
    echo "❌ Vector 扩展未启用"
    echo "正在启用 Vector 扩展..."
    psql -d lingjingwanxiang -c "CREATE EXTENSION IF NOT EXISTS vector;"
    echo "✅ Vector 扩展已启用"
fi
echo ""

# 4. 运行数据库迁移
echo "4️⃣  初始化数据库架构..."
if bun run db:migrate; then
    echo "✅ 数据库迁移成功"
else
    echo "⚠️  数据库迁移失败，尝试使用备用方法..."
    MIGRATION_DB=1 node_modules/.bin/tsx ./scripts/migrateServerDB/index.ts
fi
echo ""

# 5. 检查 Ollama
echo "5️⃣  检查 Ollama 服务..."
if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama 服务运行正常"

    # 检查 qwen3:32b 模型
    if ollama list | grep -q "qwen3:32b"; then
        echo "✅ qwen3:32b 模型可用"
    else
        echo "⚠️  qwen3:32b 模型未找到"
        echo "可以运行: ollama pull qwen3:32b"
    fi
else
    echo "⚠️  Ollama 服务未运行"
    echo "请运行: ollama serve &"
fi
echo ""

# 6. 显示下一步
echo "======================================"
echo "  ✅ 设置完成！"
echo "======================================"
echo ""
echo "📝 下一步操作:"
echo ""
echo "1. 启动开发服务器:"
echo "   cd ~/work/codes/AI/lobe-chat"
echo "   bun run dev"
echo ""
echo "2. 或者构建生产版本:"
echo "   cd ~/work/codes/AI/lobe-chat"
echo "   bun run build"
echo "   bun run start"
echo ""
echo "3. 访问应用:"
echo "   开发模式: http://localhost:3010"
echo "   生产模式: http://localhost:3210"
echo ""
echo "4. 查看完整文档:"
echo "   ~/work/codes/AI/lobe-chat/完整知识库设置完成报告.md"
echo ""
echo "======================================"
