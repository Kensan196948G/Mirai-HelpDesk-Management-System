# Mirai ヘルプデスク管理システム - 開発ロードマップ

**最終更新**: 2026-02-12
**現在のフェーズ**: Phase 2.5完了 → Phase 3準備中
**最新コミット**: 203a4e6

---

## 📊 現在の状況（2026-02-12時点）

### 全体達成度

| フェーズ | 達成率 | 状態 |
|---------|--------|------|
| **Phase 1 (MVP)** | 100% | ✅ 完了 |
| **Phase 2 (M365連携)** | 95% | ✅ ほぼ完了 |
| **Phase 2.5 (AI拡張)** | 100% | ✅ 完了 |
| **Phase 3 (自動化)** | 30% | ⚠️ 開発中 |
| **総合達成度** | **88%** | 🟢 本番投入可能 |

### テスト状況

| テスト種別 | 合格 | 失敗 | スキップ | 成功率 |
|-----------|------|------|---------|--------|
| **E2E (Playwright)** | 223 | 11 | 2 | **95.3%** |
| **Unit (Jest)** | 141 | 0 | 0 | 100% |
| **合計** | 364 | 11 | 2 | **97.1%** |

### コードベース規模

| カテゴリ | ファイル数 | 行数 |
|---------|-----------|------|
| Backend (TypeScript) | 63 | 14,958 |
| Frontend (React/TypeScript) | 55 | 12,784 |
| Database (SQL) | 18 | 1,687 |
| Tests (E2E) | 23 | 6,145 |
| **合計** | **159** | **35,574** |

---

## 🎯 Week 1: 緊急対応（完了済み） ✅

**期間**: 2026-02-12（1日）
**達成**: E2Eテスト 82% → 95.3%（+13.3%）

### 完了した作業

| # | タスク | ファイル | 状態 |
|---|--------|---------|------|
| 1 | マイグレーション依存関係修正 | 3 SQLファイル | ✅ |
| 2 | チケット作成API 500エラー修正 | ticket.controller.ts | ✅ |
| 3 | 優先度フィルタ 500エラー修正 | ticket.controller.ts | ✅ |
| 4 | NotificationBellクラッシュ修正 | NotificationBell.tsx | ✅ |
| 5 | ID属性追加（7ページ） | 7 TSXファイル | ✅ |
| 6 | E2Eテスト改善 | helpers.js, ai-features.spec.js | ✅ |

### 解消したエラー

- ✅ NotificationBellクラッシュ（30件）
- ✅ チケット作成API 500エラー
- ✅ 優先度フィルタ 500エラー

---

## 🚀 Week 2: 残課題解決 + Redis統合

**期間**: 2026-02-13 〜 2026-02-19（1週間）
**目標**: E2Eテスト 100%達成 + Redis統合完了

### Day 1-2: 残課題の完全解消

| # | タスク | 詳細 | 工数 | 優先度 |
|---|--------|------|------|--------|
| 1 | チケット詳細ページエラー11件修正 | Vite設定最適化、キャッシュクリア | 0.5日 | 🔴 高 |
| 2 | Playwright webServer設定調整 | playwright.config.js最適化 | 0.5日 | 🟡 中 |
| 3 | E2Eテスト 100%達成検証 | 全233テスト成功確認 | 0.5日 | 🔴 高 |

**成果目標**: E2Eテスト成功率 95.3% → 100%（+4.7%）

### Day 3-5: Redis統合

| # | タスク | 詳細 | 工数 | 優先度 |
|---|--------|------|------|--------|
| 4 | Redis Docker構成 | docker-compose.yml作成 | 0.5日 | 🔴 高 |
| 5 | レート制限Redis移行 | rate-limiter-flexible導入 | 1日 | 🔴 高 |
| 6 | WebSocketセッション管理 | socket.io-redis導入 | 1日 | 🟡 中 |
| 7 | Redis接続設定 | .env設定、接続プール最適化 | 0.5日 | 🟡 中 |

**成果目標**: Redis統合完了、レート制限強化

**必要なパッケージ**:
```bash
npm install --save rate-limiter-flexible socket.io-redis ioredis
```

