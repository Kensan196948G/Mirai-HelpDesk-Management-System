import axios from 'axios';
import { GeminiAPIClient } from '../../../src/services/gemini-api.client';

// axiosをモック
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Redisをモック
const mockRedisGet = jest.fn();
const mockRedisSetex = jest.fn();
const mockRedisQuit = jest.fn();
const mockRedisOn = jest.fn();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: mockRedisGet,
    setex: mockRedisSetex,
    quit: mockRedisQuit,
    on: mockRedisOn,
  }));
});

describe('GeminiAPIClient', () => {
  let client: GeminiAPIClient;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
    process.env.REDIS_URL = 'redis://localhost:6379';
    client = new GeminiAPIClient();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.REDIS_URL;
  });

  describe('generateEmbedding', () => {
    const mockEmbedding = Array(768).fill(0.5);

    it('テキストから埋め込みベクトルを生成', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockedAxios.post.mockResolvedValue({
        data: {
          embedding: {
            values: mockEmbedding,
          },
        },
      });

      const result = await client.generateEmbedding('テスト文章');

      expect(result).toEqual(mockEmbedding);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          content: { parts: [{ text: 'テスト文章' }] },
        }),
        expect.any(Object)
      );
    });

    it('キャッシュヒット時はAPIを呼ばない', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify(mockEmbedding));

      const result = await client.generateEmbedding('テスト', {
        cacheKey: 'test-cache-key',
      });

      expect(result).toEqual(mockEmbedding);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('API呼び出し成功後にキャッシュ保存', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockedAxios.post.mockResolvedValue({
        data: { embedding: { values: mockEmbedding } },
      });

      await client.generateEmbedding('テスト', {
        cacheKey: 'test-key',
        cacheTTL: 3600,
      });

      expect(mockRedisSetex).toHaveBeenCalledWith(
        'test-key',
        3600,
        JSON.stringify(mockEmbedding)
      );
    });

    it('デフォルトキャッシュTTLは24時間', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockedAxios.post.mockResolvedValue({
        data: { embedding: { values: mockEmbedding } },
      });

      await client.generateEmbedding('テスト', { cacheKey: 'key' });

      expect(mockRedisSetex).toHaveBeenCalledWith(
        'key',
        86400,
        expect.any(String)
      );
    });

    it('429レート制限エラーを処理', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockedAxios.post.mockRejectedValue({
        response: { status: 429 },
        message: 'Too many requests',
      });

      await expect(
        client.generateEmbedding('テスト')
      ).rejects.toThrow('Gemini API レート制限エラー');
    });

    it('401認証エラーを処理', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockedAxios.post.mockRejectedValue({
        response: { status: 401 },
        message: 'Invalid API key',
      });

      await expect(
        client.generateEmbedding('テスト')
      ).rejects.toThrow('Gemini API 認証エラー');
    });

    it('一般的なAPIエラーを処理', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(
        client.generateEmbedding('テスト')
      ).rejects.toThrow('Gemini Embedding エラー');
    });

    it('タイムアウト設定が30秒', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockedAxios.post.mockResolvedValue({
        data: { embedding: { values: mockEmbedding } },
      });

      await client.generateEmbedding('テスト');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ timeout: 30000 })
      );
    });

    it('カスタムモデルを使用', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockedAxios.post.mockResolvedValue({
        data: { embedding: { values: mockEmbedding } },
      });

      await client.generateEmbedding('テスト', { model: 'custom-model' });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('custom-model'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('空文字列でも処理可能', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockedAxios.post.mockResolvedValue({
        data: { embedding: { values: mockEmbedding } },
      });

      const result = await client.generateEmbedding('');

      expect(result).toEqual(mockEmbedding);
    });

    it('キャッシュ取得エラー時はAPIを呼ぶ', async () => {
      mockRedisGet.mockRejectedValue(new Error('Redis error'));
      mockedAxios.post.mockResolvedValue({
        data: { embedding: { values: mockEmbedding } },
      });

      const result = await client.generateEmbedding('テスト', { cacheKey: 'key' });

      expect(result).toEqual(mockEmbedding);
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('キャッシュ保存エラー時も処理続行', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockRedisSetex.mockRejectedValue(new Error('Redis save error'));
      mockedAxios.post.mockResolvedValue({
        data: { embedding: { values: mockEmbedding } },
      });

      await expect(
        client.generateEmbedding('テスト', { cacheKey: 'key' })
      ).resolves.toEqual(mockEmbedding);
    });
  });

  describe('analyzeImage', () => {
    const mockImageBase64 = 'base64encodedimage';
    const mockPrompt = 'この画像を説明してください';
    const mockResponse = '画像の説明テキスト';

    it('画像解析を実行', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: mockResponse }],
              },
            },
          ],
        },
      });

      const result = await client.analyzeImage(mockImageBase64, mockPrompt);

      expect(result).toBe(mockResponse);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('generateContent'),
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              parts: expect.arrayContaining([
                { text: mockPrompt },
                expect.objectContaining({
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: mockImageBase64,
                  },
                }),
              ]),
            }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('タイムアウト設定が60秒', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          candidates: [{ content: { parts: [{ text: 'result' }] } }],
        },
      });

      await client.analyzeImage(mockImageBase64, mockPrompt);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ timeout: 60000 })
      );
    });

    it('temperatureオプションが機能する', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          candidates: [{ content: { parts: [{ text: 'result' }] } }],
        },
      });

      await client.analyzeImage(mockImageBase64, mockPrompt, { temperature: 0.7 });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          generationConfig: expect.objectContaining({ temperature: 0.7 }),
        }),
        expect.any(Object)
      );
    });

    it('maxTokensオプションが機能する', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          candidates: [{ content: { parts: [{ text: 'result' }] } }],
        },
      });

      await client.analyzeImage(mockImageBase64, mockPrompt, { maxTokens: 4096 });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          generationConfig: expect.objectContaining({ maxOutputTokens: 4096 }),
        }),
        expect.any(Object)
      );
    });

    it('APIエラーを処理', async () => {
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      await expect(
        client.analyzeImage(mockImageBase64, mockPrompt)
      ).rejects.toThrow('Gemini Vision エラー');
    });

    it('カスタムモデルを使用', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          candidates: [{ content: { parts: [{ text: 'result' }] } }],
        },
      });

      await client.analyzeImage(mockImageBase64, mockPrompt, {
        model: 'custom-vision-model',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('custom-vision-model'),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('disconnect', () => {
    it('Redis接続を閉じる', async () => {
      await client.disconnect();

      expect(mockRedisQuit).toHaveBeenCalled();
    });
  });

  describe('constructor', () => {
    it('APIキーなし時は警告を出力', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      delete process.env.GEMINI_API_KEY;

      new GeminiAPIClient();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('GEMINI_API_KEY が設定されていません')
      );

      consoleSpy.mockRestore();
    });

    it('Redisエラーハンドラーを登録', () => {
      new GeminiAPIClient();

      expect(mockRedisOn).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });
});
