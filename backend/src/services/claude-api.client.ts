/**
 * Claude API クライアント
 *
 * Anthropic Claude API との通信、キャッシュ、レート制限を管理
 */

import Anthropic from '@anthropic-ai/sdk';
import Redis from 'ioredis';
import { claudeConfig } from '../config/claude.config';
import { logger } from '../utils/logger';

export interface ClaudeAPIOptions {
  cacheKey?: string;
  cacheTTL?: number; // 秒
  userId?: string;
  maxTokens?: number;
  temperature?: number;
}

export class ClaudeAPIClient {
  private client: Anthropic;
  private cache: Redis;
  private rateLimiter: Map<string, number[]>;

  constructor() {
    this.client = new Anthropic({
      apiKey: claudeConfig.apiKey,
    });

    this.cache = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.rateLimiter = new Map();

    // Redisエラーハンドリング
    this.cache.on('error', (err) => {
      logger.error('❌ Redis エラー:', err);
    });
  }

  /**
   * Claude APIにプロンプトを送信
   *
   * @param prompt ユーザープロンプト
   * @param systemPrompt システムプロンプト
   * @param options オプション設定
   * @returns Claude の応答テキスト
   */
  async sendPrompt(
    prompt: string,
    systemPrompt: string = '',
    options: ClaudeAPIOptions = {}
  ): Promise<string> {
    const startTime = Date.now();

    // 1. キャッシュチェック
    if (options.cacheKey) {
      const cached = await this.getCached(options.cacheKey);
      if (cached) {
        logger.log(`📦 キャッシュヒット: ${options.cacheKey}`);
        return cached;
      }
    }

    // 2. レート制限チェック
    if (options.userId) {
      await this.checkRateLimit(options.userId);
    }

    // 3. Claude API呼び出し
    try {
      const response = await this.client.messages.create({
        model: claudeConfig.model,
        max_tokens: options.maxTokens || claudeConfig.maxTokens,
        temperature: options.temperature !== undefined ? options.temperature : claudeConfig.temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // レスポンスからテキストを抽出
      const firstContent = response.content[0];
      const content =
        firstContent.type === 'text' ? firstContent.text : JSON.stringify(firstContent);
      const processingTime = Date.now() - startTime;

      // 使用トークン数をログ
      logger.log(
        `✅ Claude API: ${processingTime}ms, ` +
        `トークン: ${response.usage.input_tokens}入力 + ${response.usage.output_tokens}出力 = ${response.usage.input_tokens + response.usage.output_tokens}合計`
      );

      // 4. キャッシュ保存
      if (options.cacheKey) {
        await this.setCache(
          options.cacheKey,
          content,
          options.cacheTTL || 3600 // デフォルト1時間
        );
      }

      return content;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      // エラーハンドリング
      if (error.status === 429) {
        throw new Error(
          `Claude API レート制限エラー: ${error.message}。しばらく待ってから再試行してください。`
        );
      } else if (error.status === 401) {
        throw new Error(
          `Claude API 認証エラー: APIキーが無効です。環境変数 CLAUDE_API_KEY を確認してください。`
        );
      } else if (error.status === 400) {
        throw new Error(
          `Claude API リクエストエラー: ${error.message}`
        );
      } else if (error.status === 500 || error.status === 503) {
        throw new Error(
          `Claude API サーバーエラー (${error.status}): 一時的な問題の可能性があります。`
        );
      }

      // その他のエラー
      logger.error(`❌ Claude API エラー (${processingTime}ms):`, error);
      throw new Error(`Claude API エラー: ${error.message || '不明なエラー'}`);
    }
  }

  /**
   * レート制限チェック
   *
   * @param userId ユーザーID
   * @throws Error レート制限超過時
   */
  private async checkRateLimit(userId: string): Promise<void> {
    const now = Date.now();
    const windowMs = 60000; // 1分
    const maxRequests = 10; // 10回/分

    // Redisベースのレート制限
    const key = `ai-rate-limit:${userId}`;
    const requests = await this.cache.incr(key);

    if (requests === 1) {
      // 初回リクエスト時にTTL設定
      await this.cache.expire(key, 60); // 60秒
    }

    if (requests > maxRequests) {
      const ttl = await this.cache.ttl(key);
      throw new Error(
        `AI機能のリクエスト制限（${maxRequests}回/分）を超えました。` +
        `あと ${ttl} 秒待ってから再試行してください。`
      );
    }
  }

  /**
   * キャッシュ取得
   */
  private async getCached(key: string): Promise<string | null> {
    try {
      return await this.cache.get(key);
    } catch (error) {
      logger.error('キャッシュ取得エラー:', error);
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
      logger.error('キャッシュ保存エラー:', error);
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
let claudeAPIClientInstance: ClaudeAPIClient | null = null;

export function getClaudeAPIClient(): ClaudeAPIClient {
  if (!claudeAPIClientInstance) {
    claudeAPIClientInstance = new ClaudeAPIClient();
  }
  return claudeAPIClientInstance;
}