**docker-compose.yml構成**:
```yaml
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

### Day 6-7: AIサービステスト

| # | タスク | 詳細 | 工数 | 優先度 |
|---|--------|------|------|--------|
| 8 | AIサービス基本ユニットテスト | 5サービス × 3テストケース | 2日 | 🔴 高 |
| 9 | Embedding/Vector-Searchテスト | pgvector検索精度テスト | 0.5日 | 🟡 中 |
| 10 | AIサービスカバレッジ80%達成 | Jest coverage確認 | 0.5日 | 🟡 中 |

**成果目標**: ユニットテストカバレッジ 70% → 85%

**テストファイル作成**:
- `backend/src/services/__tests__/ai.service.test.ts`
- `backend/src/services/__tests__/embedding.service.test.ts`
- `backend/src/services/__tests__/vector-search.service.test.ts`

---

## 🏗️ Week 3-4: Phase 3開発（自動化）

**期間**: 2026-02-20 〜 2026-03-05（2週間）
**目標**: 承認済み標準作業の自動実行機能完成

### Week 3: コア機能開発

| # | タスク | 詳細 | 工数 | 優先度 |
|---|--------|------|------|--------|
| 11 | M365AutomationService作成 | 自動実行エンジン実装 | 3日 | 🔴 高 |
| 12 | Graph API自動呼び出し | executeApprovedTask()メソッド | 2日 | 🔴 高 |
| 13 | エラーハンドリング・リトライ | 障害時の再試行ロジック | 1日 | 🔴 高 |
| 14 | 実施ログ自動記録 | m365_execution_logs自動生成 | 1日 | 🔴 高 |

**並行作業（1名）**:
- 監視システム構築（Prometheus + Grafana）
- console.log → logger置換（140箇所）

### Week 4: テスト・統合

| # | タスク | 詳細 | 工数 | 優先度 |
|---|--------|------|------|--------|
| 15 | Phase 3 E2Eテスト作成 | 自動実行フローテスト | 2日 | 🔴 高 |
| 16 | Phase 3ユニットテスト | M365AutomationService | 1日 | 🔴 高 |
| 17 | 統合テスト | 承認→自動実行→監査証跡 | 2日 | 🔴 高 |
| 18 | パフォーマンステスト | 1000件処理テスト | 1日 | 🟡 中 |

**並行作業（1名）**:
- 全ユニットテスト完成（残り15サービス）
- CI/CD最適化（ビルド時間短縮）

---

## 🔧 Week 5-6: 品質向上・監視強化

**期間**: 2026-03-06 〜 2026-03-19（2週間）
**目標**: 運用成熟度 62% → 88%

### Week 5: 実装品質向上

| # | タスク | 詳細 | 工数 | 優先度 |
|---|--------|------|------|--------|
| 19 | console.log → logger置換 | 140箇所の完全置換 | 1日 | 🟡 中 |
| 20 | TypeScript any型削除 | コントローラー・モデル層（40箇所） | 2日 | 🟡 中 |
| 21 | SELECT * 最適化 | 明示的カラム指定 | 1日 | 🟢 低 |
| 22 | ESLint設定強化 | no-console, no-explicit-any追加 | 0.5日 | 🟡 中 |

**成果目標**: コード品質スコア 78 → 88（+10）

### Week 6: 監視・運用強化

| # | タスク | 詳細 | 工数 | 優先度 |
|---|--------|------|------|--------|
| 23 | Prometheus + Grafana構築 | メトリクス収集・ダッシュボード | 3日 | 🔴 高 |
| 24 | アラート設定 | SLA違反、エラー率アラート | 1日 | 🔴 高 |
| 25 | ログローテーション | winston-daily-rotate-file導入 | 0.5日 | 🟡 中 |
| 26 | DB接続プール最適化 | max: 20 → 50、timeout調整 | 0.5日 | 🟡 中 |
| 27 | CI/CDパイプライン最適化 | キャッシュ戦略、並列実行 | 1日 | 🟡 中 |

**成果目標**: 運用成熟度スコア 62 → 88（+26）

---

## 🎯 Week 7-8: 統合テスト・本番準備

**期間**: 2026-03-20 〜 2026-03-31（2週間）
**目標**: 本番環境リリース準備完了

### Week 7: 統合テスト

| # | タスク | 詳細 | 工数 | 優先度 |
|---|--------|------|------|--------|
| 28 | Phase 3完全フローE2E | 承認→自動実行→監査証跡 | 2日 | 🔴 高 |
| 29 | 大量データ処理テスト | 1000件チケット処理 | 2日 | 🟡 中 |
| 30 | 並行処理テスト | 同時アクセステスト | 1日 | 🟡 中 |
| 31 | セキュリティスキャン | Trivy, Snyk実行 | 1日 | 🔴 高 |

### Week 8: 本番準備

| # | タスク | 詳細 | 工数 | 優先度 |
|---|--------|------|------|--------|
| 32 | 本番環境設定 | .env.production作成 | 1日 | 🔴 高 |
| 33 | データベースバックアップ設定 | pg_dump自動化 | 1日 | 🔴 高 |
| 34 | デプロイ手順書作成 | 運用ドキュメント整備 | 2日 | 🔴 高 |
| 35 | 負荷テスト | 同時100ユーザーテスト | 1日 | 🟡 中 |
| 36 | 最終レビュー | セキュリティ・パフォーマンス | 1日 | 🔴 高 |

**成果目標**: 本番環境リリース準備完了

---

## 📋 フェーズ別タスク一覧（詳細版）

### Phase 3.1: 基盤強化（Week 2）

#### タスク1: チケット詳細ページエラー11件修正

**現状**:
- E2Eテスト: 223合格 / 11失敗（95.3%）
- 全失敗がチケット詳細ページ関連

**原因仮説**:
1. Vite HMR/キャッシュ問題
2. TicketDetailコンポーネントの深い問題
3. チケットAPIレスポンスの問題

**修正手順**:
```bash
# 1. Viteキャッシュ完全クリア
rm -rf frontend/node_modules/.vite
rm -rf frontend/.vite

