#!/bin/bash
#
# Mirai HelpDesk - 開発環境起動スクリプト (Linux)
# ブックマーク: [開発] Mirai HelpDesk
# URL: http://192.168.0.187:8080
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BACKEND_HOST="192.168.0.187"
BACKEND_PORT=8000
FRONTEND_HOST="192.168.0.187"
FRONTEND_PORT=8080

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Mirai HelpDesk - 開発環境起動${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 が見つかりません。インストールしてください。${NC}"
    exit 1
fi

# Setup Backend Virtual Environment
VENV_PATH="$PROJECT_ROOT/backend/.venv-linux"
ENV_FILE="$PROJECT_ROOT/backend/.env.development"

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
    echo -e "${GREEN}✅ 開発環境設定を適用しました${NC}"
fi

# Create PID directory
mkdir -p "$PROJECT_ROOT/logs/development"

# Start Backend
echo ""
echo -e "${YELLOW}🚀 バックエンドAPIを起動中...${NC}"
echo -e "   URL: http://${BACKEND_HOST}:${BACKEND_PORT}/api"
echo -e "   Docs: http://${BACKEND_HOST}:${BACKEND_PORT}/api/docs"

cd "$PROJECT_ROOT/backend"
nohup "$VENV_PATH/bin/uvicorn" app.main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT" --reload \
    > "$PROJECT_ROOT/logs/development/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PROJECT_ROOT/logs/development/backend.pid"
echo -e "${GREEN}✅ バックエンドAPI起動完了 (PID: $BACKEND_PID)${NC}"

# Wait for backend to start
sleep 2

# Start Frontend
echo ""
echo -e "${YELLOW}🌐 フロントエンドWebUIを起動中...${NC}"
echo -e "   URL: http://${FRONTEND_HOST}:${FRONTEND_PORT}"

cd "$PROJECT_ROOT/frontend"
nohup python3 -m http.server "$FRONTEND_PORT" --bind "$FRONTEND_HOST" \
    > "$PROJECT_ROOT/logs/development/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PROJECT_ROOT/logs/development/frontend.pid"
echo -e "${GREEN}✅ フロントエンドWebUI起動完了 (PID: $FRONTEND_PID)${NC}"

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}  ✅ 開発環境が起動しました！${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
echo -e "📌 アクセスURL:"
echo -e "   ${CYAN}[開発] フロントエンド: http://${FRONTEND_HOST}:${FRONTEND_PORT}${NC}"
echo -e "   ${CYAN}[開発] API: http://${BACKEND_HOST}:${BACKEND_PORT}/api${NC}"
echo -e "   ${CYAN}[開発] API Docs: http://${BACKEND_HOST}:${BACKEND_PORT}/api/docs${NC}"
echo ""
echo -e "${YELLOW}🛑 停止するには: ./scripts/linux/stop-all.sh${NC}"
echo ""
