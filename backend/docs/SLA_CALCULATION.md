# SLA自動計算エンジン

## 概要

SLA（Service Level Agreement）自動計算エンジンは、チケットの優先度に基づいて初動対応期限と解決期限を自動的に計算し、SLA達成状況を管理するシステムです。

## 実装ファイル

### 1. 営業時間計算ユーティリティ
**ファイル**: `backend/src/utils/business-hours.ts`

営業時間・営業日を考慮した日時計算を提供します。

#### 営業時間・営業日の定義
- **営業時間**: 9:00 - 18:00（9時間）
- **営業日**: 月曜日 - 金曜日（土日祝除く）
- **祝日**: 日本の国民の祝日（2025-2026年対応）

#### 主要メソッド

```typescript
// 営業日判定
BusinessHoursUtil.isBusinessDay(date: Date): boolean

// 営業時間判定
BusinessHoursUtil.isBusinessHour(date: Date): boolean

// 営業時間を加算
BusinessHoursUtil.addBusinessHours(startDate: Date, hours: number): Date

// 営業日を加算（1営業日 = 9時間）
BusinessHoursUtil.addBusinessDays(startDate: Date, days: number): Date

// 2つの日時間の営業時間数を計算
BusinessHoursUtil.calculateBusinessHours(startDate: Date, endDate: Date): number
```

#### 使用例

```typescript
import { BusinessHoursUtil } from '../utils/business-hours';

// 営業日判定
const date = new Date('2026-01-20'); // 火曜日
const isBusinessDay = BusinessHoursUtil.isBusinessDay(date); // true

// 営業時間加算（金曜16:00 + 4営業時間 = 翌週月曜11:00）
const friday = new Date('2026-01-23T16:00:00');
const result = BusinessHoursUtil.addBusinessHours(friday, 4);
// → 2026-01-26T11:00:00（月曜日）

// 営業日加算（火曜10:00 + 3営業日 = 金曜10:00）
const tuesday = new Date('2026-01-20T10:00:00');
const result2 = BusinessHoursUtil.addBusinessDays(tuesday, 3);
// → 2026-01-23T10:00:00（金曜日）
```

### 2. SLA計算サービス
**ファイル**: `backend/src/services/sla.service.ts`

優先度ごとのSLAポリシーに基づいて期限を計算し、達成状況を管理します。

#### SLAポリシー定義

| 優先度 | 初動対応時間 | 解決時間 | 営業時間考慮 | 用途 |
|--------|--------------|----------|--------------|------|
| **P1** | 15分 | 2時間 | なし（24時間体制） | 全社停止、対外影響 |
| **P2** | 1時間 | 8時間 | あり | 部門影響 |
| **P3** | 4時間 | 72時間（3営業日） | あり | 個人影響 |
| **P4** | 24時間（1営業日） | 120時間（5営業日） | あり | 一般問い合わせ |

#### 主要メソッド

```typescript
// SLA期限を計算
SLAService.calculateDueDates(
  priority: PriorityLevel,
  createdAt: Date
): {
  response_due_at: Date;  // 初動対応期限
  due_at: Date;           // 解決期限
}

// 期限超過チェック
SLAService.isOverdue(ticket: Ticket): boolean

// SLA達成状況を判定
SLAService.getSLAStatus(ticket: Ticket): {
  responseMetSLA: boolean | null;   // 初動対応SLA達成
  resolutionMetSLA: boolean | null; // 解決SLA達成
  isOverdue: boolean;               // 現在超過中か
}

// SLA達成率を計算
SLAService.calculateSLAMetrics(tickets: Ticket[]): {
  total: number;
  responseMetCount: number;
  responseMetRate: number;
  resolutionMetCount: number;
  resolutionMetRate: number;
  overdueCount: number;
  overdueRate: number;
  byPriority: Record<PriorityLevel, {...}>;
}

// SLAポリシー取得
SLAService.getSLAPolicy(priority: PriorityLevel): SLADefinition
SLAService.getAllSLAPolicies(): Record<PriorityLevel, SLADefinition>
```

#### 使用例