# 2. フロントエンド完全再起動
pkill -9 -f vite
cd frontend && npm run dev

# 3. E2Eテスト再実行
npx playwright test tests/e2e/tickets.spec.js

# 4. 失敗テストのスクリーンショット分析
find test-results/ -name "test-failed-1.png" -mtime -1
```

**検証基準**:
- ✅ E2Eテスト 100%成功（233テスト全合格）
- ✅ チケット詳細ページが正常表示

---

#### タスク2-3: Playwright設定最適化

**修正ファイル**: `playwright.config.js`

**問題**:
- webServer設定がViteを自動起動（82-101行目）
- reuseExistingServerがキャッシュを保持

**修正案**:
```javascript
// オプション1: CI環境のみwebServer使用
webServer: process.env.CI ? [
  { command: 'cd backend && npm run dev', url: 'http://127.0.0.1:8000/health', ... },
  { command: 'cd frontend && npm run build && npx serve -s dist -l 8080', url: 'http://127.0.0.1:8080', ... }
] : undefined,

// オプション2: reuseExistingServerをfalseに
webServer: [
  { ..., reuseExistingServer: !process.env.FORCE_RESTART, ... }
]
```

---

#### タスク4-7: Redis統合

**目的**: レート制限強化、WebSocketスケーリング対応

**実装手順**:

1. **docker-compose.yml作成**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: mirai_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: mirai_helpdesk
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  postgres-data:
  redis-data:
```

2. **レート制限Redis移行**
```typescript
// backend/src/middleware/rateLimit.ts
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export const createRateLimiter = (options: RateLimiterOptions) => {
  return new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: options.keyPrefix,
    points: options.maxRequests,
    duration: options.windowMs / 1000,
  });
};
```

3. **WebSocketセッション管理**
```typescript
// backend/src/websocket/socketServer.ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```

**検証基準**:
- ✅ docker-compose up で全サービス起動
- ✅ レート制限がRedisベースで動作
- ✅ WebSocketが複数インスタンスで動作

---

#### タスク8-10: AIサービステスト

**テストファイル作成**:

