#!/bin/bash

echo "🌐 フロントエンド AI 機能 動作確認テスト"
echo "═══════════════════════════════════════════"
echo ""

FRONTEND_URL="http://localhost:3002"

# フロントエンドサーバーの確認
echo "📡 1. フロントエンドサーバー確認"
echo "─────────────────────────────────"
if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200"; then
  echo "✅ フロントエンドサーバー起動中: $FRONTEND_URL"
else
  echo "❌ フロントエンドサーバーに接続できません"
  exit 1
fi
echo ""

# AI ルートの確認
echo "📋 2. AI ルーティング確認"
echo "─────────────────────────────────"
AI_ROUTES=(
  "/ai/chat"
  "/ai/search"
  "/ai/analyze"
  "/ai/recommend"
)

for route in "${AI_ROUTES[@]}"; do
  echo -n "  $route ... "
  # React Router なので、すべてのルートは 200 を返すはず
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL$route")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ OK"
  else
    echo "❌ NG (HTTP $HTTP_CODE)"
  fi
done
echo ""

# バックエンド AI API の確認
echo "🔌 3. バックエンド AI API 接続確認"
echo "─────────────────────────────────"
BACKEND_URL="http://localhost:3000"

# ヘルスチェック
echo -n "  /health ... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ OK"
else
  echo "❌ NG (HTTP $HTTP_CODE)"
fi
echo ""

# コンポーネントファイルの確認
echo "📦 4. AI コンポーネントファイル確認"
echo "─────────────────────────────────"
COMPONENTS=(
  "src/components/ai/AIClassificationWidget.tsx"
  "src/components/ai/AIEscalationAlert.tsx"
  "src/components/ai/AIKnowledgeGenerator.tsx"
  "src/components/ai/AISentimentDashboard.tsx"
  "src/components/ai/AISmartSearch.tsx"
  "src/components/ai/AITranslationWidget.tsx"
)

cd /mnt/LinuxHDD/Mirai-HelpDesk-Management-System/frontend

for component in "${COMPONENTS[@]}"; do
  echo -n "  $(basename "$component") ... "
  if [ -f "$component" ]; then
    LINE_COUNT=$(wc -l < "$component")
    echo "✅ OK ($LINE_COUNT 行)"
  else
    echo "❌ ファイルが存在しません"
  fi
done
echo ""

# AI ページファイルの確認
echo "📄 5. AI ページファイル確認"
echo "─────────────────────────────────"
PAGES=(
  "src/pages/ai/AIChat.tsx"
  "src/pages/ai/AISearchPage.tsx"
  "src/pages/ai/AIAnalyze.tsx"
  "src/pages/ai/AIRecommend.tsx"
)

for page in "${PAGES[@]}"; do
  echo -n "  $(basename "$page") ... "
  if [ -f "$page" ]; then
    LINE_COUNT=$(wc -l < "$page")
    echo "✅ OK ($LINE_COUNT 行)"
  else
    echo "❌ ファイルが存在しません"
  fi
done
echo ""

# AI サービスファイルの確認
echo "🔧 6. AI サービス確認"
echo "─────────────────────────────────"
if [ -f "src/services/aiService.ts" ]; then
  LINE_COUNT=$(wc -l < "src/services/aiService.ts")
  echo "  ✅ aiService.ts: $LINE_COUNT 行"

  # エクスポートされた関数を確認
  echo "  📝 エクスポートされた関数:"
  grep -E "async (classifyTicket|getSuggestions|generateSummary)" src/services/aiService.ts | sed 's/^/    - /'
else
  echo "  ❌ aiService.ts が存在しません"
fi
echo ""

# AI Store 確認
echo "💾 7. AI Store 確認"
echo "─────────────────────────────────"
if [ -f "src/store/aiStore.ts" ]; then
  LINE_COUNT=$(wc -l < "src/store/aiStore.ts")
  echo "  ✅ aiStore.ts: $LINE_COUNT 行"
else
  echo "  ❌ aiStore.ts が存在しません"
fi
echo ""

echo "╔════════════════════════════════════════════╗"
echo "║  ✅ フロントエンド AI 機能確認完了          ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "🌐 アクセス URL:"
echo "  - AI チャット: $FRONTEND_URL/ai/chat"
echo "  - AI 検索: $FRONTEND_URL/ai/search"
echo "  - AI 分析: $FRONTEND_URL/ai/analyze"
echo "  - AI 推奨: $FRONTEND_URL/ai/recommend"
echo ""
