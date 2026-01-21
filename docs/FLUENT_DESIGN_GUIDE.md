# Microsoft Fluent Design 適用ガイド

## 概要

Mirai ヘルプデスク管理システムは、Microsoft Fluent Designシステムを採用しています。このドキュメントでは、プロジェクトで使用するデザインシステム、カラーパレット、コンポーネント、使用方法について説明します。

## 目次

1. [デザイン原則](#デザイン原則)
2. [カラーシステム](#カラーシステム)
3. [タイポグラフィ](#タイポグラフィ)
4. [コンポーネント](#コンポーネント)
5. [レスポンシブデザイン](#レスポンシブデザイン)
6. [アクセシビリティ](#アクセシビリティ)
7. [使用例](#使用例)

---

## デザイン原則

### Fluent Designの5つの要素

1. **Light（光）**: 視覚的な階層を作成し、ユーザーの注意を引く
2. **Depth（深さ）**: シャドウとレイヤーで要素の関係性を表現
3. **Motion（動き）**: 自然で直感的なアニメーション
4. **Material（素材）**: アクリル効果とぼかしで奥行きを表現
5. **Scale（スケール）**: 複数のデバイスサイズに対応

### プロジェクトの設計目標

- **親しみやすさ**: Microsoftエコシステムとの統一感
- **生産性**: IT部門の日常業務を効率化
- **明確性**: 情報の優先順位が一目で分かる
- **応答性**: スムーズなインタラクション

---

## カラーシステム

### ブランドカラー

```css
--ms-blue: #0078d4;           /* Microsoft Blue (プライマリー) */
--ms-blue-hover: #106ebe;     /* ホバー状態 */
--ms-blue-active: #005a9e;    /* アクティブ状態 */
--ms-blue-light: #deecf9;     /* 背景用ライト */
--ms-blue-lighter: #eff6fc;   /* 背景用エクストラライト */
```

### グレースケール（Fluent Design）

```css
--fluent-gray-10: #faf9f8;    /* 最も明るい */
--fluent-gray-20: #f3f2f1;
--fluent-gray-30: #edebe9;
--fluent-gray-40: #e1dfdd;
--fluent-gray-50: #d2d0ce;
--fluent-gray-60: #c8c6c4;
--fluent-gray-70: #a19f9d;
--fluent-gray-80: #8a8886;
--fluent-gray-90: #605e5c;
--fluent-gray-100: #484644;
--fluent-gray-110: #323130;   /* テキストプライマリー */
--fluent-gray-120: #201f1e;   /* 最も暗い */
```

### セマンティックカラー

| カラー | 用途 | 値 |
|--------|------|-----|
| Success | 成功・完了 | `#107c10` |
| Warning | 警告・注意 | `#ff8c00` |
| Error | エラー・失敗 | `#d13438` |
| Info | 情報 | `#0078d4` |

### 優先度カラー（チケット用）

| 優先度 | 説明 | カラー | 背景色 |
|--------|------|--------|--------|
| P1 | 全社停止 | `#d13438` | `#fde7e9` |
| P2 | 部門影響 | `#ff8c00` | `#fff4ce` |
| P3 | 個人 | `#0078d4` | `#deecf9` |
| P4 | 問い合わせ | `#107c10` | `#dff6dd` |

### ステータスカラー

```css
--status-new: #0078d4;         /* 新規 */
--status-triage: #8661c5;      /* トリアージ */
--status-assigned: #00b7c3;    /* 割当済 */
--status-in-progress: #ff8c00; /* 対応中 */
--status-pending: #8a8886;     /* 保留中 */
--status-resolved: #107c10;    /* 解決済 */
--status-closed: #605e5c;      /* 完了 */
```

---

## タイポグラフィ

### フォントファミリー

```css
font-family: 'Segoe UI', 'Yu Gothic UI', 'Meiryo', 'Hiragino Sans',
             'ヒラギノ角ゴ ProN W3', 'Hiragino Kaku Gothic ProN',
             -apple-system, BlinkMacSystemFont, sans-serif;
```

### フォントサイズ

| クラス | サイズ | 用途 |
|--------|--------|------|
| `.ms-font-hero` | 42px | ヒーロータイトル |
| `.ms-font-xxl` | 28px | ページタイトル |
| `.ms-font-xl` | 24px | セクションタイトル |
| `.ms-font-lg` | 20px | サブタイトル |
| `.ms-font-md` | 18px | 強調テキスト |
| `.ms-font-base` | 15px | 本文（デフォルト） |
| `.ms-font-sm` | 14px | 補足情報 |
| `.ms-font-xs` | 12px | キャプション・ラベル |

### フォントウェイト

| クラス | ウェイト | 用途 |
|--------|----------|------|
| `.ms-font-weight-light` | 300 | 軽量テキスト |
| `.ms-font-weight-regular` | 400 | 通常テキスト |
| `.ms-font-weight-medium` | 500 | やや強調 |
| `.ms-font-weight-semibold` | 600 | セミボールド |
| `.ms-font-weight-bold` | 700 | 太字 |

---

## コンポーネント

### カードコンポーネント

#### 基本的なカード

```html
<div class="ms-Card">
  <div class="ms-Card-header">
    <h3 class="ms-Card-title">カードタイトル</h3>
  </div>
  <div class="ms-Card-body">
    カードの内容がここに入ります。
  </div>
  <div class="ms-Card-footer">
    <button class="ms-Button ms-Button--primary">アクション</button>
  </div>
</div>
```

#### 統計カード

```html
<div class="stats-card">
  <div class="stats-icon stats-icon--primary">
    📊
  </div>
  <div class="stats-content">
    <div class="stats-label">総チケット数</div>
    <div class="stats-value">125</div>
    <div class="stats-change positive">+12% 今月</div>
  </div>
</div>
```

**バリエーション:**
- `.stats-icon--primary` - プライマリーカラー
- `.stats-icon--success` - 成功カラー
- `.stats-icon--warning` - 警告カラー
- `.stats-icon--error` - エラーカラー

### ボタンコンポーネント

#### ボタンタイプ

```html
<!-- プライマリーボタン -->
<button class="ms-Button ms-Button--primary">
  プライマリー
</button>

<!-- セカンダリーボタン -->
<button class="ms-Button ms-Button--secondary">
  セカンダリー
</button>

<!-- ゴーストボタン -->
<button class="ms-Button ms-Button--ghost">
  ゴースト
</button>

<!-- デンジャーボタン -->
<button class="ms-Button ms-Button--danger">
  削除
</button>

<!-- アイコンボタン -->
<button class="ms-Button ms-Button--icon">
  🔔
</button>
```

#### ボタンサイズ

```html
<button class="ms-Button ms-Button--primary ms-Button--small">小</button>
<button class="ms-Button ms-Button--primary">標準</button>
<button class="ms-Button ms-Button--primary ms-Button--large">大</button>
```

### 入力フィールド

```html
<div class="ms-TextField">
  <label class="ms-TextField-label">ラベル</label>
  <input
    type="text"
    class="ms-TextField-input"
    placeholder="入力してください"
  />
  <span class="ms-TextField-description">補足説明</span>
</div>

<!-- エラー状態 -->
<div class="ms-TextField ms-TextField--error">
  <label class="ms-TextField-label">ラベル</label>
  <input type="text" class="ms-TextField-input" />
  <span class="ms-TextField-error">
    ⚠️ エラーメッセージ
  </span>
</div>
```

### タグ・バッジ

```html
<!-- 基本タグ -->
<span class="ms-Tag ms-Tag--primary">プライマリー</span>
<span class="ms-Tag ms-Tag--success">成功</span>
<span class="ms-Tag ms-Tag--warning">警告</span>
<span class="ms-Tag ms-Tag--error">エラー</span>

<!-- 優先度タグ -->
<span class="ms-Tag ms-Tag--priority-p1">P1</span>
<span class="ms-Tag ms-Tag--priority-p2">P2</span>
<span class="ms-Tag ms-Tag--priority-p3">P3</span>
<span class="ms-Tag ms-Tag--priority-p4">P4</span>

<!-- バッジ -->
<span class="ms-Badge">3</span>
<span class="ms-Badge ms-Badge--dot"></span>
```

### モーダル

```html
<div class="ms-Modal">
  <div class="ms-Modal-backdrop"></div>
  <div class="ms-Modal-container">
    <div class="ms-Modal-header">
      <h2 class="ms-Modal-title">モーダルタイトル</h2>
      <button class="ms-Modal-close">×</button>
    </div>
    <div class="ms-Modal-body">
      モーダルの内容
    </div>
    <div class="ms-Modal-footer">
      <button class="ms-Button ms-Button--secondary">キャンセル</button>
      <button class="ms-Button ms-Button--primary">保存</button>
    </div>
  </div>
</div>
```

### プログレスバー

```html
<div class="ms-ProgressBar">
  <div class="ms-ProgressBar-fill" style="width: 60%"></div>
</div>

<!-- カラーバリエーション -->
<div class="ms-ProgressBar ms-ProgressBar--success">
  <div class="ms-ProgressBar-fill" style="width: 100%"></div>
</div>

<div class="ms-ProgressBar ms-ProgressBar--warning">
  <div class="ms-ProgressBar-fill" style="width: 45%"></div>
</div>

<!-- 不確定プログレス -->
<div class="ms-ProgressBar ms-ProgressBar--indeterminate">
  <div class="ms-ProgressBar-fill"></div>
</div>
```

### トグルスイッチ

```html
<label class="ms-Toggle">
  <input type="checkbox" class="ms-Toggle-input" />
  <span class="ms-Toggle-track">
    <span class="ms-Toggle-thumb"></span>
  </span>
  <span>トグルラベル</span>
</label>
```

### データテーブル

```html
<div class="ms-Table">
  <div class="ms-Table-container">
    <table>
      <thead>
        <tr>
          <th>列1</th>
          <th>列2</th>
          <th>列3</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>データ1</td>
          <td>データ2</td>
          <td>データ3</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### ピボットタブ

```html
<div class="ms-Pivot">
  <button class="ms-Pivot-item is-selected">タブ1</button>
  <button class="ms-Pivot-item">タブ2</button>
  <button class="ms-Pivot-item">タブ3</button>
</div>
```

---

## シャドウシステム

Fluent Designの深さを表現するシャドウレベル:

| クラス | 用途 | 例 |
|--------|------|-----|
| `.ms-depth-2` | カード、パネル | `box-shadow: 0 1.6px 3.6px rgba(0,0,0,0.132)` |
| `.ms-depth-4` | ホバー時のカード | `box-shadow: 0 3.2px 7.2px rgba(0,0,0,0.132)` |
| `.ms-depth-8` | ドロップダウン、ポップオーバー | `box-shadow: 0 6.4px 14.4px rgba(0,0,0,0.132)` |
| `.ms-depth-16` | ダイアログ、モーダル | `box-shadow: 0 12.8px 28.8px rgba(0,0,0,0.132)` |
| `.ms-depth-64` | フルスクリーンモーダル | `box-shadow: 0 25.6px 57.6px rgba(0,0,0,0.220)` |

---

## モーションシステム

### アニメーションクラス

```html
<div class="ms-motion-fade-in">フェードイン</div>
<div class="ms-motion-slide-up">スライドアップ</div>
<div class="ms-motion-slide-down">スライドダウン</div>
<div class="ms-motion-scale-up">スケールアップ</div>
```

### トランジション時間

```css
--duration-ultra-fast: 50ms;   /* ホバー効果 */
--duration-fast: 100ms;        /* 即時フィードバック */
--duration-normal: 200ms;      /* 標準アニメーション */
--duration-slow: 367ms;        /* ページ遷移 */
--duration-ultra-slow: 500ms;  /* 複雑なアニメーション */
```

---

## スペーシングシステム

8pxグリッドシステムを採用:

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 20px;
--spacing-xxl: 24px;
--spacing-xxxl: 32px;
--spacing-huge: 40px;
```

### スペーシングユーティリティ

```html
<div class="ms-p-lg">Padding Large</div>
<div class="ms-m-xl">Margin XLarge</div>
```

---

## レスポンシブデザイン

### ブレークポイント

| デバイス | 幅 | グリッド列数 |
|----------|-----|------------|
| モバイル | < 480px | 1列 |
| タブレット | 481px - 768px | 2列 |
| デスクトップ | 769px - 1200px | 3列 |
| ワイド | > 1200px | 4列 |

### グリッドシステム

```html
<div class="grid-container grid-4-cols">
  <div class="stats-card">...</div>
  <div class="stats-card">...</div>
  <div class="stats-card">...</div>
  <div class="stats-card">...</div>
</div>
```

レスポンシブ:
- 1200px以下: 3列
- 992px以下: 2列
- 768px以下: 1列

---

## アクセシビリティ

### フォーカスインジケーター

```css
.ms-focus-visible:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--ms-blue-light);
}
```

### スクリーンリーダー対応

```html
<span class="ms-sr-only">スクリーンリーダー専用テキスト</span>
```

### 高コントラストモード

システムで高コントラストモードが有効な場合、自動的に境界線を強調します。

### キーボードナビゲーション

- すべてのインタラクティブ要素は `Tab` キーで移動可能
- フォーカス状態は明確に表示
- `Enter` / `Space` でボタンを操作可能

---

## Ant Design統合

プロジェクトはAnt Designを使用していますが、Fluent Designテーマでカスタマイズされています。

### テーマ設定（main.tsx）

```typescript
const fluentTheme = {
  token: {
    colorPrimary: '#0078d4',
    fontFamily: "'Segoe UI', 'Meiryo', sans-serif",
    borderRadius: 4,
    // ... その他の設定
  },
  components: {
    Button: {
      borderRadius: 2,
      fontWeight: 600,
    },
    Card: {
      borderRadiusLG: 8,
    },
    // ... その他のコンポーネント設定
  },
};
```

### Ant Designコンポーネントのカスタマイズ

```css
/* Dashboard.css の例 */
.dashboard-container .ant-card {
  box-shadow: var(--shadow-depth-2);
  border-radius: var(--border-radius-large);
}

.dashboard-container .ant-card:hover {
  box-shadow: var(--shadow-depth-8);
  transform: translateY(-4px);
}
```

---

## 使用例

### ダッシュボード統計カードの実装

```tsx
import React from 'react';
import './Dashboard.css';

const DashboardStats = () => {
  return (
    <div className="dashboard-stats-grid">
      {/* 統計カード1 */}
      <div className="stats-card">
        <div className="stats-icon stats-icon--primary">
          📊
        </div>
        <div className="stats-content">
          <div className="stats-label">総チケット数</div>
          <div className="stats-value">125</div>
          <div className="stats-change positive">+12% 今月</div>
        </div>
      </div>

      {/* 統計カード2 */}
      <div className="stats-card">
        <div className="stats-icon stats-icon--warning">
          ⏰
        </div>
        <div className="stats-content">
          <div className="stats-label">対応中</div>
          <div className="stats-value">23</div>
          <div className="stats-change neutral">先月と同じ</div>
        </div>
      </div>

      {/* 統計カード3 */}
      <div className="stats-card">
        <div className="stats-icon stats-icon--success">
          ✅
        </div>
        <div className="stats-content">
          <div className="stats-label">解決済</div>
          <div className="stats-value">102</div>
          <div className="stats-change positive">+8% 今月</div>
        </div>
      </div>

      {/* 統計カード4 */}
      <div className="stats-card">
        <div className="stats-icon stats-icon--error">
          ⚠️
        </div>
        <div className="stats-content">
          <div className="stats-label">SLA超過</div>
          <div className="stats-value">3</div>
          <div className="stats-change negative">+2件 今週</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
```

### カスタムフォームの実装

```tsx
import React from 'react';

const TicketForm = () => {
  return (
    <div className="ms-Card">
      <div className="ms-Card-header">
        <h2 className="ms-Card-title">新規チケット作成</h2>
      </div>
      <div className="ms-Card-body">
        <form>
          {/* 件名 */}
          <div className="ms-TextField">
            <label className="ms-TextField-label">件名 *</label>
            <input
              type="text"
              className="ms-TextField-input"
              placeholder="チケットの件名を入力"
              required
            />
          </div>

          {/* 優先度選択 */}
          <div className="ms-TextField">
            <label className="ms-TextField-label">優先度</label>
            <select className="ms-TextField-input">
              <option value="P1">P1 - 全社停止</option>
              <option value="P2">P2 - 部門影響</option>
              <option value="P3">P3 - 個人</option>
              <option value="P4">P4 - 問い合わせ</option>
            </select>
          </div>

          {/* 説明 */}
          <div className="ms-TextField">
            <label className="ms-TextField-label">説明</label>
            <textarea
              className="ms-TextField-input"
              rows={5}
              placeholder="詳細な説明を入力"
            />
            <span className="ms-TextField-description">
              できるだけ詳しく記入してください
            </span>
          </div>
        </form>
      </div>
      <div className="ms-Card-footer">
        <button className="ms-Button ms-Button--secondary">
          キャンセル
        </button>
        <button className="ms-Button ms-Button--primary">
          作成
        </button>
      </div>
    </div>
  );
};

export default TicketForm;
```

---

## ベストプラクティス

### 1. カラーの一貫性

- プライマリーアクションには常に `--ms-blue` を使用
- 成功・警告・エラーはセマンティックカラーを使用
- グレースケールは階層を表現するために使用

### 2. タイポグラフィ

- ページタイトル: `.ms-font-xxl` (28px)
- セクションタイトル: `.ms-font-xl` (24px)
- 本文: デフォルト (15px)
- キャプション: `.ms-font-xs` (12px)

### 3. スペーシング

- カード内のパディング: `var(--spacing-xxl)` (24px)
- 要素間のマージン: `var(--spacing-lg)` (16px)
- 小さな要素のギャップ: `var(--spacing-sm)` (8px)

### 4. アニメーション

- ホバー効果: `var(--duration-fast)` (100ms)
- ページ遷移: `var(--duration-normal)` (200ms)
- 複雑なアニメーション: `var(--duration-slow)` (367ms)

### 5. レスポンシブ

- モバイルファースト: 最小サイズから設計
- タッチターゲット: 最小44px × 44px
- テキスト: モバイルでも読みやすいサイズ

---

## トラブルシューティング

### カラーが適用されない

1. CSS変数が定義されているか確認:
   ```css
   :root {
     --ms-blue: #0078d4;
   }
   ```

2. `fluent-design.css` がインポートされているか確認:
   ```css
   @import './styles/fluent-design.css';
   ```

### コンポーネントスタイルが効かない

1. クラス名のスペルミスを確認
2. CSSの読み込み順序を確認（`index.css` → `fluent-design.css` → `fluent-components.css`）
3. ブラウザのキャッシュをクリア

### Ant Designテーマが反映されない

`main.tsx` の `ConfigProvider` に `theme` プロパティが設定されているか確認:

```tsx
<ConfigProvider locale={jaJP} theme={fluentTheme}>
  <App />
</ConfigProvider>
```

---

## リソース

### 公式ドキュメント

- [Microsoft Fluent Design System](https://www.microsoft.com/design/fluent/)
- [Ant Design](https://ant.design/)
- [Ant Design カスタマイズ](https://ant.design/docs/react/customize-theme)

### カラーツール

- [Fluent UI Theme Designer](https://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/7.0/theming-designer/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### アイコン

- [Fluent UI Icons](https://github.com/microsoft/fluentui-system-icons)
- [Ant Design Icons](https://ant.design/components/icon/)

---

## 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-01-20 | 1.0.0 | 初版リリース - Fluent Design実装完了 |

---

## サポート

質問や問題がある場合は、プロジェクトのIssueトラッカーで報告してください。

**プロジェクト:** Mirai ヘルプデスク管理システム
**デザインシステム:** Microsoft Fluent Design
**バージョン:** 1.0.0
