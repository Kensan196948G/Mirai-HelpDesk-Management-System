#!/bin/bash

# Ant Design の bordered 非推奨警告を修正するスクリプト

echo "🔧 Ant Design bordered プロパティを variant に変更中..."

FILES=(
  "frontend/src/pages/tickets/TicketDetail.tsx"
  "frontend/src/pages/Login.tsx"
  "frontend/src/pages/AuditLogs.tsx"
  "frontend/src/pages/Dashboard.tsx"
  "frontend/src/pages/Profile.tsx"
  "frontend/src/components/Charts/PriorityBarChart.tsx"
  "frontend/src/components/Charts/SLADonutChart.tsx"
  "frontend/src/components/Charts/TicketTrendChart.tsx"
  "frontend/src/components/ai/AIClassificationWidget.tsx"
  "frontend/src/components/ai/AISmartSearch.tsx"
)

CHANGES=0

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  処理中: $file"

    # bordered={false} → variant="borderless" に変更
    if grep -q 'bordered={false}' "$file"; then
      sed -i 's/bordered={false}/variant="borderless"/g' "$file"
      echo "    ✓ bordered={false} → variant=\"borderless\""
      ((CHANGES++))
    fi

    # bordered={true} → 削除（デフォルトが outlined なので不要）
    if grep -q 'bordered={true}' "$file"; then
      sed -i 's/bordered={true}//g' "$file"
      echo "    ✓ bordered={true} → 削除"
      ((CHANGES++))
    fi

    # bordered → 削除
    if grep -qE '\sborrdered\s*[^=]' "$file"; then
      sed -i 's/\sborrdered\s*//g' "$file"
      echo "    ✓ bordered → 削除"
      ((CHANGES++))
    fi
  fi
done

echo ""
echo "✅ 完了: $CHANGES 個のファイルを修正しました"
