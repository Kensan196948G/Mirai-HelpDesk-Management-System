/**
 * Perplexity API クライアント
 *
 * Perplexity AI（Sonar）との通信を管理
 * 外部ナレッジ検索と最新情報の取得に使用
 */

import axios from 'axios';
import Redis from 'ioredis';

export interface PerplexitySearchOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  cacheKey?: string;
  cacheTTL?: number;
}

export class PerplexityAPIClient {
  private apiKey: string;
  private cache: Redis;
  private model: string;

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';
    this.cache = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.model = process.env.PERPLEXITY_MODEL || 'sonar-pro';

    if (!this.apiKey) {
      console.warn('⚠️  PERPLEXITY_API_KEY が設定されていません。Perplexity機能は無効です。');
    }

    this.cache.on('error', (err) => {
      console.error('❌ Redis エラー (Perplexity):', err);
    });
  }

  /**
   * 外部ナレッジ検索
   *
   * @param query 検索クエリ
   * @param systemPrompt システムプロンプト
   * @param options オプション設定
   * @returns 検索結果テキスト
   */
  async search(
    query: string,
    systemPrompt: string = '',
    options: PerplexitySearchOptions = {}
  ): Promise<{
    answer: string;
    sources: string[];
    processingTime: number;
  }> {
    const startTime = Date.now();

    // 1. キャッシュチェック
    if (options.cacheKey) {
      const cached = await this.getCached(options.cacheKey);
      if (cached) {
        console.log(`📦 キャッシュヒット (Perplexity): ${options.cacheKey}`);
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          processingTime: 0
        };
      }
    }

    // 2. Perplexity API 呼び出し
    try {
      const response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: options.model || this.model,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            {
              role: 'user',
              content: query
            }
          ],
          max_tokens: options.maxTokens || 2048,
          temperature: options.temperature !== undefined ? options.temperature : 0.3,
          return_citations: true,
          return_images: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      const answer = response.data.choices[0].message.content;
      const sources = response.data.citations || [];
      const processingTime = Date.now() - startTime;

      console.log(
        `✅ Perplexity Search: ${processingTime}ms, ` +
        `ソース数: ${sources.length}`
      );

      const result = { answer, sources };

      // 3. キャッシュ保存
      if (options.cacheKey) {
        await this.setCache(
          options.cacheKey,
          JSON.stringify(result),
          options.cacheTTL || 3600 // デフォルト1時間（最新情報なので短め）
        );
      }

      return {
        ...result,
        processingTime
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      if (error.response?.status === 429) {
        throw new Error(
          `Perplexity API レート制限エラー: ${error.message}。しばらく待ってから再試行してください。`
        );
      } else if (error.response?.status === 401) {
        throw new Error(
          `Perplexity API 認証エラー: APIキーが無効です。環境変数 PERPLEXITY_API_KEY を確認してください。`
        );
      }

      console.error(`❌ Perplexity Search エラー (${processingTime}ms):`, error);
      throw new Error(`Perplexity Search エラー: ${error.message || '不明なエラー'}`);
    }
  }

  /**
   * キャッシュ取得
   */
  private async getCached(key: string): Promise<string | null> {
    try {
      return await this.cache.get(key);
    } catch (error) {
      console.error('キャッシュ取得エラー:', error);
      return null;
    }
  }

  /**
   * キャッシュ保存
   */
  private async setCache(
    key: string,
    value: string,
    ttl: number
  ): Promise<void> {
    try {
      await this.cache.setex(key, ttl, value);
    } catch (error) {
      console.error('キャッシュ保存エラー:', error);
    }
  }

  /**
   * Redis接続を閉じる
   */
  async disconnect(): Promise<void> {
    await this.cache.quit();
  }
}

// シングルトンインスタンス
let perplexityAPIClientInstance: PerplexityAPIClient | null = null;

export function getPerplexityAPIClient(): PerplexityAPIClient {
  if (!perplexityAPIClientInstance) {
    perplexityAPIClientInstance = new PerplexityAPIClient();
  }
  return perplexityAPIClientInstance;
}
