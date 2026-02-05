/**
 * Gemini & Perplexity API 統合テストスクリプト
 *
 * 実行方法:
 * cd backend && npm run build && node test-gemini-perplexity.js
 */

require('dotenv').config();
const { GeminiAPIClient } = require('./dist/services/gemini-api.client');
const { PerplexityAPIClient } = require('./dist/services/perplexity-api.client');

async function testGeminiEmbedding() {
  console.log('\n🌟 1. Gemini Embedding テスト');
  console.log('─────────────────────────────────────');

  try {
    const gemini = new GeminiAPIClient();

    const sampleTexts = [
      'Outlookで添付ファイルが送信できない',
      'Teamsで画面共有ができない',
      'OneDriveの同期が止まっている'
    ];

    for (const text of sampleTexts) {
      console.log(`\n📝 テキスト: "${text}"`);

      const embedding = await gemini.generateEmbedding(text, {
        cacheKey: `embedding:${Buffer.from(text).toString('base64').substring(0, 20)}`
      });

      console.log(`  ✅ 埋め込みベクトル生成成功`);
      console.log(`  📊 次元数: ${embedding.length}`);
      console.log(`  📈 最初の5要素: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);

      // コサイン類似度計算のサンプル
      if (sampleTexts.indexOf(text) === 1) {
        console.log(`  💡 ベクトル検索で類似チケットを検索可能`);
      }
    }

    await gemini.disconnect();

    return { success: true };
  } catch (error) {
    console.error('❌ Gemini Embedding テスト失敗:', error.message);
    return { success: false, error: error.message };
  }
}

async function testPerplexitySearch() {
  console.log('\n🔍 2. Perplexity Search テスト');
  console.log('─────────────────────────────────────');

  try {
    const perplexity = new PerplexityAPIClient();

    const queries = [
      {
        query: 'Microsoft Teams で画面共有ができない場合の最新のトラブルシューティング方法を教えてください',
        systemPrompt: 'あなたはITヘルプデスクのエキスパートです。最新の技術情報を基に、簡潔で実用的な回答を提供してください。'
      }
    ];

    for (const { query, systemPrompt } of queries) {
      console.log(`\n❓ クエリ: "${query.substring(0, 50)}..."`);

      const result = await perplexity.search(query, systemPrompt, {
        cacheKey: `perplexity:${Buffer.from(query).toString('base64').substring(0, 20)}`
      });

      console.log(`  ✅ 検索成功`);
      console.log(`  ⏱️  処理時間: ${result.processingTime}ms`);
      console.log(`  📚 ソース数: ${result.sources.length}`);
      console.log(`  📝 回答:\n${result.answer.substring(0, 200)}...`);

      if (result.sources.length > 0) {
        console.log(`\n  🔗 参照ソース:`);
        result.sources.slice(0, 3).forEach((source, i) => {
          console.log(`    ${i + 1}. ${source}`);
        });
      }
    }

    await perplexity.disconnect();

    return { success: true };
  } catch (error) {
    console.error('❌ Perplexity Search テスト失敗:', error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  🤖 Gemini & Perplexity 統合テスト                     ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  console.log(`\n📋 環境設定:`);
  console.log(`  - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  - PERPLEXITY_API_KEY: ${process.env.PERPLEXITY_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  - GEMINI_EMBEDDING_MODEL: ${process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004'}`);
  console.log(`  - PERPLEXITY_MODEL: ${process.env.PERPLEXITY_MODEL || 'sonar-pro'}`);

  const results = {
    gemini: null,
    perplexity: null
  };

  const startTime = Date.now();

  // 各テストを順番に実行
  results.gemini = await testGeminiEmbedding();
  await sleep(2000); // レート制限対策

  results.perplexity = await testPerplexitySearch();

  const totalTime = Date.now() - startTime;

  // サマリー表示
  console.log('\n\n╔════════════════════════════════════════════════════════╗');
  console.log('║  📊 テスト結果サマリー                                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const tests = [
    { name: 'Gemini Embedding', result: results.gemini },
    { name: 'Perplexity Search', result: results.perplexity }
  ];

  let successCount = 0;
  tests.forEach(test => {
    const status = test.result?.success ? '✅ 成功' : '❌ 失敗';
    console.log(`  ${status}  ${test.name}`);
    if (test.result?.success) successCount++;
  });

  console.log(`\n  成功率: ${successCount}/${tests.length} (${Math.round(successCount / tests.length * 100)}%)`);
  console.log(`  総実行時間: ${(totalTime / 1000).toFixed(1)}秒`);

  if (successCount === tests.length) {
    console.log('\n🎉 すべてのAPI統合が正常に動作しています！');
    console.log('\n💡 次のステップ:');
    console.log('  1. ベクトル検索機能の実装（Gemini Embedding + PostgreSQL pgvector）');
    console.log('  2. 外部ナレッジ検索機能の実装（Perplexity + ナレッジベース）');
    console.log('  3. マルチモデルルーティングの最適化\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  一部のテストが失敗しました。APIキーを確認してください。\n');
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runAllTests();
