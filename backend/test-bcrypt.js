/**
 * bcrypt パスワード検証テスト
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function testPasswordVerification() {
  console.log('🔧 データベース接続設定:');
  console.log('  Host:', process.env.DB_HOST);
  console.log('  Port:', process.env.DB_PORT);
  console.log('  Database:', process.env.DB_NAME);
  console.log('  User:', process.env.DB_USER);

  // PostgreSQL接続
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mirai_helpdesk',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || undefined,
  });

  try {
    await client.connect();
    console.log('✅ PostgreSQL接続成功');

    // ユーザー情報を取得
    const result = await client.query(
      'SELECT email, password_hash, role FROM users WHERE email = $1',
      ['admin@example.com']
    );

    if (result.rows.length === 0) {
      console.log('❌ ユーザーが見つかりません');
      return;
    }

    const user = result.rows[0];
    console.log('\n📊 ユーザー情報:');
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Password Hash:', user.password_hash);
    console.log('  Hash Type:', user.password_hash ? user.password_hash.substring(0, 4) : 'null');

    // パスワード検証テスト
    const passwords = ['Admin123!', 'password123', 'Admin123', 'admin123'];

    console.log('\n🔐 パスワード検証テスト:');

    for (const password of passwords) {
      try {
        const isValid = await bcrypt.compare(password, user.password_hash);
        console.log(`  ${password.padEnd(15)}: ${isValid ? '✅ 正しい' : '❌ 間違い'}`);

        if (isValid) {
          console.log(`\n🎉 正しいパスワード: "${password}"`);
        }
      } catch (error) {
        console.log(`  ${password.padEnd(15)}: ❌ エラー (${error.message})`);
      }
    }

    // 新しいハッシュを生成してテスト
    console.log('\n🔧 新しいハッシュ生成テスト:');
    const newHash = await bcrypt.hash('Admin123!', 10);
    console.log('  新しいハッシュ:', newHash);

    const newVerify = await bcrypt.compare('Admin123!', newHash);
    console.log('  検証結果:', newVerify ? '✅ 成功' : '❌ 失敗');

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.end();
  }
}

testPasswordVerification();
