# SLA自動計算エンジン実装ファイル一覧

## 📁 ファイル構成

```
Mirai-HelpDesk-Management-System/
│
├── backend/
│   ├── src/
│   │   ├── utils/
│   │   │   ├── business-hours.ts          ✅ NEW (8.1 KB) - 営業時間計算ユーティリティ
│   │   │   ├── business-hours.test.ts     ✅ NEW (5.4 KB) - テストコード
│   │   │   └── logger.ts                   (既存)
│   │   │
│   │   ├── services/
│   │   │   ├── sla.service.ts             ✅ NEW (11 KB) - SLA計算サービス
│   │   │   ├── sla.service.test.ts        ✅ NEW (5.6 KB) - テストコード
│   │   │   ├── email.service.ts            (既存)
│   │   │   ├── m365.service.ts             (既存)
│   │   │   └── m365-auth.service.ts        (既存)
│   │   │
│   │   ├── models/
│   │   │   └── ticket.model.ts            🔧 MODIFIED - SLA自動計算を統合
│   │   │
│   │   └── types/
│   │       └── index.ts                    (既存 - 変更なし)
│   │
│   └── docs/
│       ├── SLA_CALCULATION.md             ✅ NEW (12 KB) - 完全ドキュメント
│       ├── SLA_IMPLEMENTATION_SUMMARY.md  ✅ NEW (11 KB) - 実装サマリー
│       ├── SLA_QUICK_REFERENCE.md         ✅ NEW (8.8 KB) - クイックリファレンス
│       └── NOTIFICATION_SYSTEM.md          (既存)
│
└── SLA_IMPLEMENTATION_FILES.md            ✅ NEW - このファイル
```

## 📊 実装統計

### 新規作成ファイル
- **コードファイル**: 4ファイル
- **テストファイル**: 2ファイル
- **ドキュメント**: 3ファイル
- **合計**: 9ファイル

### 変更ファイル
- **ticket.model.ts**: 1メソッド修正（createメソッド）

### コード行数
- **実装コード**: 約650行
- **テストコード**: 約330行
- **ドキュメント**: 約1,100行
- **合計**: 約2,080行

### ファイルサイズ
- **business-hours.ts**: 8.1 KB
- **sla.service.ts**: 11 KB
- **business-hours.test.ts**: 5.4 KB
- **sla.service.test.ts**: 5.6 KB
- **SLA_CALCULATION.md**: 12 KB
- **SLA_IMPLEMENTATION_SUMMARY.md**: 11 KB
- **SLA_QUICK_REFERENCE.md**: 8.8 KB
- **合計**: 約62 KB

## 🎯 主要機能

### 1. 営業時間計算 (`business-hours.ts`)
- ✅ 営業日判定（土日祝除外）
- ✅ 営業時間判定（9:00-18:00）
- ✅ 営業時間加算
- ✅ 営業日加算
- ✅ 営業時間数計算
- ✅ 日本の祝日対応（2025-2026年）

### 2. SLA計算 (`sla.service.ts`)
- ✅ P1: 初動15分 / 解決2時間（24時間体制）
- ✅ P2: 初動1時間 / 解決8時間（営業時間）
- ✅ P3: 初動4時間 / 解決3営業日（営業時間）
- ✅ P4: 初動1営業日 / 解決5営業日（営業時間）
- ✅ 期限超過チェック
- ✅ SLA達成状況判定
- ✅ SLA達成率計算（全体・優先度別）

### 3. チケットモデル統合 (`ticket.model.ts`)
- ✅ チケット作成時のSLA期限自動設定
- ✅ トランザクション内での処理
- ✅ 優先度に基づく自動計算

## 📚 ドキュメント

### SLA_CALCULATION.md
完全な技術ドキュメント
- API仕様
- 使用例
- 計算ロジック詳細
- パフォーマンス考慮事項
- API統合例
- 今後の拡張案

### SLA_IMPLEMENTATION_SUMMARY.md
実装完了レポート
- 実装概要
- ファイル一覧
- 技術仕様
- 使用方法
- テスト実行方法
- 受入基準

### SLA_QUICK_REFERENCE.md
開発者向けクイックリファレンス
- SLAポリシー早見表
- よく使うコード例
- API エンドポイント例
- 計算例
- FAQ

