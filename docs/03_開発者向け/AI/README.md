# AI機能開発者ガイド

Mirai-HelpDesk-Management-SystemのAI機能に関する包括的な開発者向けドキュメントです。

## 📚 目次

1. [AI機能概要](./01_AI機能概要.md) - アーキテクチャ、5つのユースケース
2. [モデル設定ガイド](./02_モデル設定ガイド.md) - Claude Sonnet 4.5 設定
3. [プロンプトエンジニアリング](./03_プロンプトエンジニアリング.md) - プロンプト最適化手法
4. [API仕様](./04_API仕様.md) - 全エンドポイント、サンプルコード
5. [精度改善ガイド](./05_精度改善ガイド.md) - フィードバックループ、チューニング
6. [トラブルシューティング](./06_トラブルシューティング.md) - よくある問題と解決策
7. [ベクトル検索実装ガイド](./07_ベクトル検索実装ガイド.md) - pgvector, 埋め込み生成
8. [パフォーマンスチューニング](./08_パフォーマンスチューニング.md) - キャッシング、バッチ処理

---

## 🚀 クイックスタート

### 1. 環境変数の設定

```bash
# backend/.env
CLAUDE_API_KEY=sk-ant-xxxxx  # Anthropic APIキー
CLAUDE_MODEL=claude-sonnet-4-5-20250929
CLAUDE_MAX_TOKENS=8192
AI_ENABLED=true
REDIS_URL=redis://localhost:6379
```

### 2. 依存関係のインストール

```bash
cd backend
npm install
```

### 3. マイグレーション実行

```bash
npm run migrate
# 013_add_vector_search.sql
# 014_add_ai_routing_logs.sql
# 015_add_ai_metrics_cache.sql
```

### 4. テスト実行

```bash
# 単体テスト
npm test

# AI機能のテスト
npm run test -- ai.service.test.ts
```

---

## 💡 主要機能

### 1. チケット自動分類（Ticket Classification）

**目的:** チケット作成時に、カテゴリ・優先度・影響度・緊急度・担当者を自動提案

**エンドポイント:** `POST /api/ai/classify-ticket`

**削減時間:** 3-5分 → 数秒（90-95%削減）

**精度目標:** 90%以上

**使用例:**
```typescript
const result = await AIService.classifyTicket({
  subject: "Outlookで添付ファイルが送信できない",
  description: "5MBのPDFファイルを送信しようとするとエラーになります",
  requester_id: "user-uuid"
});
// → { predictions: { category, priority, impact, urgency, assignee } }
```

### 2. サービス要求ルーティング（Service Request Routing）

**目的:** 承認必要性を自動検出し、適切な担当者にアサイン

**エンドポイント:** `POST /api/ai/route-ticket`

**削減時間:** 5分 → 10秒（97%削減）

**精度目標:** 95%以上

**使用例:**
```typescript
const result = await AIRoutingService.routeServiceRequest({
  type: "service_request",
  subject: "Microsoft 365 E5ライセンス追加",
  description: "新入社員用にE5ライセンスを5つ追加したい",
  category_id: "license-category-uuid",
  requester_id: "user-uuid"
});
// → { routing: { requires_approval, suggested_approver, suggested_assignee } }
```

### 3. 優先度自動判定（Priority Calculation）

**目的:** Impact × Urgency から P1-P4 を自動計算

**削減時間:** 2-3分 → 即時（100%削減）

**精度目標:** 85%以上

### 4. 類似チケット検索（Similar Ticket Search）

**目的:** ベクトル検索により、過去の類似チケットから最適解を推測

**エンドポイント:** `POST /api/ai/search-similar-tickets`

**削減時間:** 10-15分 → 数秒（95-98%削減）

**精度目標:** 類似度 0.8以上のチケットを5件以内に発見

**使用例:**
```typescript
const result = await VectorSearchService.searchSimilarTickets({
  query: "Outlookで添付ファイルが送信できない",
  limit: 5,
  min_similarity: 0.7
});
// → { similar_tickets: [{ ticket_id, similarity_score, resolution_summary }] }
```

