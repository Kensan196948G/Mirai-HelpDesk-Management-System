/**
 * AI Chat Controller テストスクリプト
 *
 * 3つのフェーズをテスト:
 * 1. POST /api/ai/chat/diagnose - 診断質問生成
 * 2. POST /api/ai/chat/suggest-solution - 解決提案生成
 * 3. POST /api/ai/chat/create-ticket - チケット作成
 */

const API_BASE = 'http://localhost:3000/api';
let authToken = '';
let conversationHistory = [];

// カラー出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * ログイン
 */
async function login() {
  log('\n=== ステップ1: ログイン ===', 'cyan');

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'Admin123!',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`ログイン失敗: ${data.message || response.statusText}`);
  }

  authToken = data.data.token;
  log('✅ ログイン成功', 'green');
  log(`トークン: ${authToken.substring(0, 20)}...`, 'blue');

  return authToken;
}

/**
 * フェーズ1: 診断質問生成
 */
async function testDiagnoseRequest() {
  log('\n=== フェーズ1: 診断質問生成 ===', 'cyan');

  const initialProblem = 'Outlookで大きなファイルを添付して送信しようとすると、エラーが出て送信できません。';

  // 会話履歴に追加
  conversationHistory.push({
    timestamp: new Date().toISOString(),
    role: 'user',
    content: initialProblem,
  });

  const response = await fetch(`${API_BASE}/ai/chat/diagnose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      initial_problem: initialProblem,
      conversation_history: conversationHistory,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `診断質問生成失敗 (${response.status}): ${data.message || data.error || response.statusText}`
    );
  }

  log('✅ 診断質問生成成功', 'green');
  log(`処理時間: ${data.data.processing_time_ms}ms`, 'blue');
  log(`質問数: ${data.data.questions.length}件`, 'blue');
  log(`PII マスキング: ${data.data.pii_masked ? 'あり' : 'なし'}`, 'blue');

  if (data.data.questions && data.data.questions.length > 0) {
    log('\n生成された質問:', 'yellow');
    data.data.questions.forEach((q, index) => {
      log(`  ${index + 1}. ${q.question_text}`, 'white');
      if (q.suggested_answers) {
        log(`     選択肢: ${q.suggested_answers.join(', ')}`, 'blue');
      }
      log(`     タイプ: ${q.question_type}`, 'blue');
    });
  }

  if (data.data.analysis) {
    log('\n分析結果:', 'yellow');
    log(`  カテゴリ推定: ${data.data.analysis.detected_category || 'なし'}`, 'blue');
    log(`  重要度推定: ${data.data.analysis.severity_estimate || 'なし'}`, 'blue');
  }

  return data.data;
}

/**
 * フェーズ2: 解決提案生成
 */
async function testSuggestSolution() {
  log('\n=== フェーズ2: 解決提案生成 ===', 'cyan');

  // 診断回答（模擬）
  const diagnosticAnswers = [
    {
      question_id: 'q1',
      answer: '今朝から発生しています',
    },
    {
      question_id: 'q2',
      answer: '10MBのExcelファイルです',
    },
  ];

  // 会話履歴に追加
  conversationHistory.push({
    timestamp: new Date().toISOString(),
    role: 'assistant',
    content: 'この問題はいつから発生していますか？',
  });
  conversationHistory.push({
    timestamp: new Date().toISOString(),
    role: 'user',
    content: diagnosticAnswers[0].answer,
  });

  const response = await fetch(`${API_BASE}/ai/chat/suggest-solution`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      conversation_history: conversationHistory,
      diagnostic_answers: diagnosticAnswers,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `解決提案生成失敗 (${response.status}): ${data.message || data.error || response.statusText}`
    );
  }

  log('✅ 解決提案生成成功', 'green');
  log(`処理時間: ${data.data.processing_time_ms}ms`, 'blue');
  log(`提案数: ${data.data.solutions?.length || 0}件`, 'blue');
  log(`ナレッジ記事: ${data.data.knowledge_articles?.length || 0}件`, 'blue');

  if (data.data.solutions && data.data.solutions.length > 0) {
    log('\n生成された解決策:', 'yellow');
    data.data.solutions.forEach((sol, index) => {
      log(`  ${index + 1}. [${sol.approach_type}] ${sol.title}`, 'white');
      log(`     信頼度: ${(sol.confidence * 100).toFixed(1)}%`, 'blue');
      log(`     所要時間: ${sol.estimated_resolution_time}`, 'blue');
      log(`     ステップ数: ${sol.steps.length}`, 'blue');
    });
  }

  if (data.data.escalation_recommendation) {
    log('\nエスカレーション推奨:', 'yellow');
    log(
      `  必要性: ${data.data.escalation_recommendation.should_escalate ? 'はい' : 'いいえ'}`,
      'blue'
    );
    if (data.data.escalation_recommendation.reason) {
      log(`  理由: ${data.data.escalation_recommendation.reason}`, 'blue');
    }
  }

  return data.data;
}

/**
 * フェーズ3: チケット作成
 */
async function testCreateTicket() {
  log('\n=== フェーズ3: チケット作成 ===', 'cyan');

  const diagnosticAnswers = [
    {
      question_id: 'q1',
      answer: '今朝から発生しています',
    },
    {
      question_id: 'q2',
      answer: '10MBのExcelファイルです',
    },
  ];

  const userConfirmedValues = {
    type: 'incident',
    impact: 'individual',
    urgency: 'medium',
  };

  const response = await fetch(`${API_BASE}/ai/chat/create-ticket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      conversation_history: conversationHistory,
      diagnostic_answers: diagnosticAnswers,
      user_confirmed_values: userConfirmedValues,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `チケット作成失敗 (${response.status}): ${data.message || data.error || response.statusText}`
    );
  }

  log('✅ チケット作成成功', 'green');
  log(`処理時間: ${data.data.processing_time_ms}ms`, 'blue');
  log(`チケット番号: ${data.data.ticket.ticket_number}`, 'blue');
  log(`チケットID: ${data.data.ticket.ticket_id}`, 'blue');
  log(`件名: ${data.data.ticket.subject}`, 'blue');
  log(`優先度: ${data.data.ticket.priority}`, 'blue');

  if (data.data.ai_classification) {
    log('\nAI分類結果:', 'yellow');
    if (data.data.ai_classification.category) {
      log(
        `  カテゴリ: ${data.data.ai_classification.category.label || data.data.ai_classification.category.value} (信頼度: ${(data.data.ai_classification.category.confidence * 100).toFixed(1)}%)`,
        'blue'
      );
    }
    if (data.data.ai_classification.priority) {
      log(
        `  優先度: ${data.data.ai_classification.priority.value} (信頼度: ${(data.data.ai_classification.priority.confidence * 100).toFixed(1)}%)`,
        'blue'
      );
    }
  }

  return data.data;
}

/**
 * メイン実行
 */
async function main() {
  try {
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('   AI Chat Controller 統合テスト', 'cyan');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

    // ステップ1: ログイン
    await login();

    // フェーズ1: 診断質問生成
    const diagnoseResult = await testDiagnoseRequest();

    // フェーズ2: 解決提案生成
    const solutionResult = await testSuggestSolution();

    // フェーズ3: チケット作成
    const ticketResult = await testCreateTicket();

    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('   ✅ 全テスト成功！', 'green');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  } catch (error) {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red');
    log('   ❌ テスト失敗', 'red');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red');
    console.error(error);
    process.exit(1);
  }
}

// 実行
main();
