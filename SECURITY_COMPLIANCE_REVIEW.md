# セキュリティ・コンプライアンスレビューレポート

**レビュー日時**: 2026-02-12
**レビュー対象**: Mirai ヘルプデスク管理システム
**レビュー担当**: Security/Compliance Agent

---

## 📊 セキュリティスコア: **78/100** (良好)

| 観点 | スコア | 評価 |
|------|--------|------|
| 認証認可 | 85/100 | 良好 - JWT + RBAC実装済み |
| 監査証跡 | 90/100 | 優秀 - 追記専用ログ完備 |
| SOD準拠 | 95/100 | 優秀 - DBトリガーで強制 |
| 脆弱性対策 | 70/100 | 要改善 - XSS/CSRF対策不足 |
| データ保護 | 75/100 | 良好 - PII Masking実装済み |
| レート制限 | 60/100 | 要改善 - メモリベース（本番不可） |
| セキュリティヘッダー | 70/100 | 良好 - Helmet導入済み |

---

## ✅ 優れている点（Strong Points）

### 1. 監査証跡の完全性（90点）
**実装状況**: 優秀

#### 追記専用テーブル設計
- ✅ `ticket_history`: UPDATE/DELETE禁止トリガー実装
- ✅ `m365_execution_logs`: 監査証跡として完全保護
- ✅ トリガー関数: `prevent_ticket_history_modification()`, `prevent_m365_execution_logs_modification()`

```sql
-- database/migrations/006_create_ticket_history.sql (36-51行目)
CREATE TRIGGER prevent_ticket_history_update
BEFORE UPDATE ON ticket_history
FOR EACH ROW
EXECUTE FUNCTION prevent_ticket_history_modification();

CREATE TRIGGER prevent_ticket_history_delete
BEFORE DELETE ON ticket_history
FOR EACH ROW
EXECUTE FUNCTION prevent_ticket_history_modification();
```

#### 自動履歴記録
- ✅ `log_ticket_changes()`: チケット更新時に自動記録（016_fix_trigger_and_seed.sql）
- ✅ ステータス変更、担当者変更、優先度変更を自動追跡
- ✅ 操作者ID、操作時刻、変更前後の値を完全記録

**評価**: 監査証跡の要件を完全に満たしており、ITIL/SOX準拠レベル。

---

### 2. SOD（職務分離）準拠（95点）
**実装状況**: 優秀