## 🧪 テスト

### business-hours.test.ts
営業時間計算のテストスイート
- 営業日判定テスト
- 営業時間判定テスト
- 営業時間加算テスト
- 営業日加算テスト
- 週末またぎテスト
- 祝日またぎテスト
- 営業時間外スタートテスト
- 営業時間計算テスト

### sla.service.test.ts
SLA計算のテストスイート
- 優先度別期限計算テスト
- 期限超過チェックテスト
- SLA達成状況テスト
- SLAメトリクス計算テスト
- SLAポリシー取得テスト

### テスト実行
```bash
cd backend

# 営業時間計算テスト
npx ts-node src/utils/business-hours.test.ts

# SLA計算テスト
npx ts-node src/services/sla.service.test.ts
```

## 🚀 使い方

### 基本的な使用例

#### 1. チケット作成（SLA自動設定）
```typescript
import { TicketModel } from './models/ticket.model';

const ticket = await TicketModel.create({
  type: 'incident',
  subject: 'システム障害',
  description: '...',
  impact: '全社',
  urgency: '即時',
  requester_id: 'user-123',
});

// ticket.response_due_at と ticket.due_at が自動設定される
```

#### 2. SLA状況確認
```typescript
import { SLAService } from './services/sla.service';

const status = SLAService.getSLAStatus(ticket);
console.log(`期限超過: ${status.isOverdue}`);
```

#### 3. SLAメトリクス
```typescript
const metrics = SLAService.calculateSLAMetrics(tickets);
console.log(`解決達成率: ${metrics.resolutionMetRate}%`);
```

## 🔗 依存関係

### 外部依存
- なし（標準ライブラリのみ使用）

### 内部依存
- `types/index.ts` - 型定義
- `config/database.ts` - データベース接続
- `models/ticket.model.ts` - チケットモデル

## ⚙️ 設定

### 営業時間設定
`backend/src/utils/business-hours.ts`
```typescript
private static readonly BUSINESS_HOUR_START = 9;  // 開始時刻
private static readonly BUSINESS_HOUR_END = 18;   // 終了時刻
```

### SLAポリシー設定
`backend/src/services/sla.service.ts`
```typescript
const SLA_POLICIES: Record<PriorityLevel, SLADefinition> = {
  P1: { responseMinutes: 15, resolutionMinutes: 120, ... },
  P2: { responseMinutes: 60, resolutionMinutes: 480, ... },
  P3: { responseMinutes: 240, resolutionMinutes: 4320, ... },
  P4: { responseMinutes: 1440, resolutionMinutes: 7200, ... },
};
```

### 祝日データ
`backend/src/utils/business-hours.ts`
```typescript
const JAPANESE_HOLIDAYS_2025 = [...];
const JAPANESE_HOLIDAYS_2026 = [...];
```

## 📖 次のステップ

### すぐに使える
1. `backend/docs/SLA_QUICK_REFERENCE.md` を確認
2. テストコードを実行して動作確認
3. チケット作成APIで自動計算を確認

### カスタマイズ
1. 営業時間を変更する場合 → `business-hours.ts`を編集
2. SLAポリシーを変更する場合 → `sla.service.ts`を編集
3. 祝日を追加する場合 → `BusinessHoursUtil.addHoliday()`を使用

### 拡張
1. カスタムSLAポリシーの実装
2. SLA一時停止機能の追加
3. エスカレーション機能の実装
4. 通知システムとの統合

## ✅ 受入基準

- [x] 優先度ごとのSLA期限を自動計算
- [x] 営業時間・営業日・祝日を考慮
- [x] チケット作成時に自動設定
- [x] 期限超過を検知
- [x] SLA達成率を計算
- [x] テストコードを提供
- [x] ドキュメントを完備

## 📞 サポート

詳細なドキュメント:
- 完全仕様: `backend/docs/SLA_CALCULATION.md`
- 実装サマリー: `backend/docs/SLA_IMPLEMENTATION_SUMMARY.md`
- クイックリファレンス: `backend/docs/SLA_QUICK_REFERENCE.md`

---

**実装完了日**: 2026-01-20
**バージョン**: 1.0.0
**実装者**: Claude Code (Sonnet 4.5)
