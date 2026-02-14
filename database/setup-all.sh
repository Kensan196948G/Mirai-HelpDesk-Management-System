#!/usr/bin/env bash

# Mirai HelpDesk データベースセットアップスクリプト
# PostgreSQL 14+ 必須

set -e  # エラー時に即座に終了

DB_USER="postgres"
DB_NAME="mirai_helpdesk"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Mirai HelpDesk データベースセットアップ"
echo "=========================================="

# PostgreSQLが起動しているか確認
echo "1. PostgreSQLサーバー接続確認..."
if ! command -v psql &> /dev/null; then
    echo "エラー: psql コマンドが見つかりません。PostgreSQLをインストールしてください。"
    exit 1
fi

# データベースが存在するか確認
echo "2. データベース存在確認..."
DB_EXISTS=$(psql -U $DB_USER -lqt | cut -d \| -f 1 | grep -w $DB_NAME | wc -l)

if [ $DB_EXISTS -eq 0 ]; then
    echo "   データベース '$DB_NAME' が存在しません。作成します..."
    createdb -U $DB_USER $DB_NAME
    echo "   ✓ データベース作成完了"
else
    echo "   ✓ データベース '$DB_NAME' は既に存在します"
    read -p "   既存のデータベースをリセットしますか？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "   データベースを削除して再作成します..."
        dropdb -U $DB_USER $DB_NAME
        createdb -U $DB_USER $DB_NAME
        echo "   ✓ データベースリセット完了"
    else
        echo "   既存のデータベースを使用します"
    fi
fi

# pgvector拡張のインストール（AI機能用）
echo "3. PostgreSQL拡張のインストール..."
psql -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>&1 | grep -v "NOTICE" || true
psql -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>&1 | grep -v "NOTICE" || true
echo "   ✓ 拡張インストール完了"

# マイグレーション実行
echo "4. マイグレーション実行..."
cd "$SCRIPT_DIR"

MIGRATION_FILES=(
    "001_create_users.sql"
    "002_create_categories_and_sla.sql"
    "003_create_tickets.sql"
    "004_create_ticket_comments.sql"
    "005_create_ticket_attachments.sql"
    "006_create_ticket_history.sql"
    "007_create_approvals.sql"
    "008_create_m365_tasks.sql"
    "009_create_m365_execution_logs.sql"
    "010_create_knowledge_articles.sql"
    "011_create_indexes_and_seeds.sql"
    "012_create_ai_predictions.sql"
    "013_add_vector_search.sql"
    "014_add_ai_routing_logs.sql"
    "015_add_ai_metrics_cache.sql"
    "016_fix_trigger_and_seed.sql"
    "017_knowledge_vector_search.sql"
)

for migration in "${MIGRATION_FILES[@]}"; do
    migration_path="migrations/$migration"
    if [ -f "$migration_path" ]; then
        echo "   実行中: $migration"
        psql -U $DB_USER -d $DB_NAME -f "$migration_path" > /dev/null 2>&1 || {
            echo "   ⚠ 警告: $migration の実行でエラーが発生しました（既に実行済みの可能性）"
        }
    else
        echo "   ⚠ スキップ: $migration (ファイルが見つかりません)"
    fi
done

echo "   ✓ マイグレーション完了"

# シードデータ（オプション）
echo "5. シードデータ投入（オプション）..."
if [ -f "seed-minimal.sql" ]; then
    read -p "   最小限のシードデータを投入しますか？ (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        psql -U $DB_USER -d $DB_NAME -f "seed-minimal.sql" > /dev/null 2>&1
        echo "   ✓ シードデータ投入完了"
    else
        echo "   スキップしました"
    fi
else
    echo "   seed-minimal.sql が見つかりません"
fi

# データベース接続テスト
echo "6. データベース接続テスト..."
USER_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
echo "   ユーザー数: $USER_COUNT"

TICKET_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM tickets;" 2>/dev/null || echo "0")
echo "   チケット数: $TICKET_COUNT"

echo ""
echo "=========================================="
echo "✓ データベースセットアップ完了！"
echo "=========================================="
echo ""
echo "デフォルトユーザー（パスワード: Admin123!）:"
echo "  - admin@example.com (Manager)"
echo "  - agent@example.com (Agent)"
echo "  - operator@example.com (M365 Operator)"
echo "  - approver@example.com (Approver)"
echo "  - user@example.com (Requester)"
echo ""
echo "接続文字列:"
echo "  postgresql://postgres:postgres@localhost:5432/mirai_helpdesk"
echo ""
