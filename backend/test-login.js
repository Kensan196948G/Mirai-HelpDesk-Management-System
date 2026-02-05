/**
 * ログイン API テストスクリプト
 */

require('dotenv').config();
const axios = require('axios');

async function testLogin() {
  console.log('🔐 ログイン API テスト\n');

  const API_BASE_URL = 'http://localhost:3000';

  const credentials = [
    { email: 'admin@example.com', password: 'Admin123!' },
    { email: 'agent@example.com', password: 'Admin123!' },
    { email: 'admin@example.com', password: 'password123' },
    { email: 'agent@example.com', password: 'password123' }
  ];

  for (const cred of credentials) {
    try {
      console.log(`テスト: ${cred.email} / ${cred.password}`);

      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: cred.email,
        password: cred.password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        console.log(`  ✅ ログイン成功!`);
        console.log(`  トークン: ${response.data.data.token.substring(0, 50)}...`);
        console.log(`  ユーザー: ${response.data.data.user.display_name} (${response.data.data.user.role})`);
        console.log('');

        return {
          success: true,
          email: cred.email,
          password: cred.password,
          token: response.data.data.token,
          user: response.data.data.user
        };
      }
    } catch (error) {
      if (error.response) {
        console.log(`  ❌ ログイン失敗: ${error.response.data.error?.message || error.response.data}`);
      } else {
        console.log(`  ❌ エラー: ${error.message}`);
      }
      console.log('');
    }
  }

  console.log('⚠️  すべてのログイン試行が失敗しました\n');
  return { success: false };
}

testLogin().then(result => {
  if (result.success) {
    console.log('✅ ログイン機能は正常に動作しています');
    console.log('   正しい認証情報:');
    console.log(`   - Email: ${result.email}`);
    console.log(`   - Password: ${result.password}`);
    process.exit(0);
  } else {
    console.log('❌ ログイン機能に問題があります');
    process.exit(1);
  }
});
