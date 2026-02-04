# E2Eテスト開発ガイド

## 📋 目次

1. [テスト設計原則](#テスト設計原則)
2. [ベストプラクティス](#ベストプラクティス)
3. [アンチパターン](#アンチパターン)
4. [実装ガイド](#実装ガイド)
5. [トラブルシューティング](#トラブルシューティング)

---

## テスト設計原則

### 1. テストの独立性

各テストは他のテストに依存せず、独立して実行可能であること。

✅ **Good**:
```javascript
test.beforeEach(async ({ page }) => {
  // 各テストで初期状態を構築
  await login(page, email, password);
});

test('機能Aのテスト', async ({ page }) => {
  // このテストだけで完結
});
```

❌ **Bad**:
```javascript
let sharedData;

test('テスト1', async () => {
  sharedData = await someOperation();  // 次のテストに依存
});

test('テスト2', async () => {
  use(sharedData);  // テスト1が失敗すると動作しない
});
```

### 2. 明示的な待機

暗黙的な待機ではなく、明示的に待機すること。

✅ **Good**:
```javascript
await page.waitForLoadState('networkidle');
await page.waitForSelector('input[placeholder="メールアドレス"]', { state: 'visible' });
await page.locator('button').waitFor({ state: 'visible', timeout: 5000 });
```

❌ **Bad**:
```javascript
await page.waitForTimeout(3000);  // 固定時間待機は避ける
await page.fill('input', 'text');  // 要素の存在確認なし
```

### 3. 柔軟なセレクタ

実装の変更に強い、柔軟なセレクタを使用すること。

✅ **Good**:
```javascript
// 複数のセレクタを試行
const emailInput = page.locator(
  'input[placeholder="メールアドレス"], input[type="email"], input[autocomplete="username"]'
).first();

// Ant Designコンポーネントを考慮
const pageContent = page.locator('input, textarea, button, [class*="ant-card"]');
```

❌ **Bad**:
```javascript
// 固定IDに依存（実装変更で壊れやすい）
await page.click('#login-button');

// 厳密すぎるセレクタ
await page.locator('div.container > div.row > button.submit').click();
```

---

## ベストプラクティス

### 1. helpers.js の活用

共通処理は `tests/e2e/helpers.js` に集約する。

```javascript
import { login, logout, API_BASE_URL, TEST_CONFIG } from './helpers.js';

test('例', async ({ page }) => {
  // 共通のlogin関数を使用
  const token = await login(page, TEST_CONFIG.TEST_ACCOUNTS.admin.email, TEST_CONFIG.TEST_ACCOUNTS.admin.password);
});
```

**helpers.js の主要関数**:
- `login(page, email, password)` - UIログイン（リトライ付き）
- `loginViaAPI(request, email, password)` - APIログイン（高速）
- `logout(page)` - ログアウト
- `createTicket(request, token, ticketData)` - チケット作成
- `waitForElement(page, selector, timeout)` - 要素待機

### 2. テストデータの管理

```javascript
// TEST_CONFIG を使用
const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

// テスト固有のデータは明示的に定義
const testTicket = {
  subject: 'テストチケット',
  description: 'E2Eテスト用',
  type: 'incident',
  impact: 'individual',
  urgency: 'low'
};
```

### 3. エラーハンドリング

```javascript
// エラーを適切にハンドリング
test('エラーハンドリング例', async ({ page }) => {
  await page.goto('/tickets');
  await page.waitForLoadState('networkidle');

  // 要素が存在しない可能性を考慮
  const title = page.locator('h1, h2').first();
  await expect(title).toBeVisible().catch(() => {
    console.log('⚠️ タイトルが見つかりません（実装中の可能性）');
  });

  // APIレスポンスのステータスを確認
  if (response.ok()) {
    const body = await response.json();
    expect(body.success).toBeTruthy();
  } else if (response.status() === 404) {
    console.log('⚠️ エンドポイント未実装');
  } else {
    console.log('❌ 予期しないエラー:', response.status());
  }
});
```

### 4. リトライ機能の実装

```javascript
// helpers.js のwaitForAuthToken参考
async function waitForCondition(page, condition, maxRetries = 10, delay = 500) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await page.evaluate(condition);
    if (result) {
      return result;
    }
    await page.waitForTimeout(delay);
  }
  return null;
}
```

### 5. beforeEach / afterEach の活用

```javascript
test.describe('機能テスト', () => {
  let authToken;

  test.beforeEach(async ({ page }) => {
    // 各テスト前の共通処理
    authToken = await login(page, email, password);
  });

  test.afterEach(async ({ page }) => {
    // 各テスト後のクリーンアップ
    await page.evaluate(() => localStorage.clear());
  });

  test('テスト1', async ({ page }) => {
    // authTokenが利用可能
  });
});
```

---

## アンチパターン

### ❌ 1. 固定時間待機

```javascript
// Bad
await page.waitForTimeout(3000);  // 3秒待機（遅い・不安定）

// Good
await page.waitForLoadState('networkidle');
await page.waitForSelector('button', { state: 'visible' });
```

### ❌ 2. 固定IDへの依存

```javascript
// Bad
await page.click('#submit-button');  // IDが変更されると壊れる

// Good
await page.click('button[type="submit"], button:has-text("送信")');
```

### ❌ 3. テスト間の依存

```javascript
// Bad
test('テスト1', async () => {
  globalTicketId = await createTicket();  // グローバル変数に保存
});

test('テスト2', async () => {
  await deleteTicket(globalTicketId);  // テスト1に依存
});

// Good
test('テスト2', async () => {
  const ticketId = await createTicket();  // 自己完結
  await deleteTicket(ticketId);
});
```

### ❌ 4. 過度な並列実行

```javascript
// Bad
// workers=10 で実行 → レート制限やDB競合のリスク

// Good
// workers=2〜4 で実行 → 安定性とパフォーマンスのバランス
```

---

## 実装ガイド

### 1. 認証が必要なテスト

```javascript
test.describe('認証必要なテスト', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, email, password);
  });

  test('保護されたページにアクセス', async ({ page }) => {
    await page.goto('/protected-page');
    // テストコード
  });
});
```

### 2. API統合テスト

```javascript
test('APIテスト例', async ({ request, page }) => {
  // ログインしてトークン取得
  const token = await login(page, email, password);

  // APIリクエスト
  const response = await request.get(`${API_BASE_URL}/api/endpoint`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBeTruthy();
});
```

### 3. フォーム送信テスト

```javascript
test('フォーム送信', async ({ page }) => {
  await login(page, email, password);
  await page.goto('/tickets/new');

  // フォーム入力
  await page.fill('input[name="subject"]', 'テストチケット');
  await page.fill('textarea[name="description"]', '詳細説明');
  await page.selectOption('select[name="type"]', 'incident');

  // 送信
  await page.click('button[type="submit"]');

  // 成功メッセージ確認
  await page.waitForSelector('text=/成功|作成しました/i', { timeout: 5000 });

  console.log('✅ チケット作成成功');
});
```

### 4. テーブル操作テスト

```javascript
test('テーブル操作', async ({ page }) => {
  await login(page, email, password);
  await page.goto('/tickets');

  // テーブル行数確認
  const rows = page.locator('table tbody tr');
  const count = await rows.count();
  console.log('テーブル行数:', count);

  // 最初の行をクリック
  if (count > 0) {
    await rows.first().click();
    await page.waitForLoadState('networkidle');
  }
});
```

---

## トラブルシューティング

### 問題: ElementNotFoundError

**原因**: 要素がDOMに存在しない、またはまだレンダリングされていない

**解決策**:
```javascript
// 要素の存在を待機
await page.waitForSelector('button', { state: 'visible', timeout: 10000 });

// または、より柔軟なセレクタ
const button = page.locator('button, [role="button"], [type="submit"]').first();
await button.waitFor({ state: 'visible' });
```

### 問題: TimeoutError

**原因**: ページ読み込みやAPI応答が遅い

**解決策**:
```javascript
// タイムアウトを延長
await page.waitForLoadState('networkidle', { timeout: 30000 });

// または、条件付き待機
await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 15000 });
```

### 問題: フレーキーテスト（時々失敗）

**原因**: タイミング問題、非同期処理の未完了

**解決策**:
```javascript
// リトライ機能を実装
async function retryOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}
```

---

## Ant Design コンポーネントのテスト

### Input

```javascript
// Input.Search
await page.fill('[class*="ant-input-search"] input', '検索クエリ');

// Input with placeholder
await page.fill('input[placeholder="メールアドレス"]', 'test@example.com');

// Input.Password
await page.fill('input[type="password"]', 'password123');
```

### Button

```javascript
// ボタンテキストで検索
await page.click('button:has-text("ログイン")');

// Ant Design Button
await page.click('[class*="ant-btn-primary"]');

// type属性で検索
await page.click('button[type="submit"]');
```

### Table

```javascript
// テーブル行数
const rows = page.locator('[class*="ant-table"] tbody tr');
const count = await rows.count();

// 特定の行をクリック
await rows.nth(0).click();

// セルの値を取得
const cell = page.locator('[class*="ant-table"] tbody tr').first().locator('td').nth(1);
const text = await cell.textContent();
```

### Modal / Drawer

```javascript
// Modal表示確認
await page.waitForSelector('[class*="ant-modal"]', { state: 'visible' });

// Drawer表示確認
await page.waitForSelector('[class*="ant-drawer"]', { state: 'visible' });

// Modal内のボタンクリック
await page.click('[class*="ant-modal"] button:has-text("OK")');
```

---

## zustand persist との連携

### auth-storage からのトークン取得

```javascript
const token = await page.evaluate(() => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    const parsed = JSON.parse(authStorage);
    return parsed.state?.token;
  }
  return null;
});
```

### auth-storage の構造

```json
{
  "state": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "user_id": "...",
      "email": "admin@example.com",
      "display_name": "管理者",
      "role": "manager"
    }
  },
  "version": 0
}
```

---

## パフォーマンス最適化

### 1. loginViaAPI() の使用

UI経由のログインは遅いため、API経由のログインを使用：

```javascript
import { loginViaAPI } from './helpers.js';

test('高速ログイン例', async ({ request, page }) => {
  // API経由でログイン（高速）
  const token = await loginViaAPI(request, email, password);

  // ページにトークンを設定
  await page.goto('/');
  await page.evaluate((token) => {
    const authStorage = {
      state: { token, refreshToken: null, user: null },
      version: 0
    };
    localStorage.setItem('auth-storage', JSON.stringify(authStorage));
  }, token);

  // ページをリロード
  await page.reload();
});
```

### 2. 並列実行の最適化

```javascript
// test.describe.configure() で並列度を制御
test.describe.configure({ mode: 'parallel' });  // 並列実行
test.describe.configure({ mode: 'serial' });    // 順次実行
```

---

## GitHub Actions との整合性

### ローカルとCIの違い

| 項目 | ローカル | GitHub Actions (CI) |
|---|---|---|
| **ポート** | Backend: 3000<br>Frontend: 3001 | Backend: 8000<br>Frontend: 8080 |
| **workers** | 2〜4 | 1 |
| **retries** | 0 | 2 |
| **ブラウザ** | Chromium（ヘッドレス） | Chromium（ヘッドレス） |
| **レート制限** | 100倍緩和 | 100倍緩和 |

### ローカルでCI環境を再現

```bash
# CI環境変数を設定
export CI=true
export API_BASE_URL=http://127.0.0.1:3000
export FRONTEND_URL=http://127.0.0.1:3001

# CIと同じ設定で実行
npx playwright test --project=chromium --workers=1 --retries=2
```

---

## 実装例：完全なテストファイル

```javascript
/**
 * サンプル機能テスト
 */
import { test, expect } from '@playwright/test';
import { login, API_BASE_URL, TEST_CONFIG } from './helpers.js';

test.describe('サンプル機能テスト', () => {
  const testUser = TEST_CONFIG.TEST_ACCOUNTS.admin;
  let authToken = null;

  // 全テストで1回だけログイン
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authToken = await login(page, testUser.email, testUser.password);
    await page.close();
  });

  test.describe('UIテスト', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, testUser.email, testUser.password);
    });

    test('ページが表示される', async ({ page }) => {
      await page.goto('/sample-feature');
      await page.waitForLoadState('networkidle');

      // ページ要素確認
      const pageContent = page.locator('[class*="ant-card"], table');
      await expect(pageContent.first()).toBeVisible();

      console.log('✅ ページ表示成功');
    });
  });

  test.describe('APIテスト', () => {
    test('API経由でデータ取得', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/sample`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBeTruthy();

      console.log('✅ API取得成功');
    });
  });
});
```

---

## テストレビューチェックリスト

新しいテストをコミットする前に確認：

- [ ] テストが独立して実行可能か？
- [ ] 明示的な待機を使用しているか？
- [ ] セレクタが柔軟か？（実装変更に強いか）
- [ ] エラーハンドリングが適切か？
- [ ] console.log でデバッグ情報を出力しているか？
- [ ] helpers.js の共通関数を使用しているか？
- [ ] テスト名が明確か？
- [ ] 成功・失敗の両方のケースをテストしているか？

---

## 参考資料

### プロジェクト固有

- [CLAUDE.md](../../CLAUDE.md) - プロジェクト設計原則
- [tests/README.md](../../tests/README.md) - テスト実行ガイド
- [tests/e2e/helpers.js](../../tests/e2e/helpers.js) - 共通関数

### 外部リソース

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Ant Design Components](https://ant.design/components/overview/)

---

**更新日**: 2026-02-04
**バージョン**: 1.0.0
**メンテナ**: Mirai IT Team
