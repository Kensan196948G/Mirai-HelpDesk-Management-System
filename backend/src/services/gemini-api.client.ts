/**
 * Gemini API クライアント
 *
 * Google Gemini API（Embedding + Vision）との通信を管理
 */

import axios from 'axios';
import Redis from 'ioredis';

export interface GeminiEmbeddingOptions {
  model?: string;
  cacheKey?: string;
  cacheTTL?: number;
}

export interface GeminiVisionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class GeminiAPIClient {
  private apiKey: string;
  private cache: Redis;
  private embeddingModel: string;
  private visionModel: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.cache = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
    this.visionModel = process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash-exp';

    if (!this.apiKey) {
      console.warn('⚠️  GEMINI_API_KEY が設定されていません。Gemini機能は無効です。');
    }

    this.cache.on('error', (err) => {
      console.error('❌ Redis エラー (Gemini):', err);
    });
  }

  /**
   * テキストをベクトル埋め込みに変換
   *
   * @param text 埋め込み対象のテキスト
   * @param options オプション設定
   * @returns ベクトル配列（768次元）
   */
  async generateEmbedding(
    text: string,
    options: GeminiEmbeddingOptions = {}
  ): Promise<number[]> {
    const startTime = Date.now();

    // 1. キャッシュチェック
    if (options.cacheKey) {
      const cached = await this.getCached(options.cacheKey);
      if (cached) {
        console.log(`📦 キャッシュヒット (Gemini Embedding): ${options.cacheKey}`);
        return JSON.parse(cached);
      }
    }

    // 2. Gemini Embedding API 呼び出し
    try {
      const model = options.model || this.embeddingModel;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${this.apiKey}`;

      const response = await axios.post(
        url,
        {
          model: `models/${model}`,
          content: {
            parts: [{ text }]
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const embedding = response.data.embedding.values;
      const processingTime = Date.now() - startTime;

      console.log(
        `✅ Gemini Embedding: ${processingTime}ms, ` +
        `次元数: ${embedding.length}`
      );

      // 3. キャッシュ保存
      if (options.cacheKey) {
        await this.setCache(
          options.cacheKey,
          JSON.stringify(embedding),
          options.cacheTTL || 86400 // デフォルト24時間
        );
      }

      return embedding;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      if (error.response?.status === 429) {
        throw new Error(
          `Gemini API レート制限エラー: ${error.message}。しばらく待ってから再試行してください。`
        );
      } else if (error.response?.status === 401) {
        throw new Error(
          `Gemini API 認証エラー: APIキーが無効です。環境変数 GEMINI_API_KEY を確認してください。`
        );
      }

      console.error(`❌ Gemini Embedding エラー (${processingTime}ms):`, error);
      throw new Error(`Gemini Embedding エラー: ${error.message || '不明なエラー'}`);
    }
  }

  /**
   * 画像解析（Vision）
   *
   * @param imageBase64 Base64エンコードされた画像
   * @param prompt 解析プロンプト
   * @param options オプション設定
   * @returns 解析結果テキスト
   */
  async analyzeImage(
    imageBase64: string,
    prompt: string,
    options: GeminiVisionOptions = {}
  ): Promise<string> {
    const startTime = Date.now();

    try {
      const model = options.model || this.visionModel;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

      const response = await axios.post(
        url,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: options.temperature || 0.3,
            maxOutputTokens: options.maxTokens || 2048
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      const resultText = response.data.candidates[0].content.parts[0].text;
      const processingTime = Date.now() - startTime;

      console.log(`✅ Gemini Vision: ${processingTime}ms`);

      return resultText;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      console.error(`❌ Gemini Vision エラー (${processingTime}ms):`, error);
      throw new Error(`Gemini Vision エラー: ${error.message || '不明なエラー'}`);
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
let geminiAPIClientInstance: GeminiAPIClient | null = null;

export function getGeminiAPIClient(): GeminiAPIClient {
  if (!geminiAPIClientInstance) {
    geminiAPIClientInstance = new GeminiAPIClient();
  }
  return geminiAPIClientInstance;
}
