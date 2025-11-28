#!/bin/bash
# 灵境万象 - 快速启动脚本

echo "========================================="
echo "    灵境万象 AI 助手"
echo "========================================="
echo ""

# 检查 Ollama
if ! command -v ollama &> /dev/null; then
    echo "⚠️  Ollama 未安装"
    echo "请访问 https://ollama.com 安装"
    echo ""
else
    echo "✅ Ollama 已安装"
    
    # 检查 Ollama 服务
    if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama 服务运行中"
        echo ""
        echo "可用模型："
        ollama list
    else
        echo "⚠️  Ollama 服务未运行"
        echo "正在启动 Ollama..."
        ollama serve &
        sleep 3
    fi
fi

echo ""
echo "========================================="
echo "正在启动灵境万象..."
echo "========================================="
echo ""

# 启动开发服务器
bun run dev