```typescript
// backend/src/services/__tests__/ai.service.test.ts
import { AIService } from '../ai.service';

describe('AIService', () => {
  describe('classifyTicket', () => {
    it('正常なチケット分類', async () => {
      const result = await AIService.classifyTicket({
        subject: 'Outlookでメールが送信できません',
        description: '添付ファイル付きメールが送信できません',
        ticket_id: 'test-uuid',
      });

      expect(result.predictions).toBeDefined();
      expect(result.predictions.length).toBeGreaterThan(0);
      expect(result.predictions[0].category).toBeTruthy();
    });

    it('Claude APIエラー時のフォールバック', async () => {
      // Claudeクライアントをモック化してエラーをスロー
      // フォールバック処理を検証
    });

    it('タイムアウト時の処理', async () => {
      // タイムアウトシミュレーション
      // エラーハンドリングを検証
    });
  });
});
```

**モック戦略**:
- Claude/Gemini API呼び出し: `jest.mock()`
- データベース操作: テストDB使用

---

### Phase 3.2: 自動化機能開発（Week 3-4）

#### タスク11-14: M365自動実行エンジン

**新規ファイル作成**:

1. **backend/src/services/m365-automation.service.ts**
```typescript
export class M365AutomationService {
  /**
   * 承認済みタスクの自動実行
   */
  static async executeApprovedTask(taskId: string, operatorId: string): Promise<ExecutionResult> {
    // 1. タスク承認状態確認
    const task = await M365TaskModel.findById(taskId);
    if (task.state !== 'approved') {
      throw new AppError('Task not approved', 400);
    }

    // 2. SOD検証（承認者 ≠ 実施者）
    await ApprovalService.validateSOD(task.approval_id, operatorId);

    // 3. Graph API自動呼び出し
    const result = await this.executeGraphAPITask(task);

    // 4. 実施ログ自動記録
    await M365ExecutionLogModel.create({
      task_id: taskId,
      operator_id: operatorId,
      method: 'graph_api',
      result: result.success ? 'success' : 'failed',
      graph_api_response: result.response,
      ...
    });

    return result;
  }

  private static async executeGraphAPITask(task: M365Task) {
    switch (task.task_type) {
      case 'add_user_to_group':
        return await this.addUserToGroup(task);
      case 'assign_license':
        return await this.assignLicense(task);
      // ... 他のタスクタイプ
    }
  }
}
```

2. **backend/src/controllers/m365-automation.controller.ts**
```typescript
export const executeTask = asyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const operatorId = req.user!.user_id;

  // 自動実行
  const result = await M365AutomationService.executeApprovedTask(taskId, operatorId);

  res.status(200).json({
    success: true,
    data: result,
  });
});
```

**検証基準**:
- ✅ 承認済みタスクのみ実行可能
- ✅ SOD検証が機能
- ✅ 実施ログが自動記録
- ✅ エラー時のロールバック

---

#### タスク15-18: Phase 3テスト

**E2Eテスト例**:
```javascript
// tests/e2e/m365-automation.spec.js
test.describe('M365自動実行フロー', () => {
  test('承認済みタスクの自動実行', async ({ request }) => {
    // 1. チケット作成
    const ticket = await createTicket(...);

    // 2. M365タスク作成
    const task = await createM365Task(ticket.ticket_id, ...);

    // 3. 承認依頼→承認
    const approval = await requestApproval(task.task_id, ...);
    await approveTask(approval.approval_id, ...);

    // 4. 自動実行
    const result = await executeTask(task.task_id, ...);
    expect(result.success).toBe(true);

    // 5. 実施ログ確認
    const logs = await getExecutionLogs(task.task_id);
    expect(logs.length).toBe(1);
    expect(logs[0].operator_id).toBe(operatorId);

    // 6. SOD検証
    expect(logs[0].operator_id).not.toBe(approval.approver_id);
  });
});
```

---

## 📈 スコア目標（Week 8完了時）

| 観点 | 現在 | Week 8目標 | 改善 |
|------|------|-----------|------|
| 実装品質 | 78/100 | **90/100** | +12 |
| テスト成熟度 | 70/100 | **88/100** | +18 |
| アーキテクチャ | 70/100 | **80/100** | +10 |
| セキュリティ | 78/100 | **92/100** | +14 |
| 運用成熟度 | 62/100 | **88/100** | +26 |
| **総合スコア** | **72/100** | **88/100** | **+16** |

