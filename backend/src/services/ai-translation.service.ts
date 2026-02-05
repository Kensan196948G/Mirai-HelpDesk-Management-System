/**
 * AI Translation Service
 *
 * 多言語対応の自動翻訳機能（日本語 ⇔ 英語）
 */

import { getClaudeAPIClient } from './claude-api.client';
import { claudeConfig } from '../config/claude.config';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface TranslationInput {
  text: string;
  source_language?: 'ja' | 'en' | 'auto';
  target_language: 'ja' | 'en';
  context?: string;
}

export interface TranslationResult {
  translated_text: string;
  source_language: 'ja' | 'en';
  target_language: 'ja' | 'en';
  confidence: number;
  alternative_translations?: string[];
  glossary_terms?: Array<{ original: string; translated: string }>;
  processing_time_ms: number;
  model_version: string;
}

export interface TicketTranslationInput {
  ticket_id: string;
  target_language: 'ja' | 'en';
  include_comments?: boolean;
}

export interface TicketTranslationResult {
  ticket_id: string;
  translated_subject: string;
  translated_description: string;
  translated_comments?: Array<{
    comment_id: string;
    translated_body: string;
  }>;
  processing_time_ms: number;
}

export class AITranslationService {
  /**
   * テキストを翻訳
   */
  static async translate(input: TranslationInput): Promise<TranslationResult> {
    const startTime = Date.now();
    const claudeClient = getClaudeAPIClient();

    // 1. 言語検出（auto の場合）
    const sourceLanguage = input.source_language === 'auto'
      ? await this.detectLanguage(input.text)
      : input.source_language || 'ja';

    // 翻訳不要の場合
    if (sourceLanguage === input.target_language) {
      return {
        translated_text: input.text,
        source_language: sourceLanguage,
        target_language: input.target_language,
        confidence: 1.0,
        processing_time_ms: Date.now() - startTime,
        model_version: claudeConfig.model,
      };
    }

    // 2. IT用語集を取得
    const glossary = await this.getITGlossary(sourceLanguage, input.target_language);

    // 3. プロンプト生成
    const languagePair = sourceLanguage === 'ja' ? '日本語 → 英語' : '英語 → 日本語';

    const prompt = `あなたはIT分野に特化した翻訳エキスパートです。
以下のテキストを${languagePair}に翻訳してください。

# 翻訳対象テキスト
${input.text}

# コンテキスト（参考情報）
${input.context || 'ITヘルプデスクのチケット内容'}

# IT用語集（必ず参照してください）
${glossary}

# 翻訳ガイドライン
- IT専門用語は用語集に従って翻訳
- 固有名詞（製品名、サービス名）は翻訳しない
  例: Microsoft 365, Outlook, Teams, OneDrive → そのまま
- ビジネス文書として適切な敬語を使用（日本語の場合）
- 簡潔で明瞭な表現を使用（冗長な言い回しを避ける）

# 出力形式
\`\`\`json
{
  "translated_text": "翻訳後のテキスト",
  "confidence": 0.95,
  "alternative_translations": [
    "代替翻訳1（より丁寧な表現）",
    "代替翻訳2（よりカジュアルな表現）"
  ],
  "glossary_terms": [
    { "original": "添付ファイル", "translated": "attachment" },
    { "original": "送信エラー", "translated": "sending error" }
  ]
}
\`\`\`

**重要**: JSON以外の説明文は不要です。`;

    // 4. Claude API 呼び出し
    try {
      const claudeResponse = await claudeClient.sendPrompt(
        prompt,
        'あなたはIT分野に特化した翻訳エキスパートです。正確で自然な翻訳を提供してください。',
        {
          cacheKey: `ai-translate:${this.hashText(input.text)}:${sourceLanguage}-${input.target_language}`,
          cacheTTL: 86400, // 24時間（翻訳結果は長期キャッシュ可能）
          maxTokens: 2048,
          temperature: 0.3,
        }
      );

      // 5. レスポンスをパース
      const translationData = this.parseTranslationResponse(claudeResponse);

      const processingTime = Date.now() - startTime;

      console.log(`✅ 翻訳完了 (${sourceLanguage} → ${input.target_language}): ${processingTime}ms`);

      return {
        translated_text: translationData.translated_text,
        source_language: sourceLanguage,
        target_language: input.target_language,
        confidence: translationData.confidence,
        alternative_translations: translationData.alternative_translations,
        glossary_terms: translationData.glossary_terms,
        processing_time_ms: processingTime,
        model_version: claudeConfig.model,
      };
    } catch (error: any) {
      console.error('❌ 翻訳エラー:', error);
      throw new Error(`翻訳に失敗しました: ${error.message}`);
    }
  }