#### DBトリガーによるSOD強制
```sql
-- database/migrations/009_create_m365_execution_logs.sql (82-116行目)
CREATE OR REPLACE FUNCTION check_sod_violation()
RETURNS TRIGGER AS $$
DECLARE
  approval_approver_id UUID;
BEGIN
  -- 承認者を取得
  SELECT approver_id INTO approval_approver_id
  FROM approvals
  WHERE approval_id = (SELECT approval_id FROM m365_tasks WHERE task_id = NEW.task_id);

  -- SOD違反チェック: 承認者 ≠ 実施者
  IF approval_approver_id = NEW.operator_id THEN
    RAISE EXCEPTION 'SOD違反: 承認者と実施者が同一です。';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**評価**:
- ✅ DBレベルでSOD強制（アプリケーション層を迂回不可）
- ✅ 承認者 ≠ 実施者を確実に保証
- ✅ エラーメッセージが明確

**推奨**: 同様のチェックを最終承認者にも適用（承認者 ≠ 最終承認者）。

---

### 3. 認証認可（85点）
**実装状況**: 良好

#### JWT認証
- ✅ bcrypt ハッシュ化（salt rounds=10） - `backend/src/models/user.model.ts:18`
- ✅ JWT トークン検証: `authenticate` ミドルウェア
- ✅ リフレッシュトークン実装（7日間有効）
- ✅ トークン期限切れ/不正トークンのエラーハンドリング

```typescript
// backend/src/middleware/auth.ts (40-44行目)
const decoded = jwt.verify(token, jwtSecret) as {
  user_id: string;
  email: string;
  role: UserRole;
};
```

#### RBAC（役割ベースアクセス制御）
- ✅ 6役割定義: Requester / Agent / M365_Operator / Approver / Manager / Auditor
- ✅ `authorize` ミドルウェアで役割チェック
- ✅ ルート保護の適用例:

```typescript
// backend/src/routes/m365.routes.ts
router.use(authenticate);
router.post('/tasks', authorize(UserRole.M365_OPERATOR), ...);
router.post('/execute_log', authorize(UserRole.M365_OPERATOR), ...);
```

**評価**: 基本的な認証認可は堅牢。ただし、パスワードポリシーが弱い（後述）。

---

### 4. データ保護（75点）
**実装状況**: 良好

#### PII Masking
- ✅ `backend/src/utils/pii-masking.ts` でメールアドレス、電話番号、IPアドレスを自動マスク
- ✅ AI送信前のマスキング: `maskForAI()`
- ✅ ログ記録用の厳格なマスキング: `maskForLog()`

```typescript
// backend/src/utils/pii-masking.ts (27-41行目)
static maskForAI(text: string): PIIMaskingResult {
  // メールアドレス
  if (this.EMAIL_REGEX.test(text)) {
    masked = masked.replace(this.EMAIL_REGEX, '[EMAIL_MASKED]');
    hasPII = true;
    maskedFields.push('email');
  }
  // ...
}
```

#### ファイルアップロードセキュリティ
- ✅ 拡張子ホワイトリスト（`.jpg`, `.pdf`, `.docx`等）
- ✅ MIMEタイプ検証
- ✅ ファイルサイズ制限（10MB）
- ✅ SHA-256ハッシュ計算（整合性確保）

```typescript
// backend/src/middleware/upload.ts (14-42行目)
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', ...];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'application/pdf', ...];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
```

**評価**: ファイルアップロードセキュリティは堅牢。PII Maskingも実装済み。

---

### 5. SQL Injection対策（85点）
**実装状況**: 良好

#### パラメータ化クエリ
- ✅ 全てのクエリで`pg`ライブラリのパラメータプレースホルダー（`$1`, `$2`...）を使用
- ✅ 文字列連結によるSQL構築なし

```typescript
// backend/src/controllers/attachment.controller.ts (例)
const result = await client.query(
  'SELECT ticket_id, requester_id, assignee_id FROM tickets WHERE ticket_id = $1',
  [ticketId]
);
```

**評価**: SQLインジェクションリスクは極めて低い。全てパラメータ化済み。

---

## ⚠️ 重大な問題（Critical Issues）

### 1. CSRF対策なし（重要度: 高）

**問題**: CSRFトークンの実装が確認できない。

**影響**:
- 攻撃者が被害者の権限で意図しない操作を実行可能
- 特にM365操作（重要な権限変更）が危険

**対策オプション**:

#### オプション1: csurf ミドルウェア導入（推奨）
- **内容**: Express用CSRFミドルウェアを導入
- **影響範囲**: 中（全APIエンドポイント）
- **リスク**: 低（既存のテストが失敗する可能性）
- **実装例**:
```typescript
import csrf from 'csurf';
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);
```

#### オプション2: SameSite Cookie属性（即効性）
- **内容**: JWTトークンをCookieに保存し、`SameSite=Strict`を設定
- **影響範囲**: 小（認証フロー変更）
- **リスク**: 低
- **実装例**:
```typescript
res.cookie('token', token, { httpOnly: true, sameSite: 'strict', secure: true });
```

#### オプション3: Double Submit Cookie（軽量）
- **内容**: CSRFトークンをCookieとリクエストヘッダーの両方で送信
- **影響範囲**: 中（フロントエンド変更必要）
- **リスク**: 低

**推奨順序**: オプション2（即効性） → オプション1（本格対策）

---

### 2. XSS対策不足（重要度: 高）

**問題**:
- サニタイゼーション実装が確認できない（`sanitize`, `escape`関数なし）
- フロントエンドでのユーザー入力エスケープが不明

**影響**:
- チケット本文、コメントに悪意のあるスクリプトを埋め込まれる可能性
- 他のユーザーのセッション乗っ取り

**対策オプション**:

#### オプション1: DOMPurify（フロントエンド）（推奨）
- **内容**: React側でユーザー入力をサニタイズ
- **影響範囲**: 中（フロントエンド全体）
- **リスク**: 低
- **実装例**:
```typescript
import DOMPurify from 'dompurify';
const cleanHTML = DOMPurify.sanitize(userInput);
```

#### オプション2: validator.js（バックエンド）
- **内容**: バックエンドで入力検証＋エスケープ
- **影響範囲**: 中（全入力バリデーション）
- **リスク**: 低
- **実装例**:
```typescript
import validator from 'validator';
const escaped = validator.escape(userInput);
```

#### オプション3: Content-Security-Policy ヘッダー（防御層追加）
- **内容**: CSPヘッダーでインラインスクリプト禁止
- **影響範囲**: 小（Helmet設定変更）
- **リスク**: 中（既存のインラインスクリプトが動作しなくなる可能性）
- **実装例**:
```typescript
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
  }
}));
```

**推奨順序**: オプション1（DOMPurify） + オプション3（CSP）の組み合わせ

---

### 3. レート制限がメモリベース（重要度: 高）

**問題**:
- `backend/src/middleware/rateLimit.ts` がインメモリ実装
- 本番環境で複数サーバー構成時に機能しない
- サーバー再起動でカウントリセット

```typescript
// backend/src/middleware/rateLimit.ts (11-12行目)
const store: RateLimitStore = {};
```

**影響**:
- DDoS攻撃に脆弱
- API悪用の防止が不可能

**対策オプション**:

#### オプション1: Redis統合（推奨）
- **内容**: Redisをレート制限ストアとして使用
- **影響範囲**: 中（Redis依存追加）
- **リスク**: 低
- **実装例**:
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
const limiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000,
  max: 100,
});
```

