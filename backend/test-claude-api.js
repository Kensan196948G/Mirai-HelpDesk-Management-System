/**
 * Claude API 接続テストスクリプト
 *
 * 実行方法:
 * node test-claude-api.js
 */

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

async function testClaudeAPI() {
  console.log('🔍 Claude API 接続テスト開始...\n');

  // 環境変数確認
  console.log('📋 環境変数確認:');
  console.log(`  - CLAUDE_API_KEY: ${process.env.CLAUDE_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  - CLAUDE_MODEL: ${process.env.CLAUDE_MODEL || 'デフォルト値を使用'}`);
  console.log(`  - AI_ENABLED: ${process.env.AI_ENABLED}\n`);

  if (!process.env.CLAUDE_API_KEY) {
    console.error('❌ CLAUDE_API_KEY が設定されていません。');
    process.exit(1);
  }

  try {
    // Claude APIクライアント初期化
    const client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
      apiVersion: '2023-06-01',
    });

    console.log('📡 Claude API にリクエスト送信中...\n');

    // 利用可能なモデルを試す
    const modelsToTry = [
      'claude-3-5-sonnet-latest',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
    ];

    let response = null;
    let usedModel = null;

    for (const modelId of modelsToTry) {
      try {
        console.log(`  試行中: ${modelId}...`);
        const startTime = Date.now();

        response = await client.messages.create({
          model: modelId,
          max_tokens: 100,
          temperature: 0.3,
          messages: [
            {
              role: 'user',
              content: 'こんにちは。簡単な接続テストです。「OK」と返信してください。',
            },
          ],
        });

        usedModel = modelId;
        console.log(`  ✅ ${modelId} で接続成功!\n`);
        break;
      } catch (err) {
        console.log(`  ❌ ${modelId} は利用できません (${err.status || 'エラー'})`);
        if (err.status !== 404) {
          // 404以外のエラーの場合は詳細を表示
          console.log(`     詳細: ${err.message}`);
        }
      }
    }

    if (!response) {
      throw new Error('利用可能なモデルが見つかりませんでした。APIキーを確認してください。');
    }

    const endTime = Date.now();

    console.log('✅ Claude API 接続成功!\n');
    console.log('📊 レスポンス情報:');
    console.log(`  - 使用モデル: ${usedModel}`);
    console.log(`  - 使用トークン: ${response.usage.input_tokens} (入力) + ${response.usage.output_tokens} (出力) = ${response.usage.input_tokens + response.usage.output_tokens} (合計)`);
    console.log(`\n💬 Claude の応答:`);
    console.log(`  "${response.content[0].text}"\n`);

    // .envファイルに推奨モデルを表示
    console.log(`💡 推奨設定: .env ファイルの CLAUDE_MODEL を "${usedModel}" に設定してください。\n`);

    // Redis接続テスト
    console.log('🔍 Redis 接続テスト...');
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    await redis.set('test-key', 'Hello Redis!');
    const value = await redis.get('test-key');
    await redis.del('test-key');

    console.log(`  ✅ Redis 接続成功: "${value}"\n`);

    redis.disconnect();

    console.log('🎉 すべてのテスト完了! AI機能統合の準備が整いました。\n');

  } catch (error) {
    console.error('❌ エラー発生:\n');
    console.error(error.message);

    if (error.status === 401) {
      console.error('\n💡 APIキーが無効です。環境変数 CLAUDE_API_KEY を確認してください。');
    } else if (error.status === 429) {
      console.error('\n💡 レート制限に達しました。しばらく待ってから再試行してください。');
    }

    process.exit(1);
  }
}

testClaudeAPI();