### 5. 監査レポート自動生成（Audit Report Generation）

**目的:** AI精度メトリクスを自動集計し、月次レポートを生成

**エンドポイント:** `POST /api/ai/generate-report`

**削減時間:** 1時間 → 5分（92%削減）

**出力形式:** JSON, CSV, PDF

---

## 🏗️ アーキテクチャ概要

### コンポーネント図

```
┌─────────────────────────────────────────┐
│        フロントエンド（React）           │
│  AIClassificationWidget                  │
│  AIRoutingWidget                         │
│  AISimilarTicketsWidget                  │
│  AIAnswerSuggestion                      │
│  AIMetricsDashboard                      │
└───────────────┬─────────────────────────┘
                │ HTTP REST API
┌───────────────▼─────────────────────────┐
│        バックエンド（Express）           │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │ AI Routes (ai.routes.ts)        │    │
│  └──────────────┬──────────────────┘    │
│                 │                        │
│  ┌──────────────▼──────────────────┐    │
│  │ AI Controller (ai.controller.ts)│    │
│  └──────────────┬──────────────────┘    │
│                 │                        │
│  ┌──────────────▼──────────────────┐    │
│  │ AI Services                     │    │
│  │ - AIService                     │    │
│  │ - AIRoutingService              │    │
│  │ - VectorSearchService           │    │
│  │ - AIAnalyticsService            │    │
│  └──────────────┬──────────────────┘    │
│                 │                        │
│  ┌──────────────▼──────────────────┐    │
│  │ Claude API Client               │    │
│  │ - キャッシング（Redis）          │    │
│  │ - レート制限                     │    │
│  │ - PII マスキング                │    │
│  └──────────────┬──────────────────┘    │
└─────────────────┼─────────────────────────┘
                  │
┌─────────────────▼─────────────────────────┐
│      Claude API (Anthropic)               │
│  Model: claude-sonnet-4-5-20250929       │
│  Context: 1M tokens                       │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│        データベース（PostgreSQL）          │
│  - tickets                                │
│  - ticket_embeddings (pgvector)           │
│  - ai_predictions                         │
│  - ai_routing_logs                        │
│  - ai_metrics_cache                       │
└───────────────────────────────────────────┘
```

### データフロー（チケット分類）

```
1. ユーザー入力
   ↓
2. フロントエンド (AIClassificationWidget)
   ↓ POST /api/ai/classify-ticket
3. バックエンド (AIController.classifyTicket)
   ↓
4. PII マスキング (PIIMasking.maskForAI)
   ↓
5. DB取得（カテゴリ一覧、類似チケット）
   ↓
6. プロンプト生成（promptTemplates.ticketClassification）
   ↓
7. Claude API 呼び出し（ClaudeAPIClient.sendPrompt）
   ↓
8. レスポンスパース（JSON抽出）
   ↓
9. DB保存（ai_predictions テーブル）
   ↓
10. 監査ログ記録（ticket_history）
   ↓
11. レスポンス返却
   ↓
12. フロントエンド表示（信頼度バッジ、採用/却下ボタン）
```

---

## 🔐 セキュリティとコンプライアンス

### PII（個人情報）マスキング

すべてのAI送信前に、以下の個人情報を自動でマスキング：

- **メールアドレス** → `[EMAIL_MASKED]`
- **電話番号** → `[PHONE_MASKED]`
- **パブリックIPアドレス** → `[IP_MASKED]`

実装: `backend/src/utils/pii-masking.ts`

### 監査証跡

すべてのAI操作は以下のテーブルに記録：

1. **ai_predictions** - AI予測履歴（追記専用）
2. **ticket_history** - 操作履歴（追記専用）
3. **ai_routing_logs** - ルーティング判定履歴
4. **ai_metrics_cache** - 精度メトリクス

### レート制限

- **デフォルト:** 10回/分/ユーザー
- **実装:** Redis ベースのトークンバケット
- **設定:** `AI_RATE_LIMIT_PER_USER` 環境変数

---

