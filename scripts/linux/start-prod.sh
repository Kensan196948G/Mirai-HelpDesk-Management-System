#!/bin/bash
#
# Mirai HelpDesk - 本番環境起動スクリプト (Linux)
# ブックマーク: [本番] Mirai HelpDesk
# URL: https://192.168.0.187
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_HOST="192.168.0.187"
BACKEND_PORT=8443
FRONTEND_HOST="192.168.0.187"
FRONTEND_PORT=443

# SSL Certificates
CERT_PATH="$PROJECT_ROOT/certificates/server.crt"
KEY_PATH="$PROJECT_ROOT/certificates/server.key"

echo -e "${MAGENTA}============================================${NC}"
echo -e "${MAGENTA}  Mirai HelpDesk - 本番環境起動${NC}"
echo -e "${MAGENTA}============================================${NC}"
echo ""

# Check SSL Certificates
if [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; then
    echo -e "${RED}❌ SSL証明書が見つかりません。${NC}"
    echo -e "${YELLOW}   ./scripts/linux/generate-ssl.sh を実行してください。${NC}"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 が見つかりません。インストールしてください。${NC}"
    exit 1
fi

# Check for port 443 (requires sudo)
if [ "$FRONTEND_PORT" -lt 1024 ]; then
    if [ "$EUID" -ne 0 ]; then
        echo -e "${YELLOW}⚠️ ポート $FRONTEND_PORT を使用するにはroot権限が必要です${NC}"
        echo -e "${YELLOW}   sudo $0 を実行してください${NC}"
        exit 1
    fi
fi

# Setup Backend Virtual Environment
VENV_PATH="$PROJECT_ROOT/backend/.venv-linux"
ENV_FILE="$PROJECT_ROOT/backend/.env.production"

if [ ! -d "$VENV_PATH" ]; then
    echo -e "${YELLOW}📦 Python仮想環境を作成中...${NC}"
    cd "$PROJECT_ROOT/backend"
    python3 -m venv .venv-linux
fi

# Activate venv and install dependencies
source "$VENV_PATH/bin/activate"

REQUIREMENTS_FILE="$PROJECT_ROOT/backend/requirements.txt"
if [ -f "$REQUIREMENTS_FILE" ]; then
    echo -e "${YELLOW}📦 依存関係をチェック中...${NC}"
    pip install -r "$REQUIREMENTS_FILE" -q
fi

# Copy environment file
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$PROJECT_ROOT/backend/.env"
    echo -e "${GREEN}✅ 本番環境設定を適用しました${NC}"
fi

# Create log directory
mkdir -p "$PROJECT_ROOT/logs/production"

# Start Backend with HTTPS
echo ""
echo -e "${YELLOW}🚀 バックエンドAPI (HTTPS) を起動中...${NC}"
echo -e "   URL: https://${BACKEND_HOST}:${BACKEND_PORT}/api"

cd "$PROJECT_ROOT/backend"
nohup "$VENV_PATH/bin/uvicorn" app.main:app \
    --host "$BACKEND_HOST" \
    --port "$BACKEND_PORT" \
    --ssl-certfile "$CERT_PATH" \
    --ssl-keyfile "$KEY_PATH" \
    > "$PROJECT_ROOT/logs/production/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PROJECT_ROOT/logs/production/backend.pid"
echo -e "${GREEN}✅ バックエンドAPI起動完了 (PID: $BACKEND_PID)${NC}"

# Wait for backend to start
sleep 2

# Start Frontend with HTTPS
echo ""
echo -e "${YELLOW}🌐 フロントエンドWebUI (HTTPS) を起動中...${NC}"
echo -e "   URL: https://${FRONTEND_HOST}"

# Create HTTPS server script
HTTPS_SERVER_SCRIPT="$PROJECT_ROOT/scripts/linux/https_server.py"
cat > "$HTTPS_SERVER_SCRIPT" << EOF
import http.server
import ssl
import os

os.chdir('$PROJECT_ROOT/frontend')

server_address = ('$FRONTEND_HOST', $FRONTEND_PORT)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('$CERT_PATH', '$KEY_PATH')
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
print(f"Serving HTTPS on {server_address}")
httpd.serve_forever()
EOF

nohup python3 "$HTTPS_SERVER_SCRIPT" \
    > "$PROJECT_ROOT/logs/production/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PROJECT_ROOT/logs/production/frontend.pid"
echo -e "${GREEN}✅ フロントエンドWebUI起動完了 (PID: $FRONTEND_PID)${NC}"

echo ""
echo -e "${MAGENTA}============================================${NC}"
echo -e "${GREEN}  ✅ 本番環境が起動しました！${NC}"
echo -e "${MAGENTA}============================================${NC}"
echo ""
echo -e "📌 アクセスURL:"
echo -e "   ${MAGENTA}[本番] フロントエンド: https://${FRONTEND_HOST}${NC}"
echo -e "   ${MAGENTA}[本番] API: https://${BACKEND_HOST}:${BACKEND_PORT}/api${NC}"
echo ""
echo -e "${YELLOW}⚠️ 自己署名証明書のため、ブラウザで警告が表示されます${NC}"
echo ""
echo -e "${YELLOW}🛑 停止するには: ./scripts/linux/stop-all.sh${NC}"
echo ""
