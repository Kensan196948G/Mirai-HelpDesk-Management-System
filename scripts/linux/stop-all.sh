#!/bin/bash
#
# Mirai HelpDesk - 全サービス停止スクリプト (Linux)
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}============================================${NC}"
echo -e "${RED}  Mirai HelpDesk - サービス停止${NC}"
echo -e "${RED}============================================${NC}"
echo ""

# Stop development services
DEV_BACKEND_PID="$PROJECT_ROOT/logs/development/backend.pid"
DEV_FRONTEND_PID="$PROJECT_ROOT/logs/development/frontend.pid"

if [ -f "$DEV_BACKEND_PID" ]; then
    PID=$(cat "$DEV_BACKEND_PID")
    if kill -0 "$PID" 2>/dev/null; then
        echo -e "${YELLOW}🛑 開発バックエンドを停止中... (PID: $PID)${NC}"
        kill "$PID" 2>/dev/null || true
    fi
    rm -f "$DEV_BACKEND_PID"
fi

if [ -f "$DEV_FRONTEND_PID" ]; then
    PID=$(cat "$DEV_FRONTEND_PID")
    if kill -0 "$PID" 2>/dev/null; then
        echo -e "${YELLOW}🛑 開発フロントエンドを停止中... (PID: $PID)${NC}"
        kill "$PID" 2>/dev/null || true
    fi
    rm -f "$DEV_FRONTEND_PID"
fi

# Stop production services
PROD_BACKEND_PID="$PROJECT_ROOT/logs/production/backend.pid"
PROD_FRONTEND_PID="$PROJECT_ROOT/logs/production/frontend.pid"

if [ -f "$PROD_BACKEND_PID" ]; then
    PID=$(cat "$PROD_BACKEND_PID")
    if kill -0 "$PID" 2>/dev/null; then
        echo -e "${YELLOW}🛑 本番バックエンドを停止中... (PID: $PID)${NC}"
        kill "$PID" 2>/dev/null || true
    fi
    rm -f "$PROD_BACKEND_PID"
fi

if [ -f "$PROD_FRONTEND_PID" ]; then
    PID=$(cat "$PROD_FRONTEND_PID")
    if kill -0 "$PID" 2>/dev/null; then
        echo -e "${YELLOW}🛑 本番フロントエンドを停止中... (PID: $PID)${NC}"
        kill "$PID" 2>/dev/null || true
    fi
    rm -f "$PROD_FRONTEND_PID"
fi

# Kill any remaining uvicorn/python processes on our ports
for PORT in 8000 8080 8443 443; do
    PID=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
        echo -e "${YELLOW}🛑 ポート $PORT を使用中のプロセスを停止中... (PID: $PID)${NC}"
        kill "$PID" 2>/dev/null || true
    fi
done

echo ""
echo -e "${GREEN}✅ 全サービスを停止しました${NC}"
echo ""