  /**
   * チケット全体を翻訳
   */
  static async translateTicket(input: TicketTranslationInput): Promise<TicketTranslationResult> {
    const startTime = Date.now();

    // 1. チケット情報を取得
    const ticketResult = await query(
      `SELECT ticket_id, subject, description
       FROM tickets
       WHERE ticket_id = $1`,
      [input.ticket_id]
    );

    if (ticketResult.rows.length === 0) {
      throw new Error(`チケット ${input.ticket_id} が見つかりません`);
    }

    const ticket = ticketResult.rows[0];

    // 2. 件名と詳細を翻訳
    const [subjectTranslation, descriptionTranslation] = await Promise.all([
      this.translate({
        text: ticket.subject,
        target_language: input.target_language,
        context: 'チケット件名',
      }),
      this.translate({
        text: ticket.description,
        target_language: input.target_language,
        context: 'チケット詳細',
      }),
    ]);

    // 3. コメントも翻訳（オプション）
    let translatedComments;
    if (input.include_comments) {
      const commentsResult = await query(
        `SELECT comment_id, body
         FROM ticket_comments
         WHERE ticket_id = $1
           AND visibility = 'public'
         ORDER BY created_at`,
        [input.ticket_id]
      );

      translatedComments = await Promise.all(
        commentsResult.rows.map(async (comment) => {
          const translation = await this.translate({
            text: comment.body,
            target_language: input.target_language,
            context: 'コメント',
          });

          return {
            comment_id: comment.comment_id,
            translated_body: translation.translated_text,
          };
        })
      );
    }

    const processingTime = Date.now() - startTime;

    return {
      ticket_id: input.ticket_id,
      translated_subject: subjectTranslation.translated_text,
      translated_description: descriptionTranslation.translated_text,
      translated_comments: translatedComments,
      processing_time_ms: processingTime,
    };
  }

  /**
   * 言語を自動検出
   */
  private static async detectLanguage(text: string): Promise<'ja' | 'en'> {
    // 簡易的な言語検出（日本語文字が含まれているか）
    const hasJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text);

    return hasJapanese ? 'ja' : 'en';
  }

  /**
   * IT用語集を取得
   */
  private static async getITGlossary(
    sourceLanguage: 'ja' | 'en',
    targetLanguage: 'ja' | 'en'
  ): Promise<string> {
    // IT専門用語の翻訳ルール
    const glossaryJaEn = [
      { ja: '添付ファイル', en: 'attachment' },
      { ja: '送信エラー', en: 'sending error' },
      { ja: 'パスワードリセット', en: 'password reset' },
      { ja: 'アカウント', en: 'account' },
      { ja: 'ライセンス', en: 'license' },
      { ja: '権限', en: 'permission' },
      { ja: '共有フォルダ', en: 'shared folder' },
      { ja: '配布リスト', en: 'distribution list' },
      { ja: '多要素認証', en: 'multi-factor authentication (MFA)' },
    ];

    if (sourceLanguage === 'ja' && targetLanguage === 'en') {
      return glossaryJaEn.map((g) => `- ${g.ja} → ${g.en}`).join('\n');
    } else {
      return glossaryJaEn.map((g) => `- ${g.en} → ${g.ja}`).join('\n');
    }
  }

  /**
   * テキストのハッシュを生成（キャッシュキー用）
   */
  private static hashText(text: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
  }

  /**
   * Claude APIレスポンスをパース
   */
  private static parseTranslationResponse(response: string): {
    translated_text: string;
    confidence: number;
    alternative_translations?: string[];
    glossary_terms?: Array<{ original: string; translated: string }>;
  } {
    try {
      let jsonText = response;
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonText);

      return {
        translated_text: parsed.translated_text,
        confidence: parsed.confidence || 0.9,
        alternative_translations: parsed.alternative_translations,
        glossary_terms: parsed.glossary_terms,
      };
    } catch (error) {
      console.error('❌ 翻訳レスポンスのパース失敗:', response);
      throw new Error('翻訳結果の解析に失敗しました。');
    }
  }
}
