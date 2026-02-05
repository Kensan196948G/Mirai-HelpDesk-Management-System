/**
 * AI Knowledge Service
 *
 * ナレッジ記事の自動生成機能
 */

import { getClaudeAPIClient } from './claude-api.client';
import { claudeConfig } from '../config/claude.config';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface KnowledgeGenerationInput {
  similar_ticket_ids: string[];
  min_similarity_count?: number;
}

export interface GeneratedKnowledgeArticle {
  article_id: string;
  title: string;
  content: string;
  category_id: string;
  tags: string[];
  related_tickets: string[];
  confidence_score: number;
  requires_review: boolean;
  draft_status: 'draft' | 'pending_review' | 'published';
}

export class AIKnowledgeService {
  /**
   * 類似チケットからFAQ記事を自動生成
   */
  static async generateKnowledgeArticle(input: KnowledgeGenerationInput): Promise<GeneratedKnowledgeArticle> {
    const claudeClient = getClaudeAPIClient();
    const { similar_ticket_ids, min_similarity_count = 3 } = input;

    if (similar_ticket_ids.length < min_similarity_count) {
      throw new Error(`最低${min_similarity_count}件の類似チケットが必要です（現在: ${similar_ticket_ids.length}件）`);
    }

    // 1. 類似チケット情報を取得
    const ticketsResult = await query(
      `SELECT
        t.ticket_id,
        t.ticket_number,
        t.subject,
        t.description,
        t.resolution_summary,
        t.root_cause,
        c.name as category_name,
        c.category_id
      FROM tickets t
      LEFT JOIN categories c ON t.category_id = c.category_id
      WHERE t.ticket_id = ANY($1)
        AND t.status IN ('resolved', 'closed')
      ORDER BY t.resolved_at DESC`,
      [similar_ticket_ids]
    );

    const tickets = ticketsResult.rows;

    // 2. 各チケットの有用なコメントを取得
    const ticketsWithComments = await Promise.all(
      tickets.map(async (ticket: any) => {
        const commentsResult = await query(
          `SELECT body
           FROM ticket_comments
           WHERE ticket_id = $1
             AND visibility = 'public'
           ORDER BY created_at
           LIMIT 5`,
          [ticket.ticket_id]
        );

        return {
          ...ticket,
          comments: commentsResult.rows.map((c: any) => c.body),
        };
      })
    );

    // 3. プロンプト生成
    const ticketSummaries = ticketsWithComments
      .map(
        (t: any, i: number) => `
# チケット${i + 1}: ${t.ticket_number}
件名: ${t.subject}
詳細: ${t.description}
解決方法: ${t.resolution_summary || 'なし'}
根本原因: ${t.root_cause || 'なし'}
コメント:
${t.comments.map((c: string) => `- ${c}`).join('\n')}
`
      )
      .join('\n\n');

    const prompt = `あなたは社内ITヘルプデスクのナレッジマネジメントエキスパートです。
以下の類似チケットを分析し、FAQ記事を自動生成してください。

# 類似チケット（${tickets.length}件）
${ticketSummaries}

# タスク
上記の類似チケットから共通パターンを抽出し、以下の形式でFAQ記事を生成してください：

1. **title**: 記事タイトル（簡潔、検索しやすい）
2. **content**: 記事本文（マークダウン形式）
   - 問題の概要
   - 症状
   - 解決方法（ステップバイステップ）
   - 根本原因（わかる場合）
   - 予防策（今後同じ問題を防ぐ方法）
3. **tags**: 検索用タグ（3-5個）
4. **confidence_score**: 記事の信頼度（0.0-1.0）

# 出力形式
\`\`\`json
{
  "title": "Outlook添付ファイル送信エラーの解決方法",
  "content": "# 問題の概要\\n\\nOutlookで5MB以上の添付ファイルを送信しようとするとエラーが発生する問題です。\\n\\n## 症状\\n\\n- 添付ファイルをメールに添付すると、送信時にエラーメッセージが表示される\\n- エラーコード: 0x800CCC0F\\n\\n## 解決方法\\n\\n### ステップ1: Outlookキャッシュのクリア\\n\\n1. Outlook を起動\\n2. ファイル → オプション → 詳細設定\\n3. Outlookデータファイル → 今すぐクリア をクリック\\n\\n### ステップ2: Outlook の再起動\\n\\n1. Outlook を完全に終了\\n2. 再度起動\\n3. 添付ファイルの送信をテスト\\n\\n### ステップ3: 問題が解決しない場合\\n\\n- 添付ファイルのサイズを確認（25MBを超える場合は OneDrive 共有リンクを使用）\\n- IT部門に連絡（内線: 1234）\\n\\n## 根本原因\\n\\nOutlookのキャッシュが破損することで、添付ファイルの送信処理に失敗します。\\n\\n## 予防策\\n\\n- 定期的にOutlookキャッシュをクリア（月1回推奨）\\n- 大容量ファイルは OneDrive で共有",
  "tags": ["Outlook", "添付ファイル", "Exchange Online", "メール送信エラー", "キャッシュクリア"],
  "confidence_score": 0.92
}
\`\`\`

**重要**: JSON以外の説明文は不要です。必ず上記フォーマットの JSON のみを返してください。`;

    // 4. Claude API 呼び出し
    const claudeResponse = await claudeClient.sendPrompt(
      prompt,
      'あなたは社内ITヘルプデスクのナレッジマネジメントエキスパートです。',
      {
        maxTokens: 4096, // 長文生成のため大きめ
        temperature: 0.5, // やや創造性を重視
      }
    );

    // 5. レスポンスをパース
    const articleData = this.parseKnowledgeResponse(claudeResponse);

    // 6. ナレッジ記事を下書き保存
    const articleId = uuidv4();
    await query(
      `INSERT INTO knowledge_articles (
        article_id, title, content, category_id, tags, visibility, status,
        created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'internal', 'draft', 'ai-system', CURRENT_TIMESTAMP)`,
      [
        articleId,
        articleData.title,
        articleData.content,
        tickets[0].category_id, // 最初のチケットのカテゴリを使用
        articleData.tags,
      ]
    );

    // 7. 関連チケットを記録（将来: knowledge_article_tickets テーブル）
    console.log(`✅ ナレッジ記事を下書き保存: ${articleId}`);

    return {
      article_id: articleId,
      title: articleData.title,
      content: articleData.content,
      category_id: tickets[0].category_id,
      tags: articleData.tags,
      related_tickets: similar_ticket_ids,
      confidence_score: articleData.confidence_score,
      requires_review: true,
      draft_status: 'draft',
    };
  }

