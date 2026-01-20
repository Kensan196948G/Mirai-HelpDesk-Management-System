#!/bin/bash

# Mirai HelpDesk - E2E Test Runner
# このスクリプトはバックエンド、フロントエンドを起動してE2Eテストを実行します

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Mirai HelpDesk - E2E Test Runner${NC}"
echo -e "${GREEN}========================================${NC}"

# プロジェクトルートディレクトリ
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# クリーンアップ関数
cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"

    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        echo "Stopping backend server (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
    fi

    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "Stopping frontend server (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi

    echo -e "${GREEN}Cleanup complete.${NC}"
}

# エラー時とスクリプト終了時にクリーンアップ
trap cleanup EXIT ERR INT TERM

# 1. 依存関係のチェック
echo -e "\n${YELLOW}[1/6] Checking dependencies...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python is not installed${NC}"
    exit 1
fi

PYTHON_CMD=$(command -v python3 || command -v python)

echo "Node.js: $(node --version)"
echo "Python: $($PYTHON_CMD --version)"

# 2. データベースの初期化
echo -e "\n${YELLOW}[2/6] Initializing test database...${NC}"
cd "$PROJECT_ROOT/backend"

# テスト用データディレクトリ作成
mkdir -p data

# SLAデータのシード
if [ -f "seed_sla.py" ]; then
    echo "Seeding SLA policies..."
    $PYTHON_CMD seed_sla.py
else
    echo -e "${YELLOW}Warning: seed_sla.py not found, skipping...${NC}"
fi

# 3. バックエンドサーバーの起動
echo -e "\n${YELLOW}[3/6] Starting backend server...${NC}"
cd "$PROJECT_ROOT/backend"

export DATABASE_URL="sqlite:///./data/test.db"
export ENVIRONMENT="test"
export DEBUG="true"
export SECRET_KEY="test-secret-key-for-e2e"

$PYTHON_CMD -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > ../logs/backend-test.log 2>&1 &
BACKEND_PID=$!

echo "Backend server started (PID: $BACKEND_PID)"
sleep 3

# ヘルスチェック
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -sf http://127.0.0.1:8000/health > /dev/null; then
        echo -e "${GREEN}Backend is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Error: Backend failed to start${NC}"
        cat ../logs/backend-test.log
        exit 1
    fi
    sleep 1
done

# 4. フロントエンドサーバーの起動
echo -e "\n${YELLOW}[4/6] Starting frontend server...${NC}"
cd "$PROJECT_ROOT/frontend"

$PYTHON_CMD -m http.server 8080 > ../logs/frontend-test.log 2>&1 &
FRONTEND_PID=$!

echo "Frontend server started (PID: $FRONTEND_PID)"
sleep 2

# ヘルスチェック
echo "Waiting for frontend to be ready..."
for i in {1..15}; do
    if curl -sf http://127.0.0.1:8080 > /dev/null; then
        echo -e "${GREEN}Frontend is ready!${NC}"
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "${RED}Error: Frontend failed to start${NC}"
        cat ../logs/frontend-test.log
        exit 1
    fi
    sleep 1
done

# 5. Playwrightテストの実行
echo -e "\n${YELLOW}[5/6] Running Playwright E2E tests...${NC}"
cd "$PROJECT_ROOT"

export API_BASE_URL="http://127.0.0.1:8000"
export FRONTEND_URL="http://127.0.0.1:8080"

# Playwright browsers のインストール確認
if [ ! -d "$HOME/.cache/ms-playwright" ] && [ ! -d "$HOME/Library/Caches/ms-playwright" ]; then
    echo "Installing Playwright browsers..."
    npx playwright install
fi

# テスト実行
npm run test:e2e

TEST_EXIT_CODE=$?

# 6. レポート表示
echo -e "\n${YELLOW}[6/6] Test execution complete!${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
else
    echo -e "${RED}✗ Some tests failed (exit code: $TEST_EXIT_CODE)${NC}"
fi

echo -e "\n${YELLOW}View test report:${NC}"
echo "  npx playwright show-report"

echo -e "\n${YELLOW}Logs location:${NC}"
echo "  Backend:  $PROJECT_ROOT/logs/backend-test.log"
echo "  Frontend: $PROJECT_ROOT/logs/frontend-test.log"

exit $TEST_EXIT_CODE
