/**
 * バックエンドログインAPI直接テスト
 */

const http = require('http');

const data = JSON.stringify({
  email: 'admin@example.com',
  password: 'Admin123!'
});

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('📤 リクエスト送信:');
console.log('  URL:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('  データ:', data);
console.log('');

const req = http.request(options, (res) => {
  console.log('📥 レスポンス受信:');
  console.log('  ステータス:', res.statusCode);
  console.log('  ヘッダー:', JSON.stringify(res.headers, null, 2));
  console.log('');

  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('📄 レスポンスボディ:');
    try {
      const parsed = JSON.parse(responseData);
      console.log(JSON.stringify(parsed, null, 2));

      if (parsed.success) {
        console.log('\n✅ ログイン成功！');
        console.log('  トークン:', parsed.data.token.substring(0, 20) + '...');
        console.log('  ユーザー:', parsed.data.user.email);
      } else {
        console.log('\n❌ ログイン失敗');
        console.log('  エラー:', parsed.error.message);
      }
    } catch (e) {
      console.log(responseData);
      console.log('\n❌ JSONパースエラー:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ リクエストエラー:', error.message);
});

req.write(data);
req.end();