**E2Eテスト成功率**: 95.3% → **100%**（+4.7%）
**ユニットテストカバレッジ**: 70% → **85%**（+15%）

---

## 🚫 未実装機能（Phase 4以降）

以下の機能は Phase 4（将来拡張）として位置づけます：

| # | 機能 | 優先度 | 推定工数 |
|---|------|--------|---------|
| 1 | CAB（変更諮問委員会）機能 | 低 | 3週間 |
| 2 | ITIL Problem Management | 低 | 4週間 |
| 3 | 高度な分析（予測分析・トレンド） | 低 | 2週間 |
| 4 | Kubernetesデプロイ | 中 | 2週間 |
| 5 | マルチテナント対応 | 低 | 4週間 |

---

## 📝 次回セッション開始時のチェックリスト

### 環境確認

```bash
# 1. サーバー起動
./start-dev.sh

# 2. ヘルスチェック
curl http://localhost:3000/health
curl http://localhost:3001

# 3. E2Eテスト状況確認
npx playwright test --reporter=list | tail -5

# 4. Git状況確認
git status
git log --oneline -5
```

### 推奨開始タスク

**最優先**:
1. チケット詳細ページエラー11件の完全解消
2. E2Eテスト 100%達成

**次に**:
3. Redis統合（docker-compose作成）
4. AIサービステスト実装

---

## 🔗 関連ドキュメント

- **CLAUDE.md**: プロジェクト要件・設計原則
- **MEMORY.md**: 開発履歴・技術的発見
- **README.md**: プロジェクト概要
- **docs/**: 詳細ドキュメント（60+ファイル）

---

## ⚠️ 既知の問題（Issue登録推奨）

### Issue #1: チケット詳細ページE2Eテスト失敗（11件）

**優先度**: 中
**影響**: E2Eテスト成功率 95.3%（目標: 100%）
**原因**: Vite HMR/キャッシュ問題の可能性
**推定工数**: 0.5-1日

**再現手順**:
```bash
npx playwright test tests/e2e/tickets.spec.js:270
```

**期待される動作**: `#page-content`が表示される
**実際の動作**: Timeout（白い画面）

**修正アプローチ**:
1. Vite設定最適化（vite.config.ts）
2. Playwright webServer設定調整
3. ブラウザキャッシュクリア戦略

---

### Issue #2: GitHub Token workflowスコープ不足

**優先度**: 低
**影響**: `.github/workflows/e2e.yml`の変更がプッシュ不可
**対応**: GitHub Token再発行（workflowスコープ追加）

---

## 🎓 学んだ教訓（Lessons Learned）

### 1. Agent Teamsの効果的活用

- **5エージェント並列レビュー**: 約20分で48件の問題発見
- **3エージェント並列デバッグ**: 約45分で30件のエラー解消
- **効率化**: 約3-4倍の高速化

### 2. NotificationBellクラッシュの教訓

- **単一障害点（SPOF）**: 1コンポーネントのエラーでアプリ全体がクラッシュ
- **解決策**: Error Boundary、try-catch、オプショナルレンダリング
- **検証**: E2Eテストで30件のエラーを検出

### 3. enum型の多言語対応

- **問題**: データベース（日本語）とフロントエンド（英語）のギャップ
- **解決**: マッピングテーブル実装
- **将来**: i18n（国際化）対応の基盤となる

### 4. Vite HMR/キャッシュ問題

- **問題**: 開発モードで変更が反映されない
- **解決**: 完全クリーン再起動、キャッシュクリア
- **教訓**: 本番ビルドでの検証も必要

---

## 📅 マイルストーン

| マイルストーン | 目標日 | 達成基準 |
|-------------|--------|---------|
| **Week 2完了** | 2026-02-19 | E2Eテスト100%、Redis統合完了 |
| **Week 4完了** | 2026-03-05 | Phase 3自動化完成 |
| **Week 6完了** | 2026-03-19 | 運用成熟度88%達成 |
| **Week 8完了** | 2026-03-31 | **本番環境リリース準備完了** |

---

**次回セッション**: 2026-02-13（予定）
**開始タスク**: チケット詳細ページエラー11件修正
**目標**: E2Eテスト 100%達成

---

*このドキュメントは継続的に更新されます*
