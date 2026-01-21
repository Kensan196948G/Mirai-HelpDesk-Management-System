# SLA自動計算エンジン クイックリファレンス

## 📋 SLAポリシー早見表

| 優先度 | 初動対応期限 | 解決期限 | 営業時間のみ | 用途 |
|--------|--------------|----------|--------------|------|
| **P1** | 15分 | 2時間 | ❌ 24h体制 | 全社停止・対外影響 |
| **P2** | 1時間 | 8時間 | ✅ | 部門影響 |
| **P3** | 4時間 | 3営業日 | ✅ | 個人影響 |
| **P4** | 1営業日 | 5営業日 | ✅ | 一般問い合わせ |

**営業時間**: 9:00 - 18:00（月〜金、祝日除く）

## 🚀 よく使うコード例

### チケット作成（SLA自動設定）

```typescript
import { TicketModel } from '../models/ticket.model';
import { TicketType, ImpactLevel, UrgencyLevel } from '../types';

const ticket = await TicketModel.create({
  type: TicketType.INCIDENT,
  subject: 'システム障害',
  description: '詳細説明',
  impact: ImpactLevel.COMPANY_WIDE,  // 全社
  urgency: UrgencyLevel.IMMEDIATE,   // 即時
  requester_id: 'user-123',
});

// response_due_at と due_at が自動設定される
```

### SLA期限を手動計算

```typescript
import { SLAService } from '../services/sla.service';
import { PriorityLevel } from '../types';

const createdAt = new Date();
const { response_due_at, due_at } = SLAService.calculateDueDates(
  PriorityLevel.P2,
  createdAt
);

console.log(`初動期限: ${response_due_at}`);
console.log(`解決期限: ${due_at}`);
```

### 期限超過チェック

```typescript
import { SLAService } from '../services/sla.service';

const isOverdue = SLAService.isOverdue(ticket);
if (isOverdue) {
  console.log('警告: SLA期限超過');
}
```

### SLA達成状況確認

```typescript
import { SLAService } from '../services/sla.service';

const status = SLAService.getSLAStatus(ticket);

console.log(`初動対応: ${status.responseMetSLA ? '✅達成' : '❌未達成'}`);
console.log(`解決: ${status.resolutionMetSLA ? '✅達成' : '❌未達成'}`);
console.log(`現在超過中: ${status.isOverdue ? '⚠️はい' : '正常'}`);
```

### SLA達成率計算

```typescript
import { SLAService } from '../services/sla.service';
import { TicketModel } from '../models/ticket.model';

const { tickets } = await TicketModel.findAll({
  from_date: new Date('2026-01-01'),
  to_date: new Date('2026-01-31'),
});

const metrics = SLAService.calculateSLAMetrics(tickets);

console.log(`初動対応達成率: ${metrics.responseMetRate}%`);
console.log(`解決達成率: ${metrics.resolutionMetRate}%`);
console.log(`超過チケット: ${metrics.overdueCount}件`);

// 優先度別
console.log(`P1解決達成率: ${metrics.byPriority.P1.resolutionMetRate}%`);
```

### 期限超過チケット取得

```typescript
import { TicketModel } from '../models/ticket.model';

const overdueTickets = await TicketModel.findOverdueSLA();
console.log(`期限超過: ${overdueTickets.length}件`);
```

## 🔧 営業時間計算

### 営業日判定

```typescript
import { BusinessHoursUtil } from '../utils/business-hours';

const date = new Date('2026-01-20');
const isBusinessDay = BusinessHoursUtil.isBusinessDay(date);
// → true（火曜日、祝日でない）
```

### 営業時間判定

```typescript
import { BusinessHoursUtil } from '../utils/business-hours';

const time = new Date('2026-01-20T10:00:00');
const isBusinessHour = BusinessHoursUtil.isBusinessHour(time);
// → true（10:00は営業時間内）
```

### 営業時間を加算

```typescript
import { BusinessHoursUtil } from '../utils/business-hours';

const start = new Date('2026-01-20T10:00:00'); // 火曜 10:00
const result = BusinessHoursUtil.addBusinessHours(start, 4);
// → 2026-01-20T14:00:00（同日14:00）
```

### 営業日を加算

```typescript
import { BusinessHoursUtil } from '../utils/business-hours';

const start = new Date('2026-01-20T10:00:00'); // 火曜 10:00
const result = BusinessHoursUtil.addBusinessDays(start, 3);
// → 2026-01-23T10:00:00（金曜10:00）
```

### 営業時間数を計算

```typescript
import { BusinessHoursUtil } from '../utils/business-hours';

const start = new Date('2026-01-20T10:00:00');
const end = new Date('2026-01-21T11:00:00');
const hours = BusinessHoursUtil.calculateBusinessHours(start, end);
// → 9営業時間（火10:00-18:00 = 8h、水9:00-11:00 = 2h、合計10h）
```

## 📊 API エンドポイント例