## 📊 パフォーマンス目標

| 機能 | 目標レスポンスタイム | 実測値 |
|------|---------------------|--------|
| チケット分類 | 3秒以内（p90） | - |
| ルーティング判定 | 2秒以内（p90） | - |
| 類似チケット検索 | 1秒以内（p90） | - |
| レポート生成 | 5秒以内 | - |

---

## 🧪 テスト戦略

### 単体テスト

```bash
# AI Service のテスト
npm run test -- ai.service.test.ts

# ルーティング Service のテスト
npm run test -- ai-routing.service.test.ts
```

### 統合テスト

```bash
# AI Controller の統合テスト
npm run test -- ai.controller.integration.test.ts
```

### E2Eテスト

```bash
# Playwright E2E テスト
npx playwright test tests/e2e/ai-features.spec.js
```

### 精度検証

```bash
# 過去チケットデータで精度を測定
node scripts/validate-ai-accuracy.ts
```

---

## 🐛 トラブルシューティング

### よくある問題

#### 1. Claude API 認証エラー

**エラー:**
```
Claude API 認証エラー: APIキーが無効です
```

**解決策:**
- `backend/.env` の `CLAUDE_API_KEY` を確認
- Anthropic Console で APIキーの有効性を確認

#### 2. レート制限超過

**エラー:**
```
AI機能のリクエスト制限（10回/分）を超えました
```

**解決策:**
- Redis が正常に動作しているか確認
- `AI_RATE_LIMIT_PER_USER` 環境変数で制限を緩和

#### 3. ベクトル検索が遅い

**問題:** 類似チケット検索が 5秒以上かかる

**解決策:**
- HNSW インデックスが正しく作成されているか確認
  ```sql
  SELECT indexname FROM pg_indexes WHERE tablename = 'ticket_embeddings';
  ```
- VACUUM を実行
  ```sql
  VACUUM ANALYZE ticket_embeddings;
  ```

---

## 💰 コスト管理

### Claude API コスト見積もり

**Sonnet 4.5 料金（2026年2月時点）:**
- Input: $3.00 per million tokens
- Output: $15.00 per million tokens

**月次使用量見積もり（社員300名想定）:**
- 合計: 約1.85M input + 0.5M output = **$11.55/月**
- 年間: **$140**

### コスト削減策

1. **キャッシング:**
   - Redis キャッシュで同一リクエストの重複呼び出しを防止
   - デフォルトTTL: 3600秒（1時間）

2. **プロンプト最適化:**
   - 不要なコンテキストを削減
   - Few-shot Examples を最小限に

3. **バッチ処理:**
   - 埋め込みベクトル生成は夜間バッチで実行

---

## 📈 成功指標（KPI）

### 精度メトリクス

| 機能 | 目標精度 | 測定方法 |
|------|---------|---------|
| カテゴリ分類 | 90%以上 | `was_accepted = true` の割合 |
| ルーティング判定 | 95%以上 | 実際の担当者との一致率 |
| 優先度判定 | 85%以上 | 実際の優先度との一致率 |
| 類似チケット検索 | 80%以上 | ユーザー評価（5段階）の平均4.0以上 |

### ビジネスメトリクス

| 指標 | 目標値 | 測定方法 |
|------|--------|---------|
| チケット処理時間削減 | 30%削減 | 平均解決時間の比較 |
| SLA達成率向上 | +10% | SLA違反率の比較 |
| 利用者満足度 | 4.5/5.0以上 | チケット解決後のアンケート |
| Agent生産性向上 | +25% | 処理チケット数/日の比較 |

---

## 🔗 関連リソース

- [Anthropic Claude API ドキュメント](https://docs.anthropic.com/)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [CLAUDE.md](../../../CLAUDE.md) - プロジェクト要件
- [API仕様書](../API仕様書.md) - REST API 全体

---

## 📞 サポート

- **Issue報告:** GitHub Issues
- **質問:** Slack #helpdesk-dev
- **緊急連絡:** IT Manager

---

**最終更新:** 2026年2月
**バージョン:** 1.0.0
