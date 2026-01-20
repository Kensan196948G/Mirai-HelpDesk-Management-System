# ダッシュボード強化 - セットアップガイド

## 概要

このドキュメントは、Mirai ヘルプデスク管理システムのダッシュボード強化機能のセットアップ手順を説明します。

## 実装済み機能

### ✅ 完了した実装

1. **統計カードセクション**
   - 総チケット数（今月の増減表示）
   - 対応中チケット数
   - SLA達成率（目標95%）
   - 平均解決時間

2. **SLA状況ウィジェット**
   - 優先度別（P1-P4）のSLA進捗表示
   - プログレスバーで視覚化
   - 期限内/期限超過の詳細表示

3. **Microsoft 365 サービス稼働状況**
   - Exchange Online
   - Microsoft Teams
   - SharePoint Online
   - OneDrive for Business

4. **最近のアクティビティ**
   - タイムライン形式で表示
   - アイコンと色分けで識別
   - 相対時間表示（「5分前」など）

5. **チャート分析コンポーネント**
   - 週次トレンドチャート（新規/解決）
   - SLA達成率ドーナツチャート
   - 優先度別チケット数横棒グラフ

6. **リアルタイム更新機能**
   - 30秒ごとの自動更新
   - React Query（TanStack Query）による効率的なデータ管理

## ファイル構成

```
frontend/src/
├── pages/
│   ├── Dashboard.tsx              # メインダッシュボードページ
│   ├── Dashboard.css              # スタイルシート
│   └── DASHBOARD_ENHANCEMENTS.md  # 実装ドキュメント
├── components/
│   └── Charts/
│       ├── TicketTrendChart.tsx   # 週次トレンドチャート
│       ├── SLADonutChart.tsx      # SLA達成率円グラフ
│       └── PriorityBarChart.tsx   # 優先度別横棒グラフ
└── services/
    └── ticketService.ts           # チケットAPI
```

## セットアップ手順

### 1. 依存関係の確認

現在の実装で使用しているライブラリ:
```json
{
  "@ant-design/icons": "^5.2.6",
  "@tanstack/react-query": "^5.17.9",
  "antd": "^5.13.0",
  "react": "^18.2.0",
  "react-router-dom": "^6.21.1"
}
```

これらは既にインストール済みです。

### 2. バックエンドAPI対応

ダッシュボードが正常に動作するためには、以下のAPIエンドポイントが必要です:

#### 必須エンドポイント

**GET /api/tickets/statistics**
```typescript
// レスポンス例
{
  "success": true,
  "data": {
    "statistics": {
      "total": 156,
      "new": 12,
      "in_progress": 34,
      "resolved": 89,
      "closed": 21,
      "by_priority": {
        "P1": 2,
        "P2": 8,
        "P3": 15,
        "P4": 9
      },
      "by_status": {
        "new": 12,
        "in_progress": 19,
        "resolved": 89,
        "closed": 21
      },
      "sla_overdue": 3,
      "avg_response_time_hours": 2.5,
      "avg_resolution_time_hours": 18.3
    }
  }
}
```

**GET /api/tickets**
```typescript
// パラメータ
{
  "status": "in_progress,pending_customer,pending_approval",
  "pageSize": 5
}

// レスポンス例
{
  "success": true,
  "data": {
    "tickets": [
      {
        "ticket_id": "uuid",
        "ticket_number": "TICKET-1234",
        "subject": "メールが送信できない",
        "type": "incident",
        "status": "in_progress",
        "priority": "P2",
        "created_at": "2025-01-20T10:00:00Z",
        "due_at": "2025-01-20T18:00:00Z"
      }
    ]
  }
}
```

### 3. 開発サーバーの起動

```bash
cd frontend
npm run dev
```

ブラウザで http://localhost:5173 にアクセスしてダッシュボードを確認できます。

### 4. 動作確認

以下の項目を確認してください:

- [ ] 統計カードが4つ表示される
- [ ] SLA状況ウィジェットが優先度別に表示される
- [ ] M365サービス稼働状況が表示される
- [ ] 最近のアクティビティがタイムライン表示される
- [ ] 週次トレンドチャートが表示される
- [ ] SLA達成率円グラフが表示される
- [ ] 優先度別横棒グラフが表示される
- [ ] 30秒ごとにデータが自動更新される

## オプション: Chart.jsの統合

より高度なチャート機能が必要な場合は、Chart.jsを統合できます。

### インストール

```bash
cd frontend
npm install chart.js react-chartjs-2
```

### 使用例