  /**
   * Claude APIレスポンスをパース
   */
  private static parseKnowledgeResponse(response: string): {
    title: string;
    content: string;
    tags: string[];
    confidence_score: number;
  } {
    try {
      let jsonText = response;
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonText);

      return {
        title: parsed.title,
        content: parsed.content,
        tags: parsed.tags || [],
        confidence_score: parsed.confidence_score || 0.8,
      };
    } catch (error) {
      console.error('❌ ナレッジレスポンスのパース失敗:', response);
      throw new Error('ナレッジ記事生成結果の解析に失敗しました。');
    }
  }

  /**
   * 類似チケットをクラスタリングしてFAQ候補を検出
   */
  static async detectFAQCandidates(): Promise<Array<{
    cluster_id: string;
    similar_tickets: string[];
    common_subject: string;
    ticket_count: number;
  }>> {
    console.log('🔍 FAQ候補の検出開始...');

    // 過去30日間の解決済みチケットから類似パターンを検出
    const result = await query(`
      WITH similar_groups AS (
        SELECT
          t1.ticket_id as ticket_id_1,
          t2.ticket_id as ticket_id_2,
          1 - (te1.combined_vector <=> te2.combined_vector) as similarity
        FROM ticket_embeddings te1
        JOIN ticket_embeddings te2 ON te1.embedding_version = te2.embedding_version
        JOIN tickets t1 ON te1.ticket_id = t1.ticket_id
        JOIN tickets t2 ON te2.ticket_id = t2.ticket_id
        WHERE te1.ticket_id < te2.ticket_id  -- 重複防止
          AND te1.embedding_version = 'claude-sonnet-4-5-20250929'
          AND t1.status IN ('resolved', 'closed')
          AND t2.status IN ('resolved', 'closed')
          AND t1.created_at >= CURRENT_DATE - INTERVAL '30 days'
          AND t2.created_at >= CURRENT_DATE - INTERVAL '30 days'
          AND 1 - (te1.combined_vector <=> te2.combined_vector) >= 0.85  -- 85%以上の類似度
      )
      SELECT
        ticket_id_1,
        ticket_id_2,
        similarity
      FROM similar_groups
      ORDER BY similarity DESC
      LIMIT 50
    `);

    // クラスタリング処理（簡易版: 連結成分）
    const clusters = this.clusterSimilarTickets(result.rows);

    // クラスタサイズが3件以上のものをFAQ候補とする
    const faqCandidates = clusters
      .filter((cluster) => cluster.similar_tickets.length >= 3)
      .map((cluster) => ({
        cluster_id: uuidv4(),
        similar_tickets: cluster.similar_tickets,
        common_subject: cluster.common_subject,
        ticket_count: cluster.similar_tickets.length,
      }));

    console.log(`✅ FAQ候補検出完了: ${faqCandidates.length}個のクラスタ`);

    return faqCandidates;
  }

  /**
   * 類似チケットをクラスタリング
   */
  private static clusterSimilarTickets(similarPairs: Array<{
    ticket_id_1: string;
    ticket_id_2: string;
    similarity: number;
  }>): Array<{
    similar_tickets: string[];
    common_subject: string;
  }> {
    // Union-Find アルゴリズムでクラスタリング
    const parent: Map<string, string> = new Map();

    function find(x: string): string {
      if (!parent.has(x)) {
        parent.set(x, x);
      }
      if (parent.get(x) !== x) {
        parent.set(x, find(parent.get(x)!));
      }
      return parent.get(x)!;
    }

    function union(x: string, y: string) {
      const rootX = find(x);
      const rootY = find(y);
      if (rootX !== rootY) {
        parent.set(rootX, rootY);
      }
    }

    // ペアを結合
    similarPairs.forEach((pair) => {
      union(pair.ticket_id_1, pair.ticket_id_2);
    });

    // クラスタを構築
    const clusters: Map<string, string[]> = new Map();
    parent.forEach((_, ticketId) => {
      const root = find(ticketId);
      if (!clusters.has(root)) {
        clusters.set(root, []);
      }
      clusters.get(root)!.push(ticketId);
    });

    return Array.from(clusters.values()).map((tickets) => ({
      similar_tickets: tickets,
      common_subject: 'FAQ候補',
    }));
  }
}
