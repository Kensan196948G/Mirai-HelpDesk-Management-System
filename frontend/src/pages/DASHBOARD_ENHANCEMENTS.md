# ダッシュボード強化実装ドキュメント

## 概要

Mirai ヘルプデスク管理システムのダッシュボード画面を大幅に強化しました。参考実装（Z:\MicrosoftProductManagementSystem\WebUI-Sample\index.html）を基に、ヘルプデスク運用に特化した機能を追加しています。

## 実装内容

### 1. 統計カードセクション

**ファイル**: `Dashboard.tsx` (Line 240-310)

4つの主要統計を表示:
- **総チケット数**: 今月の増減を表示
- **対応中チケット数**: 対応が必要なチケット数
- **SLA達成率**: 目標95%に対する達成率（円グラフ付き）
- **平均解決時間**: 初動時間と解決時間を表示

**特徴**:
- トレンドアイコン（上昇/下降矢印）で前月比を視覚化
- 色分けでステータスを直感的に表示（緑=良好、黄=注意、赤=警告）
- Fluent Designに準拠したカードデザイン

### 2. SLA状況ウィジェット

**ファイル**: `Dashboard.tsx` (Line 312-430)

優先度別（P1-P4）のSLA進捗を表示:
- **P1（緊急）**: 初動15分 / 復旧2時間
- **P2（高）**: 初動1時間 / 復旧8時間
- **P3（中）**: 初動4時間 / 解決3営業日
- **P4（低）**: 初動1営業日 / 解決5営業日

**表示項目**:
- 各優先度の進行中チケット数
- プログレスバーで進捗を視覚化
- 期限内チケット数と期限超過チケット数

**色分け**:
- P1: 赤系（#fff1f0背景、#ff4d4f）
- P2: 黄系（#fffbe6背景、#faad14）
- P3: 青系（#e6f7ff背景、#1890ff）
- P4: 緑系（#f6ffed背景、#52c41a）

### 3. Microsoft 365 サービス稼働状況

**ファイル**: `Dashboard.tsx` (Line 480-550)

主要M365サービスの稼働状況を監視:
- Exchange Online
- Microsoft Teams
- SharePoint Online
- OneDrive for Business

**表示内容**:
- サービスステータス（正常/注意/エラー）
- 稼働率（パーセンテージ）
- プログレスバーで視覚化
- アイコンで状態を識別

**データソース**:
現在は仮データを使用。将来的にはMicrosoft Graph API経由で実際のサービスヘルス情報を取得可能。

### 4. 最近のアクティビティ

**ファイル**: `Dashboard.tsx` (Line 552-610)

システム内の最新アクティビティをタイムライン表示:
- チケット作成
- チケット解決
- コメント追加
- ユーザー作成

**特徴**:
- Ant Design Timelineコンポーネントを使用
- アイコンと色分けで各アクションタイプを識別
- 相対時間表示（「5分前」など）
- チケット番号をクリックで詳細画面へ遷移

### 5. チャート分析コンポーネント

#### 5.1 週次トレンドチャート

**ファイル**: `src/components/Charts/TicketTrendChart.tsx`

新規チケットと解決チケットの週次推移を表示:
- シンプルなバーチャートで視覚化
- 凡例付き（新規=青、解決=緑）
- 週平均値の計算と表示
- ホバーでツールチップ表示

**将来の拡張**:
Chart.jsやrecharts等のライブラリで実装することで、より高度なインタラクティブ性を追加可能。

#### 5.2 SLA達成率ドーナツチャート

**ファイル**: `src/components/Charts/SLADonutChart.tsx`

SLA達成率を円グラフで表示:
- Ant Design Progressコンポーネントを使用
- 中央に達成率パーセンテージを大きく表示
- 期限内/期限超過の詳細データ
- 目標95%に対する達成状況表示

**色分け**:
- 95%以上: 緑（#52c41a）
- 85-94%: 黄（#faad14）
- 84%以下: 赤（#ff4d4f）

#### 5.3 優先度別チケット数横棒グラフ

**ファイル**: `src/components/Charts/PriorityBarChart.tsx`