```typescript
import { SLAService } from '../services/sla.service';
import { PriorityLevel } from '../types';

// チケット作成時にSLA期限を計算
const createdAt = new Date('2026-01-20T10:00:00');
const { response_due_at, due_at } = SLAService.calculateDueDates(
  PriorityLevel.P2,
  createdAt
);
// response_due_at: 2026-01-20T11:00:00（1営業時間後）
// due_at: 2026-01-21T09:00:00（8営業時間後）

// 期限超過チェック
const isOverdue = SLAService.isOverdue(ticket);

// SLA達成状況確認
const status = SLAService.getSLAStatus(ticket);
console.log(`初動対応: ${status.responseMetSLA ? '達成' : '未達成'}`);
console.log(`解決: ${status.resolutionMetSLA ? '達成' : '未達成'}`);

// SLAメトリクス計算
const metrics = SLAService.calculateSLAMetrics(tickets);
console.log(`初動対応達成率: ${metrics.responseMetRate}%`);
console.log(`解決達成率: ${metrics.resolutionMetRate}%`);
console.log(`超過中: ${metrics.overdueCount}件`);
```

### 3. チケットモデル統合
**ファイル**: `backend/src/models/ticket.model.ts`

チケット作成時に自動的にSLA期限を計算して設定します。

#### 実装内容

```typescript
import { SLAService } from '../services/sla.service';

static async create(ticketData: {...}): Promise<Ticket> {
  return withTransaction(async (client) => {
    // チケットを作成（優先度は自動計算）
    const ticket = await client.query(...);

    // SLA期限を計算
    const { response_due_at, due_at } = SLAService.calculateDueDates(
      ticket.priority,
      ticket.created_at
    );

    // SLA期限を更新
    const updatedTicket = await client.query(
      `UPDATE tickets
       SET response_due_at = $1, due_at = $2
       WHERE ticket_id = $3
       RETURNING *`,
      [response_due_at, due_at, ticket.ticket_id]
    );

    return updatedTicket;
  });
}
```

## SLA計算ロジック

### P1（最優先）
- **初動対応**: チケット作成から15分以内
- **解決**: チケット作成から2時間以内
- **営業時間考慮**: なし（24時間体制）

```typescript
// 例: 2026-01-20 10:00に作成
response_due_at: 2026-01-20 10:15
due_at: 2026-01-20 12:00
```

### P2（高）
- **初動対応**: 1営業時間以内
- **解決**: 8営業時間以内
- **営業時間考慮**: あり

```typescript
// 例: 2026-01-20（火）10:00に作成
response_due_at: 2026-01-20 11:00  // 1営業時間後
due_at: 2026-01-21（水）09:00      // 8営業時間後
// 火 10:00-18:00 = 8時間、残り0時間なので翌日9:00
```

### P3（中）
- **初動対応**: 4営業時間以内
- **解決**: 72営業時間（3営業日）以内
- **営業時間考慮**: あり

```typescript
// 例: 2026-01-20（火）10:00に作成
response_due_at: 2026-01-20 14:00  // 4営業時間後
due_at: 2026-01-23（金）10:00      // 3営業日後
// 3営業日 = 27営業時間
```

### P4（低）
- **初動対応**: 24時間（1営業日）以内
- **解決**: 120時間（5営業日）以内
- **営業時間考慮**: あり

```typescript
// 例: 2026-01-20（火）10:00に作成
response_due_at: 2026-01-21（水）10:00  // 1営業日後
due_at: 2026-01-27（火）10:00           // 5営業日後
```

## SLA達成判定

### 初動対応SLA
- **判定タイミング**: チケットが担当者に割り当てられた時点
- **達成条件**: `assigned_at <= response_due_at`
- **未評価**: `assigned_at`がnullの場合

### 解決SLA
- **判定タイミング**: チケットが解決（Resolved）された時点
- **達成条件**: `resolved_at <= due_at`
- **未評価**: `resolved_at`がnullの場合

### 期限超過判定
- **対象ステータス**: Closed、Canceled以外のすべてのステータス
- **超過条件**:
  - 未割当で現在時刻 > `response_due_at`
  - 未解決で現在時刻 > `due_at`

## テスト

### 営業時間計算のテスト
```bash
# テスト実行
npx ts-node backend/src/utils/business-hours.test.ts
```

### SLA計算のテスト
```bash
# テスト実行
npx ts-node backend/src/services/sla.service.test.ts
```

## 祝日管理

### 現在の実装
- 2025-2026年の日本の国民の祝日をハードコード
- 高速検索のためSetデータ構造を使用

### 本番環境での推奨事項
祝日データを外部化することを推奨します:

1. **祝日API利用**
   - Google Calendar API
   - 内閣府の祝日データ

