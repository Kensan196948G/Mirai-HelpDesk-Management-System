#!/bin/bash
# Mirai ヘルプデスク - バックエンド起動スクリプト (Linux/macOS)

echo "========================================"
echo "🚀 Mirai ヘルプデスク - バックエンド起動"
echo "========================================"
echo ""

# IPアドレス取得
echo "🔍 ネットワーク情報を取得中..."
if command -v ip &> /dev/null; then
    # Linux
    MAIN_IP=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1 | head -n 1)
elif command -v ifconfig &> /dev/null; then
    # macOS
    MAIN_IP=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -n 1)
fi

if [ -n "$MAIN_IP" ]; then
    echo "✅ IPアドレス: $MAIN_IP"
else
    MAIN_IP="localhost"
    echo "⚠️ IPアドレスが取得できませんでした。localhostを使用します。"
fi

echo ""

# Node.jsバージョン確認
echo "🔍 Node.js バージョン確認..."
NODE_VERSION=$(node --version)
echo "✅ Node.js: $NODE_VERSION"

NPM_VERSION=$(npm --version)
echo "✅ npm: $NPM_VERSION"
echo ""

# backendディレクトリに移動
cd backend

# .envファイルの確認と更新
echo "🔧 環境変数の設定..."
if [ -f .env ]; then
    echo "✅ .env ファイルが見つかりました"

    # CORS_ORIGINを動的に更新
    sed -i.bak "s|CORS_ORIGIN=.*|CORS_ORIGIN=http://localhost:3001,http://${MAIN_IP}:3001|g" .env
    echo "✅ CORS設定を更新: http://localhost:3001, http://${MAIN_IP}:3001"
else
    echo "⚠️ .env ファイルが見つかりません。.env.exampleをコピーします。"
    cp .env.example .env
    echo "✅ .env ファイルを作成しました。必要に応じて編集してください。"
fi

echo ""

# node_modulesの確認
if [ ! -d node_modules ]; then
    echo "📦 依存関係をインストール中..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ 依存関係のインストール完了"
    else
        echo "❌ 依存関係のインストールに失敗しました"
        exit 1
    fi
else
    echo "✅ 依存関係は既にインストール済み"
fi

echo ""
echo "========================================"
echo "🎉 バックエンドサーバーを起動します"
echo "========================================"
echo ""
echo "📍 アクセスURL:"
echo "  - http://localhost:3000"
echo "  - http://${MAIN_IP}:3000"
echo ""
echo "🛑 停止するには Ctrl+C を押してください"
echo ""

# 開発サーバー起動
npm run dev