#### オプション2: express-rate-limit（ライブラリ置換）
- **内容**: 本格的なレート制限ライブラリに置き換え
- **影響範囲**: 小（現在のrateLimit.ts置換）
- **リスク**: 低

**推奨順序**: オプション1（Redis統合）

---

### 4. パスワードポリシー弱い（重要度: 中）

**問題**:
- パスワード複雑性要件なし（長さ、文字種チェックなし）
- `backend/src/controllers/auth.controller.ts` で検証なし

**影響**:
- 脆弱なパスワードによるブルートフォース攻撃リスク

**対策オプション**:

#### オプション1: バリデーション追加（推奨）
- **内容**: 8文字以上、大文字・小文字・数字・記号を含む
- **影響範囲**: 小（auth.controller.ts のみ）
- **リスク**: 低
- **実装例**:
```typescript
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
if (!passwordRegex.test(password)) {
  throw new AppError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character', 400);
}
```

#### オプション2: パスワード強度ライブラリ（zxcvbn）
- **内容**: パスワード強度を動的評価
- **影響範囲**: 小
- **リスク**: 低

**推奨順序**: オプション1（バリデーション追加）

---

## ⚠️ 改善推奨項目（Recommendations）

### 5. セキュリティヘッダー不完全（重要度: 中）

**問題**:
- Helmet.jsは導入済みだが、詳細設定なし
- Content-Security-Policy、HSTS等の明示的設定が確認できない

**対策オプション**:

