#!/usr/bin/env bash

# ============================================================================
# Mirai HelpDesk Management System - 開発環境停止スクリプト
# ============================================================================

set -e

# 色付きログ
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

log_info "Mirai HelpDesk Management System - 開発環境停止"

# バックエンド停止
if [ -f "$BACKEND_DIR/backend.pid" ]; then
    BACKEND_PID=$(cat "$BACKEND_DIR/backend.pid")
    if kill -0 $BACKEND_PID 2>/dev/null; then
        log_info "バックエンドを停止中（PID: $BACKEND_PID）..."
        kill -TERM $BACKEND_PID
        rm -f "$BACKEND_DIR/backend.pid"
        log_success "バックエンド停止完了"
    else
        log_info "バックエンドは既に停止しています"
        rm -f "$BACKEND_DIR/backend.pid"
    fi
else
    log_info "バックエンドのPIDファイルが見つかりません"
fi

# フロントエンド停止
if [ -f "$FRONTEND_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$FRONTEND_DIR/frontend.pid")
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        log_info "フロントエンドを停止中（PID: $FRONTEND_PID）..."
        kill -TERM $FRONTEND_PID
        rm -f "$FRONTEND_DIR/frontend.pid"
        log_success "フロントエンド停止完了"
    else
        log_info "フロントエンドは既に停止しています"
        rm -f "$FRONTEND_DIR/frontend.pid"
    fi
else
    log_info "フロントエンドのPIDファイルが見つかりません"
fi

log_success "すべてのサーバーを停止しました"