2. **専用ライブラリ**
   ```bash
   npm install @holiday-jp/holiday_jp
   ```

3. **データベース管理**
   ```sql
   CREATE TABLE holidays (
     holiday_date DATE PRIMARY KEY,
     name VARCHAR(100),
     is_active BOOLEAN DEFAULT true
   );
   ```

### カスタム祝日の追加
```typescript
import { BusinessHoursUtil } from '../utils/business-hours';

// 会社独自の休日を追加
BusinessHoursUtil.addHoliday('2026-12-29'); // 年末年始
BusinessHoursUtil.addHoliday('2026-12-30');
BusinessHoursUtil.addHoliday('2026-12-31');
```

## パフォーマンス考慮事項

### 営業時間計算の最適化
- 祝日チェックは`Set`データ構造で O(1)
- 日付計算はネイティブDateオブジェクトを使用

### SLAメトリクス計算
- 大量のチケットを処理する場合はバッチ処理を推奨
- データベース側でのフィルタリングを活用

```typescript
// 良い例: 必要なチケットのみ取得
const tickets = await TicketModel.findAll({
  status: [TicketStatus.RESOLVED, TicketStatus.CLOSED],
  from_date: startDate,
  to_date: endDate,
});
const metrics = SLAService.calculateSLAMetrics(tickets);

// 悪い例: 全チケット取得後にフィルタ
const allTickets = await TicketModel.findAll({});
const filteredTickets = allTickets.filter(...);
const metrics = SLAService.calculateSLAMetrics(filteredTickets);
```

## API統合例

### チケット作成API
```typescript
// POST /api/tickets
router.post('/tickets', async (req, res) => {
  const ticket = await TicketModel.create({
    type: req.body.type,
    subject: req.body.subject,
    description: req.body.description,
    impact: req.body.impact,
    urgency: req.body.urgency,
    requester_id: req.user.user_id,
    category_id: req.body.category_id,
  });

  // ticket.response_due_at と ticket.due_at は自動設定済み
  res.json({ success: true, data: ticket });
});
```

### SLAダッシュボードAPI
```typescript
// GET /api/sla/metrics
router.get('/sla/metrics', async (req, res) => {
  const tickets = await TicketModel.findAll({
    from_date: req.query.from_date,
    to_date: req.query.to_date,
  });

  const metrics = SLAService.calculateSLAMetrics(tickets.tickets);

  res.json({
    success: true,
    data: metrics,
  });
});
```

### 期限超過チケット一覧API
```typescript
// GET /api/tickets/overdue
router.get('/tickets/overdue', async (req, res) => {
  const tickets = await TicketModel.findOverdueSLA();

  res.json({
    success: true,
    data: tickets,
    meta: { total: tickets.length },
  });
});
```

## 今後の拡張

### 1. カスタムSLAポリシー
チケットタイプやカテゴリごとに異なるSLAを設定可能にする:

```typescript
interface CustomSLAPolicy {
  ticket_type?: TicketType;
  category_id?: string;
  priority: PriorityLevel;
  responseMinutes: number;
  resolutionMinutes: number;
  businessHoursOnly: boolean;
}
```

### 2. SLA一時停止
顧客回答待ちなど、SLA計算を一時停止する機能:

```typescript
interface SLAPause {
  ticket_id: string;
  paused_at: Date;
  resumed_at?: Date;
  reason: string;
}
```

### 3. エスカレーション
SLA期限の一定割合（例: 80%）に達したら自動エスカレーション:

```typescript
SLAService.shouldEscalate(ticket, threshold = 0.8): boolean
```

### 4. 通知統合
SLA期限が近づいたら通知:

```typescript
// SLA期限の1時間前に通知
const upcomingDeadlines = tickets.filter(ticket => {
  const timeRemaining = ticket.due_at.getTime() - Date.now();
  return timeRemaining > 0 && timeRemaining < 3600000; // 1時間以内
});
```

## まとめ

SLA自動計算エンジンは以下の機能を提供します:

1. **自動期限計算**: チケット作成時に優先度に基づいて自動計算
2. **営業時間考慮**: 営業時間・営業日・祝日を正確に処理
3. **達成状況管理**: SLA達成率の計算とトラッキング
4. **期限超過検知**: リアルタイムの期限超過チェック

これにより、効率的なヘルプデスク運用とSLA遵守が可能になります。
