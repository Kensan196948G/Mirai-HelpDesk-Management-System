/**
 * AI Smart Search Service
 *
 * 自然言語クエリをSQLに変換して検索する機能
 */

import { getClaudeAPIClient } from './claude-api.client';
import { claudeConfig } from '../config/claude.config';
import { query } from '../config/database';

export interface SmartSearchInput {
  natural_language_query: string;
  user_id: string;
  max_results?: number;
}

export interface SmartSearchResult {
  tickets: any[];
  generated_sql: string;
  interpretation: string;
  filters_applied: {
    status?: string[];
    priority?: string[];
    category?: string;
    date_range?: { start: string; end: string };
    assignee?: string;
  };
  total_results: number;
  processing_time_ms: number;
}

export class AISmartSearchService {
  /**
   * 自然言語クエリをSQL に変換して検索
   */
  static async searchWithNaturalLanguage(input: SmartSearchInput): Promise<SmartSearchResult> {
    const startTime = Date.now();
    const claudeClient = getClaudeAPIClient();
    const { natural_language_query, max_results = 50 } = input;

    // 1. データベーススキーマ情報を取得
    const schemaInfo = await this.getSchemaInfo();

    // 2. プロンプト生成
    const prompt = `あなたはSQLエキスパートです。以下の自然言語クエリを、安全なSELECTクエリに変換してください。

# データベーススキーマ
${schemaInfo}

# 自然言語クエリ
「${natural_language_query}」

# タスク
上記の自然言語クエリを、以下の形式で解釈し、SQLクエリに変換してください：

1. **interpretation**: クエリの解釈（日本語）
2. **filters_applied**: 適用されたフィルター条件
3. **sql_query**: 生成されたSQLクエリ（SELECT文のみ、安全性を確保）

# 制約
- **SELECT文のみ**: INSERT, UPDATE, DELETE は禁止
- **パラメータ化**: WHERE句の値は $1, $2 のプレースホルダーを使用
- **LIMIT句必須**: 最大${max_results}件に制限
- **JOINの最適化**: 必要最小限のJOINのみ使用

# 出力形式
\`\`\`json
{
  "interpretation": "過去7日間のOutlook関連のP1チケットを、作成日時の降順で表示",
  "filters_applied": {
    "date_range": { "start": "2025-01-28", "end": "2025-02-04" },
    "keywords": ["Outlook"],
    "priority": ["P1"],
    "status": null
  },
  "sql_query": "SELECT t.ticket_id, t.ticket_number, t.subject, t.priority, t.status, t.created_at FROM tickets t LEFT JOIN categories c ON t.category_id = c.category_id WHERE (t.subject ILIKE $1 OR t.description ILIKE $1 OR c.name ILIKE $1) AND t.priority = $2 AND t.created_at >= $3 ORDER BY t.created_at DESC LIMIT $4",
  "parameters": ["%Outlook%", "P1", "2025-01-28T00:00:00Z", 50]
}
\`\`\`

**重要**:
- SQL インジェクション対策として、必ずパラメータ化してください
- WHERE句の値は直接埋め込まず、$1, $2 のプレースホルダーを使用
- DROP, DELETE, UPDATE, INSERT は絶対に含めないでください`;

    // 3. Claude API 呼び出し
    try {
      const claudeResponse = await claudeClient.sendPrompt(
        prompt,
        'あなたはSQLエキスパートです。セキュリティを最優先し、安全なクエリのみを生成してください。',
        {
          maxTokens: 2048,
          temperature: 0.2, // 決定論的（SQLは一貫性が重要）
        }
      );

      // 4. レスポンスをパース
      const searchData = this.parseSmartSearchResponse(claudeResponse);

      // 5. SQL安全性検証
      this.validateSQLSafety(searchData.sql_query);

      // 6. クエリ実行
      const ticketsResult = await query(searchData.sql_query, searchData.parameters);

      const processingTime = Date.now() - startTime;

      console.log(`✅ スマート検索完了: ${ticketsResult.rows.length}件 (${processingTime}ms)`);

      return {
        tickets: ticketsResult.rows,
        generated_sql: searchData.sql_query,
        interpretation: searchData.interpretation,
        filters_applied: searchData.filters_applied,
        total_results: ticketsResult.rows.length,
        processing_time_ms: processingTime,
      };
    } catch (error: any) {
      console.error('❌ スマート検索エラー:', error);
      throw new Error(`スマート検索に失敗しました: ${error.message}`);
    }
  }

  /**
   * データベーススキーマ情報を取得
   */
  private static async getSchemaInfo(): Promise<string> {
    return `
# tickets テーブル
- ticket_id (UUID)
- ticket_number (VARCHAR) - 例: HD-2025-00123
- type (ticket_type) - 'incident' または 'service_request'
- subject (TEXT) - 件名
- description (TEXT) - 詳細
- status (ticket_status) - 'new', 'triage', 'assigned', 'in_progress', 'resolved', 'closed'等
- priority (VARCHAR) - 'P1', 'P2', 'P3', 'P4'
- impact (impact_level) - 'individual', 'department', 'company_wide', 'external'
- urgency (urgency_level) - 'low', 'medium', 'high', 'immediate'
- category_id (UUID) - カテゴリへの外部キー
- requester_id (UUID) - 依頼者
- assignee_id (UUID) - 担当者
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- resolved_at (TIMESTAMP)
- closed_at (TIMESTAMP)
- due_at (TIMESTAMP) - SLA期限

# categories テーブル
- category_id (UUID)
- name (VARCHAR) - カテゴリ名
- path (VARCHAR) - 階層パス（例: Microsoft 365 > Exchange Online）

# users テーブル
- user_id (UUID)
- display_name (VARCHAR) - 表示名
- email (VARCHAR)
- role (user_role) - 'requester', 'agent', 'm365_operator', 'approver', 'manager', 'auditor'
`;
  }

  /**
   * SQL安全性検証（インジェクション対策）
   */
  private static validateSQLSafety(sql: string): void {
    // 危険なキーワードをチェック
    const dangerousKeywords = [
      /\bDROP\b/i,
      /\bDELETE\b/i,
      /\bUPDATE\b/i,
      /\bINSERT\b/i,
      /\bALTER\b/i,
      /\bCREATE\b/i,
      /\bTRUNCATE\b/i,
      /\bEXEC\b/i,
      /\bEVAL\b/i,
      /;.*SELECT/i, // セミコロンで複数クエリを実行
    ];

    for (const keyword of dangerousKeywords) {
      if (keyword.test(sql)) {
        throw new Error(`危険なSQLキーワードが検出されました: ${keyword.source}`);
      }
    }

    // SELECT文で始まることを確認
    if (!sql.trim().toUpperCase().startsWith('SELECT')) {
      throw new Error('SELECT文のみが許可されています');
    }

    console.log('✅ SQL安全性検証: 合格');
  }

  /**
   * Claude APIレスポンスをパース
   */
  private static parseSmartSearchResponse(response: string): {
    interpretation: string;
    filters_applied: any;
    sql_query: string;
    parameters: any[];
  } {
    try {
      let jsonText = response;
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonText);

      return {
        interpretation: parsed.interpretation,
        filters_applied: parsed.filters_applied || {},
        sql_query: parsed.sql_query,
        parameters: parsed.parameters || [],
      };
    } catch (error) {
      console.error('❌ スマート検索レスポンスのパース失敗:', response);
      throw new Error('スマート検索結果の解析に失敗しました。');
    }
  }
}
