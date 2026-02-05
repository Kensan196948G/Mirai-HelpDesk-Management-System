/**
 * パスワードハッシュ生成ツール
 */

const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'Admin123!';
  const saltRounds = 10;

  console.log(`パスワード: "${password}"`);
  console.log(`Salt Rounds: ${saltRounds}`);
  console.log('');

  const hash = await bcrypt.hash(password, saltRounds);
  console.log('生成されたハッシュ:');
  console.log(hash);
  console.log('');

  // 検証テスト
  const isValid = await bcrypt.compare(password, hash);
  console.log(`検証結果: ${isValid ? '✅ 成功' : '❌ 失敗'}`);
  console.log('');

  // SQLクエリ生成
  console.log('SQLクエリ（全ユーザーのパスワードを更新）:');
  console.log('');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email IN ('admin@example.com', 'agent@example.com', 'operator@example.com', 'approver@example.com', 'user@example.com');`);
}

generateHash();