#### オプション1: Helmet詳細設定（推奨）
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));
```

---

### 6. JWT Secret管理（重要度: 中）

**問題**:
- `.env` ファイルに平文でJWT_SECRETを保存
- `.gitignore` には含まれているが、環境変数管理が脆弱

**対策オプション**:

#### オプション1: AWS Secrets Manager / Azure Key Vault（推奨）
- **内容**: クラウドシークレット管理サービスを使用
- **影響範囲**: 中（デプロイフロー変更）
- **リスク**: 低

#### オプション2: dotenv-vault
- **内容**: 暗号化された環境変数管理
- **影響範囲**: 小
- **リスク**: 低

---

### 7. ログ機密情報マスキング（重要度: 中）

**問題**:
- エラーログでスタックトレースに機密情報が含まれる可能性
- 開発環境でスタックトレースをクライアントに返す

```typescript
// backend/src/middleware/errorHandler.ts (56-58行目)
if (process.env.NODE_ENV !== 'production') {
  response.error.stack = err.stack;
}
```

**対策**: 本番環境でも絶対にスタックトレースをクライアントに返さない（現状OK）。

---

### 8. セッション固定攻撃対策（重要度: 低）

**問題**:
- ログイン成功時に新しいセッションIDを発行していない（JWT使用のため影響少）

**対策**: JWT方式では該当しないが、リフレッシュトークンのローテーション実装を推奨。

---

### 9. ファイルマルウェアスキャン（重要度: 中）

**問題**:
- アップロードファイルのマルウェアスキャンなし
- `backend/src/middleware/upload.ts` で拡張子・MIMEタイプチェックのみ

**対策オプション**:

#### オプション1: ClamAV統合
- **内容**: オープンソースアンチウイルスエンジン統合
- **影響範囲**: 中（Docker統合、新依存関係）
- **リスク**: 中（スキャン時間によるパフォーマンス低下）

#### オプション2: クラウドスキャンAPI（AWS S3 Malware Protection）
- **内容**: AWS/Azure/GCPのマルウェアスキャンサービス
- **影響範囲**: 中
- **リスク**: 低（コスト増）

---

### 10. ブルートフォース攻撃対策（重要度: 中）

**問題**:
- ログイン失敗回数制限なし
- アカウントロックアウト機能なし

**対策オプション**:

#### オプション1: ログイン失敗カウンター
- **内容**: Redis/DBでログイン失敗回数を追跡、5回失敗で15分間ロック
- **影響範囲**: 中
- **リスク**: 低

---

## 📋 課題サマリー（Issues Summary）

| ID | 課題 | 重要度 | 影響範囲 | 推奨対策 |
|----|------|--------|----------|---------|
| 1 | CSRF対策なし | 高 | 全API | SameSite Cookie → csurf導入 |
| 2 | XSS対策不足 | 高 | フロントエンド全体 | DOMPurify + CSP |
| 3 | レート制限（メモリベース） | 高 | 本番環境 | Redis統合 |
| 4 | パスワードポリシー弱い | 中 | 認証フロー | 複雑性要件追加 |
| 5 | セキュリティヘッダー不完全 | 中 | 全レスポンス | Helmet詳細設定 |
| 6 | JWT Secret管理 | 中 | デプロイ | Secrets Manager |
| 7 | ログ機密情報 | 中 | ログ | マスキング徹底 |
| 8 | セッション固定攻撃 | 低 | 認証フロー | トークンローテーション |
| 9 | ファイルマルウェアスキャン | 中 | ファイルアップロード | ClamAV統合 |
| 10 | ブルートフォース対策 | 中 | ログイン | 失敗回数制限 |

---

## 🚀 推奨される次期ステップ（優先度順）

### フェーズ1: 即効性対策（1-2日）
1. **CSRF対策（SameSite Cookie）** - 即日実装可能
2. **パスワードポリシー追加** - 0.5日
3. **Helmet詳細設定** - 0.5日

### フェーズ2: 重要対策（3-5日）
4. **XSS対策（DOMPurify + CSP）** - 2日
5. **Redis統合（レート制限）** - 2日
6. **ブルートフォース対策** - 1日

### フェーズ3: 高度対策（1-2週間）
7. **CSRF対策（csurf）** - 3日
8. **ファイルマルウェアスキャン** - 3-5日
9. **JWT Secret管理（Secrets Manager）** - 2日
10. **セキュリティ監査ダッシュボード** - 3日

---

## 📝 コンプライアンス準拠状況

| 基準 | 準拠状況 | 備考 |
|------|----------|------|
| ITIL監査証跡 | ✅ 完全準拠 | 追記専用ログ実装済み |
| SOX法（SOD） | ✅ 完全準拠 | DBトリガーで強制 |
| GDPR（データ保護） | ⚠️ 部分準拠 | PII Masking実装済み、削除権（Right to Erasure）未実装 |
| OWASP Top 10 | ⚠️ 部分準拠 | SQLインジェクション対策済み、XSS/CSRF要改善 |
| ISO 27001 | ⚠️ 部分準拠 | 認証認可・監査証跡は準拠、暗号化・アクセス制御要改善 |

---

## 🔍 追加調査が必要な項目

1. **フロントエンドのセキュリティ実装**
   - React側のXSS対策
   - LocalStorageへのJWT保存方法
   - CSRFトークン実装状況

2. **M365統合のセキュリティ**
   - Graph APIクライアント認証情報の保管方法
   - サービスプリンシパルの権限範囲
   - M365操作のロールバック手順の実装状況

3. **WebSocketセキュリティ**
   - `backend/src/websocket/socketServer.ts` の認証実装
   - メッセージ検証・サニタイゼーション

---

## 📞 レビュー担当者コメント

本システムは監査証跡とSOD準拠において非常に高いレベルを達成しています。特にDBトリガーによるSOD強制は、アプリケーション層の脆弱性を補完する優れた設計です。

一方で、OWASP Top 10対策（特にXSS/CSRF）とレート制限のRedis統合が未完了であり、本番運用前に必ず対応が必要です。

全体的なセキュリティスコア **78/100** は「良好」レベルですが、**85点以上（優秀）** を目指して上記の改善を推奨します。

---

**レビュー完了**
**次のアクション**: 本レポートをチームリードに報告し、フェーズ1対策の実装承認を得る。
