#!/bin/bash
# Mirai ヘルプデスク - 統合起動スクリプト (Linux/macOS)
# バックエンドとフロントエンドを同時起動

echo "========================================"
echo "🌟 Mirai ヘルプデスク - 統合起動"
echo "========================================"
echo ""

# IPアドレス取得
if command -v ip &> /dev/null; then
    MAIN_IP=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1 | head -n 1)
elif command -v ifconfig &> /dev/null; then
    MAIN_IP=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -n 1)
fi

if [ -n "$MAIN_IP" ]; then
    echo "✅ IPアドレス: $MAIN_IP"
else
    MAIN_IP="localhost"
fi

echo ""
echo "🚀 バックエンドとフロントエンドを並列起動します..."
echo ""

# trap でクリーンアップ
trap 'kill $(jobs -p) 2>/dev/null' EXIT

# バックエンド起動（バックグラウンド）
echo "🔧 バックエンドを起動中..."
./start-backend.sh &
BACKEND_PID=$!

# 5秒待機
sleep 5

# フロントエンド起動（バックグラウンド）
echo "🎨 フロントエンドを起動中..."
./start-frontend.sh &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "✅ 起動完了！"
echo "========================================"
echo ""
echo "📍 アクセスURL:"
echo "  🎨 フロントエンド:"
echo "    - http://localhost:5173"
echo "    - http://${MAIN_IP}:5173"
echo ""
echo "  🔧 バックエンドAPI:"
echo "    - http://localhost:3000/api"
echo "    - http://${MAIN_IP}:3000/api"
echo ""
echo "🔑 デフォルトログイン:"
echo "  Email: admin@example.com"
echo "  Password: Admin123!"
echo ""
echo "🛑 停止するには Ctrl+C を押してください"
echo ""
echo "📊 プロセスID:"
echo "  Backend: $BACKEND_PID"
echo "  Frontend: $FRONTEND_PID"
echo ""

# 待機（Ctrl+Cで停止）
wait