P1-P4の各優先度別チケット数を横棒グラフで表示:
- 各バーは最大値に対する相対幅
- パーセンテージと実数の両方を表示
- 優先度カラーで色分け
- 合計チケット数の表示

### 6. リアルタイム更新機能

**実装**: `Dashboard.tsx` (useQuery refetchInterval設定)

```typescript
refetchInterval: 30000, // 30秒ごとに自動更新
```

**対象データ**:
- チケット統計データ（30秒間隔）
- 最近のチケット一覧（30秒間隔）
- SLA期限超過チケット（60秒間隔）

**特徴**:
- React Query（TanStack Query）の自動再取得機能を使用
- バックグラウンドで自動更新、ユーザー操作を妨げない
- ローディング状態の適切な管理

## API統合

### 必要なエンドポイント

現在実装されているエンドポイント:
- `GET /api/tickets/statistics` - ダッシュボード統計取得
- `GET /api/tickets` - チケット一覧取得

将来的に追加が望ましいエンドポイント:
- `GET /api/reports/dashboard` - 詳細なダッシュボードデータ
- `GET /api/audit/logs` - アクティビティログ取得
- `GET /api/m365/service-health` - M365サービス稼働状況

### レスポンス例

```typescript
// GET /api/tickets/statistics
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
        "triage": 5,
        "assigned": 8,
        "in_progress": 19,
        "pending_customer": 6,
        "pending_approval": 3,
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

## スタイリング

**ファイル**: `Dashboard.css`

### 主要スタイル

1. **Fluent Designの統合**
   - カードシャドウ: `var(--shadow-depth-2)`
   - ホバーエフェクト: `translateY(-4px)`
   - 境界線: `var(--border-radius-large)`

2. **レスポンシブデザイン**
   - デスクトップ: 4カラムグリッド
   - タブレット: 2カラムグリッド
   - モバイル: 1カラムグリッド

3. **アニメーション**
   - `fadeIn`: ページ読み込み時
   - `slideDown`: アラート表示時
   - `pulse`: サービスステータスインジケーター

4. **印刷対応**
   - 背景色を白に変更
   - シャドウを削除
   - ページ分割の最適化

## パフォーマンス最適化

1. **React Query キャッシュ**
   - 統計データを30秒間キャッシュ
   - 不要な再取得を防止

2. **コンポーネント分離**
   - チャートコンポーネントを独立化
   - 再利用性の向上
   - メンテナンス性の向上

3. **遅延読み込み**
   - 必要なデータのみを取得
   - 初期ロード時間の短縮

## 今後の拡張予定

### 1. Chart.jsの統合

現在はシンプルなバーチャートですが、Chart.jsを導入することで:
- インタラクティブなチャート
- アニメーション効果
- ズーム/パン機能
- データポイントのツールチップ

**導入手順**:
```bash
cd frontend
npm install chart.js react-chartjs-2
```

### 2. 実データ連携

仮データを実際のAPIデータに置き換え:
- M365サービスヘルス: Microsoft Graph API連携
- アクティビティログ: 監査ログテーブルから取得
- トレンドデータ: 時系列データの集計

### 3. カスタマイズ機能

ユーザーごとのダッシュボードカスタマイズ:
- ウィジェットの表示/非表示
- レイアウトのドラッグ&ドロップ
- フィルター条件の保存
- カスタムダッシュボード作成

### 4. エクスポート機能

ダッシュボードデータのエクスポート:
- PDF形式での出力
- CSV形式での統計データ出力
- スケジュールレポート送信

## トラブルシューティング

### よくある問題

1. **チャートが表示されない**
   - コンポーネントのimportパスを確認
   - `@/components/Charts`のエイリアスが正しく設定されているか確認

2. **データが更新されない**
   - React Queryのキャッシュをクリア
   - ブラウザの開発者ツールでNetworkタブを確認

3. **スタイルが適用されない**
   - CSSファイルが正しくimportされているか確認
   - CSS変数が定義されているか確認（`index.css`）

## 参考資料

- [Ant Design Documentation](https://ant.design/components/overview/)
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [Microsoft Fluent Design System](https://www.microsoft.com/design/fluent/)
- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)

## 作成日

2025-01-20

## 更新履歴

- 2025-01-20: 初版作成