### チケット作成
```http
POST /api/tickets
Content-Type: application/json

{
  "type": "incident",
  "subject": "システム障害",
  "description": "詳細",
  "impact": "全社",
  "urgency": "即時"
}

Response:
{
  "success": true,
  "data": {
    "ticket_id": "xxx",
    "priority": "P1",
    "response_due_at": "2026-01-20T10:15:00Z",
    "due_at": "2026-01-20T12:00:00Z"
  }
}
```

### SLAメトリクス取得
```http
GET /api/sla/metrics?from_date=2026-01-01&to_date=2026-01-31

Response:
{
  "success": true,
  "data": {
    "total": 150,
    "responseMetRate": 95.5,
    "resolutionMetRate": 92.3,
    "overdueCount": 5,
    "byPriority": {
      "P1": { "total": 10, "resolutionMetRate": 100 },
      "P2": { "total": 40, "resolutionMetRate": 95 },
      "P3": { "total": 80, "resolutionMetRate": 90 },
      "P4": { "total": 20, "resolutionMetRate": 85 }
    }
  }
}
```

### 期限超過チケット一覧
```http
GET /api/tickets/overdue

Response:
{
  "success": true,
  "data": [
    {
      "ticket_id": "xxx",
      "ticket_number": "INC-123",
      "subject": "...",
      "priority": "P2",
      "response_due_at": "...",
      "due_at": "..."
    }
  ],
  "meta": { "total": 5 }
}
```

## ⏱️ 計算例

### P1 (全社停止)
```
作成: 2026-01-20 10:00
初動: 2026-01-20 10:15 (15分後)
解決: 2026-01-20 12:00 (2時間後)
※営業時間考慮なし
```

### P2 (部門影響)
```
作成: 2026-01-20 (火) 10:00
初動: 2026-01-20 (火) 11:00 (1営業時間後)
解決: 2026-01-21 (水) 09:00 (8営業時間後)
※火10:00-18:00=8h、水9:00開始
```

### P3 (個人影響)
```
作成: 2026-01-20 (火) 10:00
初動: 2026-01-20 (火) 14:00 (4営業時間後)
解決: 2026-01-23 (金) 10:00 (3営業日後=27営業時間後)
※火10:00-18:00=8h、水9h、木9h、金1h
```

### P4 (問い合わせ)
```
作成: 2026-01-20 (火) 10:00
初動: 2026-01-21 (水) 10:00 (1営業日後)
解決: 2026-01-27 (火) 10:00 (5営業日後)
```

### 週末またぎ
```
作成: 2026-01-23 (金) 16:00
P2解決期限: 2026-01-27 (火) 09:00
※金16:00-18:00=2h、土日スキップ、月9h継続不足分は火へ
```

## 🎯 SLA達成判定ルール

### 初動対応SLA
```typescript
// 達成条件
assigned_at <= response_due_at

// 評価タイミング
チケットが割り当てられた時点で判定

// 未評価
assigned_at === null の場合
```

### 解決SLA
```typescript
// 達成条件
resolved_at <= due_at

// 評価タイミング
チケットが解決された時点で判定

// 未評価
resolved_at === null の場合
```

### 期限超過判定
```typescript
// 超過条件
(未割当 && 現在時刻 > response_due_at) ||
(未解決 && 現在時刻 > due_at)

// 対象外
status === 'closed' || status === 'canceled'
```

## 🧪 テスト実行

```bash
# 営業時間計算テスト
cd backend
npx ts-node src/utils/business-hours.test.ts

# SLA計算テスト
npx ts-node src/services/sla.service.test.ts
```

## 🔗 関連ファイル

- `backend/src/utils/business-hours.ts` - 営業時間計算
- `backend/src/services/sla.service.ts` - SLA計算サービス
- `backend/src/models/ticket.model.ts` - チケットモデル
- `backend/docs/SLA_CALCULATION.md` - 完全ドキュメント

## ⚠️ 注意事項

1. **祝日データ**: 2025-2026年のみ対応。本番環境では祝日APIまたはライブラリの使用を推奨
2. **営業時間**: 9:00-18:00固定。カスタマイズが必要な場合は`business-hours.ts`を修正
3. **タイムゾーン**: サーバーのローカルタイムゾーンを使用
4. **トランザクション**: チケット作成はトランザクション内で実行される

## 💡 よくある質問

**Q: SLA期限を再計算するには?**
```typescript
const { response_due_at, due_at } = SLAService.calculateDueDates(
  ticket.priority,
  ticket.created_at
);
await TicketModel.update(ticket.ticket_id, { response_due_at, due_at });
```

**Q: カスタム祝日を追加するには?**
```typescript
import { BusinessHoursUtil } from '../utils/business-hours';
BusinessHoursUtil.addHoliday('2026-12-29'); // 会社独自の休日
```

**Q: SLAポリシーを変更するには?**
`backend/src/services/sla.service.ts`の`SLA_POLICIES`定数を編集

**Q: 営業時間を変更するには?**
`backend/src/utils/business-hours.ts`の`BUSINESS_HOUR_START`と`BUSINESS_HOUR_END`を編集

---

**更新日**: 2026-01-20