```typescript
// TicketTrendChart.tsx の改良版
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const TicketTrendChart: React.FC = () => {
  const data = {
    labels: ['1/15', '1/16', '1/17', '1/18', '1/19', '1/20', '1/21'],
    datasets: [
      {
        label: '新規',
        data: [12, 15, 10, 18, 14, 16, 13],
        backgroundColor: '#1890ff',
      },
      {
        label: '解決',
        data: [8, 10, 12, 15, 16, 14, 11],
        backgroundColor: '#52c41a',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '週次トレンド',
      },
    },
  };

  return <Bar options={options} data={data} />;
};
```

## カスタマイズ

### 1. 色のカスタマイズ

`Dashboard.css` で色変数を変更:

```css
:root {
  --priority-p1: #cf1322;
  --priority-p2: #d48806;
  --priority-p3: #096dd9;
  --priority-p4: #389e0d;
}
```

### 2. 更新間隔の変更

`Dashboard.tsx` で更新間隔を変更:

```typescript
refetchInterval: 60000, // 60秒（1分）ごとに更新
```

### 3. 表示項目の追加/削除

`Dashboard.tsx` の該当セクションをコメントアウトまたは削除:

```typescript
{/* SLA状況ウィジェット - 不要な場合はコメントアウト */}
{/* <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
  ...
</Row> */}
```

## トラブルシューティング

### 問題1: チャートが表示されない

**原因**: インポートパスが正しくない

**解決策**: `tsconfig.json` でパスエイリアスを確認
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@services/*": ["./src/services/*"]
    }
  }
}
```

### 問題2: APIエラーが発生する

**原因**: バックエンドが起動していない、またはエンドポイントが未実装

**解決策**:
1. バックエンドサーバーが起動しているか確認
2. `http://localhost:3000/api/tickets/statistics` にアクセスしてレスポンスを確認
3. CORSエラーの場合は、バックエンドのCORS設定を確認

### 問題3: データが古い

**原因**: React Queryのキャッシュが効きすぎている

**解決策**: ブラウザの開発者ツールで強制リロード（Ctrl+Shift+R）

## パフォーマンス最適化

### 1. React.memo の使用

チャートコンポーネントを React.memo でラップ:

```typescript
import { memo } from 'react';

const TicketTrendChart: React.FC = memo(({ data }) => {
  // コンポーネント実装
});

export default TicketTrendChart;
```

### 2. 仮想スクロールの導入

大量のアクティビティログを表示する場合は、react-windowを使用:

```bash
npm install react-window
```

### 3. コード分割

チャートコンポーネントを動的にインポート:

```typescript
const TicketTrendChart = lazy(() => import('@/components/Charts/TicketTrendChart'));

// 使用時
<Suspense fallback={<Spin />}>
  <TicketTrendChart />
</Suspense>
```

## テスト

### 単体テスト

```bash
npm run test
```

### E2Eテスト（Playwright）

```bash
npm run test:e2e
```

テストケース例:
```typescript
test('ダッシュボードが正しく表示される', async ({ page }) => {
  await page.goto('/dashboard');

  // 統計カードの確認
  await expect(page.locator('text=総チケット数')).toBeVisible();
  await expect(page.locator('text=対応中チケット数')).toBeVisible();
  await expect(page.locator('text=SLA達成率')).toBeVisible();
  await expect(page.locator('text=平均解決時間')).toBeVisible();

  // チャートの確認
  await expect(page.locator('text=週次トレンド')).toBeVisible();
  await expect(page.locator('text=優先度別チケット数')).toBeVisible();
});
```

## デプロイ

### ビルド

```bash
cd frontend
npm run build
```

ビルド成果物は `frontend/dist` に出力されます。

### 本番環境への配置

```bash
# 静的ファイルサーバー（Nginx, Apache等）にコピー
cp -r dist/* /var/www/html/

# または、Node.jsサーバーで配信
npm run preview
```

## まとめ

このダッシュボード強化により、以下の改善が実現されました:

1. **可視性の向上**: 重要なKPIを一目で確認可能
2. **SLA管理の強化**: 優先度別の進捗を詳細に把握
3. **運用監視**: M365サービスの稼働状況を常時監視
4. **リアルタイム性**: 30秒ごとの自動更新で最新情報を表示
5. **ユーザー体験**: Fluent Designに準拠した洗練されたUI

## サポート

問題が発生した場合は、以下のファイルを参照してください:

- `frontend/src/pages/DASHBOARD_ENHANCEMENTS.md` - 実装の詳細ドキュメント
- `frontend/src/pages/Dashboard.README.md` - ダッシュボードの使用方法
- `backend/README.md` - バックエンドAPIドキュメント

## 更新履歴

- 2025-01-20: 初版作成
  - 統計カード実装
  - SLA状況ウィジェット実装
  - M365サービス稼働状況実装
  - 最近のアクティビティ実装
  - チャート分析コンポーネント実装
  - リアルタイム更新機能実装
