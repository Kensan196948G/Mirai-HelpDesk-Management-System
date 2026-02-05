/**
 * AI API 直接テストスクリプト（認証バイパス）
 *
 * 実行方法:
 * node test-ai-api.js
 */

require('dotenv').config();
const { AIService } = require('./dist/services/ai.service');

async function testAIClassification() {
  console.log('🤖 AI分類API テスト開始...\n');

  const testTicket = {
    subject: 'Outlookで添付ファイルが送信できない',
    description:
      '昨日から、Outlookで10MB以上の添付ファイルを送信しようとするとエラーが発生します。' +
      'エラーメッセージは「ファイルサイズが大きすぎます」と表示されます。' +
      '急ぎで大きなファイルを送る必要があるので、早急に対応してほしいです。',
    requester_id: 'a3f182d0-d492-4bd0-bc1b-b6bb37bb43ae', // admin@example.com
  };

  console.log('📋 テストチケット:');
  console.log(`  件名: ${testTicket.subject}`);
  console.log(`  詳細: ${testTicket.description.substring(0, 50)}...`);
  console.log('');

  try {
    const startTime = Date.now();

    const result = await AIService.classifyTicket(testTicket);

    const endTime = Date.now();

    console.log('✅ AI分類成功!\n');
    console.log('📊 分類結果:');

    if (result.predictions.category) {
      console.log(`\n📁 カテゴリ:`);
      console.log(`  - 予測値: ${result.predictions.category.value}`);
      console.log(`  - ラベル: ${result.predictions.category.label || 'N/A'}`);
      console.log(`  - 信頼度: ${(result.predictions.category.confidence * 100).toFixed(1)}%`);
      console.log(`  - 根拠: ${result.predictions.category.rationale?.reasoning || 'N/A'}`);
    }

    if (result.predictions.priority) {
      console.log(`\n🔥 優先度:`);
      console.log(`  - 予測値: ${result.predictions.priority.value}`);
      console.log(`  - 信頼度: ${(result.predictions.priority.confidence * 100).toFixed(1)}%`);
      console.log(`  - 根拠: ${result.predictions.priority.rationale?.reasoning || 'N/A'}`);
    }

    if (result.predictions.assignee) {
      console.log(`\n👤 担当者:`);
      console.log(`  - 予測値: ${result.predictions.assignee.value}`);
      console.log(`  - ラベル: ${result.predictions.assignee.label || 'N/A'}`);
      console.log(`  - 信頼度: ${(result.predictions.assignee.confidence * 100).toFixed(1)}%`);
    }

    console.log(`\n⏱️  処理時間: ${endTime - startTime}ms`);
    console.log(`🤖 使用モデル: ${result.model_version}`);
    console.log(`🔒 PII マスク: ${result.pii_masked ? 'あり' : 'なし'}`);

    console.log('\n✅ テスト完了！AI分類APIは正常に動作しています。\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ エラー発生:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testAIClassification();
