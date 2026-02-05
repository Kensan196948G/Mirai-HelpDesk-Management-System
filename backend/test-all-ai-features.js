/**
 * 全 AI 機能の統合テストスクリプト
 *
 * 実行方法:
 * node test-all-ai-features.js
 */

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

async function testTranslation() {
  console.log('\n🌐 1. 翻訳機能テスト');
  console.log('─────────────────────────────────────');

  try {
    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `以下のテキストを日本語から英語に翻訳してください。翻訳結果のみを返してください。

テキスト: Outlookで添付ファイルが送信できません。エラーメッセージは「ファイルサイズが大きすぎます」と表示されます。`
      }]
    });

    const translation = response.content[0].text;

    console.log('✅ 翻訳成功');
    console.log(`  入力: Outlookで添付ファイルが送信できません...`);
    console.log(`  出力: ${translation}`);
    console.log(`  トークン: ${response.usage.input_tokens + response.usage.output_tokens}合計`);

    return { success: true, translation };
  } catch (error) {
    console.error('❌ 翻訳失敗:', error.message);
    return { success: false, error: error.message };
  }
}

async function testSentimentAnalysis() {
  console.log('\n😊 2. 感情分析テスト');
  console.log('─────────────────────────────────────');

  try {
    const comments = [
      '対応が遅すぎます。もう2時間も待っているのに連絡がありません。',
      'ありがとうございました。迅速に対応していただき助かりました。',
      '問題は解決しましたが、もう少し早く対応してほしかったです。'
    ];

    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `以下のコメントを分析し、感情（positive/neutral/negative）と顧客満足度スコア（0-100）を予測してください。JSON形式で回答してください。

コメント:
${comments.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

回答形式:
\`\`\`json
{
  "overall_sentiment": "negative",
  "satisfaction_score": 45,
  "comments": [
    {
      "comment_index": 1,
      "sentiment": "negative",
      "score": 20,
      "keywords": ["遅い", "待っている"]
    }
  ]
}
\`\`\``
      }]
    });

    const analysis = response.content[0].text;

    console.log('✅ 感情分析成功');
    console.log(`  コメント数: ${comments.length}`);
    console.log(`  分析結果:\n${analysis.substring(0, 300)}...`);
    console.log(`  トークン: ${response.usage.input_tokens + response.usage.output_tokens}合計`);

    return { success: true, analysis };
  } catch (error) {
    console.error('❌ 感情分析失敗:', error.message);
    return { success: false, error: error.message };
  }
}

async function testEscalationRiskDetection() {
  console.log('\n⚠️  3. エスカレーションリスク検知テスト');
  console.log('─────────────────────────────────────');

  try {
    const ticketInfo = {
      created_at: '2026-02-04T10:00:00Z',
      elapsed_time: '5時間',
      status: 'In Progress',
      priority: 'P1',
      sla_remaining: '30分',
      comment_count: 8,
      reassignment_count: 3,
      recent_comments: [
        '担当者が3回変わりました。いつ解決するのでしょうか？',
        '上司から催促されています。至急対応をお願いします。',
        '現在調査中です。もう少しお待ちください。'
      ]
    };

    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `以下のチケット情報を分析し、エスカレーションリスクを評価してください。

チケット情報:
- 作成日時: ${ticketInfo.created_at}
- 経過時間: ${ticketInfo.elapsed_time}
- ステータス: ${ticketInfo.status}
- 優先度: ${ticketInfo.priority}
- SLA残り時間: ${ticketInfo.sla_remaining}
- コメント数: ${ticketInfo.comment_count}
- 担当者変更回数: ${ticketInfo.reassignment_count}

最新コメント:
${ticketInfo.recent_comments.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

JSON形式で以下を回答してください:
\`\`\`json
{
  "risk_level": "high",
  "risk_score": 0.87,
  "risk_factors": [
    {
      "factor": "sla_approaching",
      "description": "SLA期限まで残り30分です。",
      "severity": 0.9
    }
  ],
  "sla_breach_prediction": {
    "likely_to_breach": true,
    "estimated_breach_time": "2026-02-04T15:30:00Z"
  },
  "recommended_actions": [
    "即座にManagerにエスカレーション",
    "一時回避策の提案を検討"
  ]
}
\`\`\``
      }]
    });

    const riskAnalysis = response.content[0].text;

    console.log('✅ リスク検知成功');
    console.log(`  優先度: ${ticketInfo.priority}, SLA残り: ${ticketInfo.sla_remaining}`);
    console.log(`  分析結果:\n${riskAnalysis.substring(0, 400)}...`);
    console.log(`  トークン: ${response.usage.input_tokens + response.usage.output_tokens}合計`);

    return { success: true, riskAnalysis };
  } catch (error) {
    console.error('❌ リスク検知失敗:', error.message);
    return { success: false, error: error.message };
  }
}

