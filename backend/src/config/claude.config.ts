/**
 * Claude API 設定
 *
 * Anthropic Claude API の接続設定と定数を管理
 */

import dotenv from 'dotenv';

dotenv.config();

export interface ClaudeConfig {
  apiKey: string;
  apiVersion: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export const claudeConfig: ClaudeConfig = {
  apiKey: process.env.CLAUDE_API_KEY || '',
  apiVersion: process.env.CLAUDE_API_VERSION || '2023-06-01',
  model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
  maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '8192', 10),
  temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.3'),
  timeout: 30000, // 30秒
};

// APIキー検証
if (!claudeConfig.apiKey) {
  console.warn(
    '⚠️  CLAUDE_API_KEY が設定されていません。AI機能は無効です。'
  );
}

// AI機能制御
export const aiFeatureConfig = {
  enabled: process.env.AI_ENABLED === 'true',
  rateLimitPerUser: parseInt(process.env.AI_RATE_LIMIT_PER_USER || '10', 10),
  cacheTTL: parseInt(process.env.AI_CACHE_TTL || '3600', 10), // 秒
};

// プロンプトテンプレート（日本語最適化）
export const promptTemplates = {
  ticketClassification: `あなたは社内ITヘルプデスクの経験豊富なエージェントです。
以下のチケット内容を分析し、適切な分類を提案してください。

# チケット内容
件名: {subject}
詳細: {description}

# 利用可能なカテゴリ
{categories}

# 過去の類似チケット（参考）
{similar_tickets}

# タスク
以下の項目を予測し、JSON形式で回答してください：

1. **category_id**: 最も適切なカテゴリのUUID
2. **priority**: P1（最高）からP4（最低）の優先度
3. **impact**: individual（個人）/ department（部署）/ company_wide（全社）/ external（対外影響）
4. **urgency**: low（低）/ medium（中）/ high（高）/ immediate（即時）
5. **suggested_assignee_id**: 推奨担当者のUUID（適切な専門知識を持つ人）
6. **confidence_score**: 各予測の信頼度（0.0-1.0）
7. **reasoning**: なぜその判断に至ったかの説明（日本語、簡潔に）

# 出力形式（必ずこの形式で回答してください）
\`\`\`json
{
  "category": {
    "value": "category-uuid-here",
    "confidence": 0.92,
    "reasoning": "キーワード「Outlook」「添付ファイル」から、Exchange Online の問題と判断しました。"
  },
  "priority": {
    "value": "P3",
    "confidence": 0.85,
    "reasoning": "個人の業務に影響があるが、回避策が存在するため P3 と判断しました。"
  },
  "impact": {
    "value": "individual",
    "confidence": 0.88
  },
  "urgency": {
    "value": "medium",
    "confidence": 0.83
  },
  "assignee": {
    "value": "assignee-uuid-here",
    "confidence": 0.78,
    "reasoning": "Exchange Online 設定は M365 Operator の担当領域です。"
  }
}
\`\`\`

**重要**: JSON以外の説明文は不要です。必ず上記フォーマットの JSON のみを返してください。`,

  knowledgeSearch: `あなたは社内ITヘルプデスクのナレッジベース検索エンジンです。

# 検索クエリ
{query}

# ナレッジベース（全文）
{knowledge_articles}

# タスク
検索クエリに最も関連性の高いナレッジ記事を特定し、関連度スコアを付けて回答してください。

# 出力形式
\`\`\`json
{
  "results": [
    {
      "article_id": "article-uuid-1",
      "relevance_score": 0.96,
      "matched_keywords": ["Outlook", "添付ファイル", "サイズ制限"],
      "snippet": "...記事の関連箇所を抜粋..."
    }
  ]
}
\`\`\``,

  answerSuggestion: `あなたは社内ITヘルプデスクの経験豊富なエージェントです。
以下のチケットに対する回答候補を生成してください。

# チケット情報
件名: {subject}
詳細: {description}
カテゴリ: {category}
ステータス: {status}

# コメント履歴
{comments}

# 関連ナレッジ記事
{related_knowledge}

# タスク
利用者に送信する回答文を3つ提案してください。それぞれ異なるアプローチ（詳細説明 vs 簡潔手順 vs 代替策）で作成してください。

# 出力形式
\`\`\`json
{
  "suggestions": [
    {
      "content": "回答文（日本語、丁寧語）",
      "approach": "detailed_explanation",
      "confidence": 0.94,
      "linked_articles": ["kb-uuid-1", "kb-uuid-2"]
    }
  ]
}
\`\`\``,

  serviceRequestRouting: `あなたは社内ITヘルプデスクの経験豊富なルーティングスペシャリストです。
以下のチケット情報を分析し、適切な担当者と承認フローを判定してください。

# チケット情報
種別: {type}
件名: {subject}
詳細: {description}
カテゴリ: {category}

# 利用可能な担当者（役割別）
{available_assignees}

# 承認ルール
- ライセンス変更: Manager承認必須
- 権限付与（管理者権限）: Manager承認必須
- 特権アカウント操作: Manager承認必須
- 通常のサービス要求: Agent対応可能（承認不要）

# M365操作テンプレート
{m365_templates}

# タスク
以下を判定し、JSON形式で回答してください：

1. **requires_approval**: この要求に承認が必要か（true/false）
2. **approval_reason**: 承認が必要な理由（承認必要時のみ）
3. **suggested_approver_id**: 推奨承認者のUUID（承認必要時のみ）
4. **suggested_assignee_id**: 推奨担当者のUUID
5. **confidence_score**: 判定の信頼度（0.0-1.0）
6. **reasoning**: 判断根拠（日本語、簡潔に）
7. **matched_rules**: 適用したルール名の配列

# 出力形式
\`\`\`json
{
  "requires_approval": true,
  "approval_reason": "Microsoft 365ライセンス変更は財務影響があるため、Manager承認が必要です。",
  "suggested_approver": {
    "value": "approver-uuid",
    "confidence": 0.95,
    "reasoning": "IT Manager は全ライセンス変更の承認権限を持っています。"
  },
  "suggested_assignee": {
    "value": "assignee-uuid",
    "confidence": 0.92,
    "reasoning": "M365 Operator は Microsoft 365 の操作経験が豊富です。"
  },
  "rationale": {
    "reasoning": "ライセンス変更は財務影響とセキュリティリスクを伴うため、Manager の承認が必要です。",
    "matched_rules": ["RULE_LICENSE_CHANGE", "RULE_M365_OPERATOR"]
  }
}
\`\`\``,

  escalationRiskDetection: `あなたは社内ITヘルプデスクのエスカレーション予測エキスパートです。
以下のチケット情報を分析し、エスカレーションリスクを評価してください。

# チケット情報
作成日時: {created_at}
経過時間: {elapsed_time}
ステータス: {status}
優先度: {priority}
SLA残り時間: {sla_remaining}
コメント数: {comment_count}
担当者変更回数: {reassignment_count}

# コメント履歴（最新5件）
{recent_comments}

# タスク
以下を評価し、JSON形式で回答してください：

1. **risk_level**: low / medium / high / critical
2. **risk_score**: 0.0-1.0
3. **risk_factors**: リスク要因の配列
4. **sla_breach_prediction**: SLA違反予測
5. **recommended_actions**: 推奨アクション

# 出力形式
\`\`\`json
{
  "risk_level": "high",
  "risk_score": 0.87,
  "risk_factors": [
    {
      "factor": "sla_approaching",
      "description": "SLA期限まで残り30分です。",
      "severity": 0.9
    },
    {
      "factor": "multiple_reassignments",
      "description": "担当者が3回変更されており、対応が滞っています。",
      "severity": 0.7
    }
  ],
  "sla_breach_prediction": {
    "likely_to_breach": true,
    "estimated_breach_time": "2025-01-15T14:30:00Z",
    "current_sla_remaining": "25分"
  },
  "recommended_actions": [
    "即座にManager にエスカレーション",
    "一時回避策の提案を検討",
    "利用者への状況説明コメントを追加"
  ]
}
\`\`\``,

  // AI対話アシスタント: 診断質問生成
  chatDiagnostic: `あなたは経験豊富なITヘルプデスクエージェントです。
利用者の問題を効率的に診断するため、的を絞った質問を2-4個生成してください。

# 初期問題文
{initial_problem}

# 会話履歴
{conversation_history}

# タスク
以下の観点から、診断に必要な情報を特定し、質問を生成してください：

1. **環境情報**: OS、ブラウザ、アプリケーションバージョン
2. **症状の詳細**: いつから、頻度、影響範囲
3. **エラー情報**: エラーメッセージ、エラーコード
4. **影響度**: 業務への影響、緊急度
5. **過去の対応**: 以前に同じ問題が発生したか、試したこと

# 質問生成のガイドライン
- 質問は具体的で、簡潔に答えられる形式にする
- 優先順位が高い情報から質問する
- 専門用語を避け、利用者が理解しやすい言葉を使う
- はい/いいえ、または短い回答で答えられる質問を優先
- 重複を避ける
- 必要に応じて、選択肢（suggested_answers）を提供する

# 出力形式（必ずこの形式で回答してください）
\`\`\`json
{
  "questions": [
    {
      "question_id": "q1",
      "question_text": "この問題はいつから発生していますか？",
      "question_type": "symptom",
      "suggested_answers": ["今日から", "昨日から", "1週間以上前から", "不明"],
      "rationale": "発生時期を特定することで、システム変更やアップデートとの関連を確認できます。"
    },
    {
      "question_id": "q2",
      "question_text": "エラーメッセージは表示されますか？表示される場合、その内容を教えてください。",
      "question_type": "error",
      "suggested_answers": null,
      "rationale": "エラーメッセージから問題の原因を特定できます。"
    }
  ],
  "analysis": {
    "detected_category": "M365 > Exchange Online",
    "severity_estimate": "medium",
    "requires_immediate_escalation": false
  }
}
\`\`\`

**重要**: JSON以外の説明文は不要です。必ず上記フォーマットの JSON のみを返してください。`,

  // AI対話アシスタント: 解決提案生成
  chatSolution: `あなたはITヘルプデスクの経験豊富なトラブルシューティングエキスパートです。
利用者の問題に対する解決策を3つのアプローチで提案してください。

# 会話履歴
{conversation_history}

# 診断回答
{diagnostic_answers}

# 関連ナレッジ記事（{knowledge_count}件）
{knowledge_articles}

# タスク
以下の3つのアプローチで解決策を提案してください：

## 1. 即座の自己解決策（Self-Service）
- 利用者自身で実施できる具体的な手順
- ステップバイステップの説明（番号付き）
- 期待される結果の明示
- 所要時間の見積もり（「5-10分」形式）

## 2. 一時的な回避策（Workaround）
- 根本解決ではないが、業務を継続できる方法
- 制限事項や注意点の明示
- 根本解決までの暫定措置として提示

## 3. エスカレーション経路（Escalation）
- ITサポートへのチケット作成が必要な理由
- 推奨される type, impact, urgency
- エージェントへの追加情報

# 解決策生成のガイドライン
- 手順は具体的で、技術知識がない利用者でも実行可能にする
- スクリーンショットが必要な手順には明示する
- PowerShellコマンドやURLは正確に記載する
- 関連ナレッジ記事を積極的に参照する（linked_articles配列）
- リスクがある操作には警告を含める

# エスカレーション判定基準
以下のいずれかに該当する場合、エスカレーションを推奨：
- 特権操作（管理者権限）が必要
- システム設定変更が必要
- 問題の原因が不明確
- ナレッジベースに該当する解決策がない
- 影響度が部署以上
- 緊急度が高以上

# 出力形式（必ずこの形式で回答してください）
\`\`\`json
{
  "solutions": [
    {
      "solution_id": "sol-1",
      "approach_type": "self_service",
      "title": "Outlookキャッシュモードの再構築",
      "steps": [
        {
          "step_number": 1,
          "instruction": "Outlookを完全に終了します。タスクマネージャーでOutlook.exeが起動していないことを確認してください。",
          "expected_result": "Outlookのプロセスが完全に終了している状態",
          "screenshot_required": false
        },
        {
          "step_number": 2,
          "instruction": "Windowsキー + R を押して「ファイル名を指定して実行」を開き、「outlook.exe /resetnavpane」と入力してEnterを押します。",
          "command": "outlook.exe /resetnavpane",
          "expected_result": "Outlookが起動し、ナビゲーションペインがリセットされます。"
        }
      ],
      "linked_articles": ["kb-uuid-1", "kb-uuid-2"],
      "estimated_resolution_time": "10-15分",
      "confidence": 0.85,
      "prerequisites": ["管理者権限は不要", "作業中はメールの送受信ができません"],
      "warnings": ["OST ファイルの再構築中はOutlookを起動しないでください"]
    },
    {
      "solution_id": "sol-2",
      "approach_type": "workaround",
      "title": "OneDrive経由でファイル共有",
      "steps": [
        {
          "step_number": 1,
          "instruction": "OneDrive for Businessにファイルをアップロードします。"
        },
        {
          "step_number": 2,
          "instruction": "ファイルを右クリックして「リンクの共有」を選択します。"
        }
      ],
      "linked_articles": ["kb-onedrive-share"],
      "estimated_resolution_time": "3-5分",
      "confidence": 0.78,
      "prerequisites": ["OneDrive for Businessのライセンス"],
      "warnings": ["ファイル共有のアクセス権限設定に注意してください"]
    },
    {
      "solution_id": "sol-3",
      "approach_type": "escalation",
      "title": "ITサポートへエスカレーション",
      "steps": [
        {
          "step_number": 1,
          "instruction": "以下の情報を含めてチケットを作成します：問題の詳細、試した対応、影響範囲"
        }
      ],
      "linked_articles": [],
      "estimated_resolution_time": "エージェント対応による",
      "confidence": 1.0,
      "prerequisites": null,
      "warnings": null
    }
  ],
  "escalation_recommendation": {
    "should_escalate": false,
    "reason": "利用者自身で実施可能な解決策が複数存在するため、まず自己解決を試行することを推奨します。自己解決策で解決しない場合は、エスカレーションを検討してください。",
    "suggested_ticket_values": {
      "type": "incident",
      "impact": "個人",
      "urgency": "中",
      "category_id": null
    }
  }
}
\`\`\`

**重要**: JSON以外の説明文は不要です。必ず上記フォーマットの JSON のみを返してください。`,

  // AI対話アシスタント: チケット作成
  chatTicketCreation: `あなたはITヘルプデスクのチケット管理エキスパートです。
会話履歴から、チケットの件名と詳細説明を生成してください。

# 会話履歴
{conversation_history}

# 診断回答
{diagnostic_answers}

# タスク
以下の要件でチケット情報を生成してください：

## 件名（Subject）
- 最大100文字
- 問題の本質を簡潔に表現
- キーワード: 製品名、症状、影響
- 例: "Outlook - 添付ファイル送信時にエラー発生"

## 詳細説明（Description）
以下の構造で記載：

【問題概要】
何が問題なのかを2-3文で要約

【発生状況】
- いつから: 発生時期
- 頻度: 常に/ときどき/特定条件下
- 影響範囲: 個人/チーム/部署

【診断結果】
AIが質問した内容とユーザーの回答を箇条書きで整理

【試行した解決策】
ユーザーが試した対応（あれば）

【エラー情報】
エラーメッセージやスクリーンショット言及（あれば）

【会話履歴】
タイムスタンプ付きの完全な会話ログ（監査証跡）
形式: [HH:MM:SS] ロール: メッセージ内容

# 出力形式（必ずこの形式で回答してください）
\`\`\`json
{
  "subject": "Outlook - 添付ファイル送信時にサイズ制限エラー",
  "description": "【問題概要】\\nOutlookで5MB以上の添付ファイルを送信しようとすると、サイズ制限エラーが表示され送信できません。営業部での顧客向け資料送信に支障が出ています。\\n\\n【発生状況】\\n- いつから: 今朝から\\n- 頻度: 常に（5MB以上のファイルで発生）\\n- 影響範囲: 個人（田中様のみ）\\n\\n【診断結果】\\n- ファイルサイズ: 10MBのExcelファイル\\n- エラーメッセージ: 「ファイルサイズが大きすぎます」\\n- Outlook バージョン: Microsoft 365版\\n- 他のメールクライアント: 未試行\\n\\n【試行した解決策】\\n- ファイル圧縮: 試行済み（7MBまで縮小、依然としてエラー）\\n- ファイル分割: 検討中\\n\\n【会話履歴】\\n[10:30:15] User: Outlookで大きなファイルを送信できません\\n[10:30:45] Assistant: この問題はいつから発生していますか？\\n[10:31:10] User: 今朝から急にエラーが出るようになりました\\n[10:31:30] Assistant: 送信しようとしているファイルのサイズを教えてください。\\n[10:32:00] User: 10MBのExcelファイルです",
  "conversation_summary": "営業部の利用者がOutlookで10MBのExcelファイルを送信しようとしたところ、サイズ制限エラーが発生。今朝から突然発生し、ファイル圧縮（7MBまで）を試行するも解決せず。顧客向け資料送信のため早急な対応が必要な状況。"
}
\`\`\`

**重要**: JSON以外の説明文は不要です。必ず上記フォーマットの JSON のみを返してください。`,
};