async function testKnowledgeGeneration() {
  console.log('\n📚 4. ナレッジ記事生成テスト');
  console.log('─────────────────────────────────────');

  try {
    const similarTickets = [
      {
        subject: 'Outlookで添付ファイルが送信できない',
        description: '10MB以上のファイルを添付すると「ファイルサイズが大きすぎます」とエラーが出る。',
        resolution: 'OneDrive共有リンクを使用することで解決。添付ファイルのサイズ制限は10MBまで。'
      },
      {
        subject: '大容量ファイルをメールで送れない',
        description: '20MBのPDFファイルを送信しようとしたが、エラーで送信できない。',
        resolution: 'SharePointにアップロードして共有リンクを送付することで解決。'
      },
      {
        subject: 'メール添付ファイルのサイズ制限について',
        description: '添付ファイルの上限サイズを知りたい。',
        resolution: 'Exchange Onlineの添付ファイル上限は10MB。それ以上はOneDrive/SharePointを使用。'
      }
    ];

    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `以下の類似チケットから、FAQ形式のナレッジ記事を生成してください。

類似チケット:
${similarTickets.map((t, i) => `
【チケット${i + 1}】
件名: ${t.subject}
詳細: ${t.description}
解決方法: ${t.resolution}
`).join('\n')}

以下の形式でナレッジ記事を作成してください:

# タイトル

## 問題の概要
[問題の説明]

## 原因
[根本原因の説明]

## 解決方法
1. [手順1]
2. [手順2]

## 回避策
[代替手段]

## 関連情報
[参考リンクや補足情報]`
      }]
    });

    const knowledgeArticle = response.content[0].text;

    console.log('✅ ナレッジ生成成功');
    console.log(`  入力チケット数: ${similarTickets.length}`);
    console.log(`  生成された記事:\n${knowledgeArticle.substring(0, 500)}...`);
    console.log(`  トークン: ${response.usage.input_tokens + response.usage.output_tokens}合計`);

    return { success: true, knowledgeArticle };
  } catch (error) {
    console.error('❌ ナレッジ生成失敗:', error.message);
    return { success: false, error: error.message };
  }
}

async function testSmartSearch() {
  console.log('\n🔍 5. スマート検索テスト');
  console.log('─────────────────────────────────────');

  try {
    const naturalLanguageQuery = '先月Outlookの添付ファイルで問題があったチケットを探して';

    const ticketsDatabase = [
      { id: 'T-001', subject: 'Outlookで添付ファイルが送信できない', created: '2026-01-15' },
      { id: 'T-002', subject: 'Teamsの画面共有ができない', created: '2026-01-20' },
      { id: 'T-003', subject: 'OneDriveの同期エラー', created: '2026-01-25' },
      { id: 'T-004', subject: 'メール添付ファイルのサイズ制限について', created: '2026-01-28' },
      { id: 'T-005', subject: 'SharePointファイルのアップロードエラー', created: '2026-02-01' }
    ];

    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `自然言語クエリに基づいて、関連するチケットを検索してください。

検索クエリ: "${naturalLanguageQuery}"

利用可能なチケット:
${ticketsDatabase.map(t => `${t.id}: ${t.subject} (作成日: ${t.created})`).join('\n')}

JSON形式で関連度の高い順に回答してください:
\`\`\`json
{
  "query": "${naturalLanguageQuery}",
  "results": [
    {
      "ticket_id": "T-001",
      "relevance_score": 0.95,
      "matched_keywords": ["Outlook", "添付ファイル"],
      "reasoning": "検索クエリに完全一致"
    }
  ]
}
\`\`\``
      }]
    });

    const searchResults = response.content[0].text;

    console.log('✅ スマート検索成功');
    console.log(`  クエリ: "${naturalLanguageQuery}"`);
    console.log(`  検索結果:\n${searchResults.substring(0, 400)}...`);
    console.log(`  トークン: ${response.usage.input_tokens + response.usage.output_tokens}合計`);

    return { success: true, searchResults };
  } catch (error) {
    console.error('❌ スマート検索失敗:', error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  🤖 全AI機能 統合テスト                                ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  console.log(`\n📋 環境設定:`);
  console.log(`  - CLAUDE_MODEL: ${process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929'}`);
  console.log(`  - AI_ENABLED: ${process.env.AI_ENABLED}`);

  const results = {
    translation: null,
    sentiment: null,
    escalation: null,
    knowledge: null,
    search: null
  };

  const startTime = Date.now();

  // 各テストを順番に実行
  results.translation = await testTranslation();
  await sleep(1000); // レート制限対策

  results.sentiment = await testSentimentAnalysis();
  await sleep(1000);

  results.escalation = await testEscalationRiskDetection();
  await sleep(1000);

  results.knowledge = await testKnowledgeGeneration();
  await sleep(1000);

  results.search = await testSmartSearch();

  const totalTime = Date.now() - startTime;

  // サマリー表示
  console.log('\n\n╔════════════════════════════════════════════════════════╗');
  console.log('║  📊 テスト結果サマリー                                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const tests = [
    { name: '翻訳機能', result: results.translation },
    { name: '感情分析', result: results.sentiment },
    { name: 'エスカレーションリスク検知', result: results.escalation },
    { name: 'ナレッジ記事生成', result: results.knowledge },
    { name: 'スマート検索', result: results.search }
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
    console.log('\n🎉 すべてのAI機能が正常に動作しています！\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  一部のテストが失敗しました。エラーログを確認してください。\n');
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runAllTests();
