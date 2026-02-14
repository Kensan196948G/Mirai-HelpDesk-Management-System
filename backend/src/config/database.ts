import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mirai_helpdesk',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // 最大接続数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

// 接続テスト
pool.on('connect', () => {
  logger.info('PostgreSQL database connected');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// データベース接続確認
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info(`Database connection successful: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
};

// トランザクション用ヘルパー
export const withTransaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// 機密情報をマスクするヘルパー関数
const sanitizeParams = (params?: any[]): any[] => {
  if (!params) return [];

  return params.map((param, index) => {
    // パラメータが文字列の場合、機密情報をマスク
    if (typeof param === 'string') {
      const lowerParam = param.toLowerCase();

      // パスワード、トークン、シークレットを含む場合はマスク
      if (
        lowerParam.includes('password') ||
        lowerParam.includes('token') ||
        lowerParam.includes('secret') ||
        lowerParam.includes('$2b$') || // bcryptハッシュ
        lowerParam.includes('$2a$') || // bcryptハッシュ
        param.length > 50 // 長い文字列（ハッシュやトークンの可能性）
      ) {
        return '[REDACTED]';
      }
    }

    // オブジェクトの場合、再帰的にマスク
    if (typeof param === 'object' && param !== null) {
      const sanitized: any = Array.isArray(param) ? [] : {};
      for (const key in param) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('password') ||
          lowerKey.includes('token') ||
          lowerKey.includes('secret')
        ) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = param[key];
        }
      }
      return sanitized;
    }

    return param;
  });
};

// クエリヘルパー
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // パラメータをサニタイズしてログ出力
    const sanitizedParams = sanitizeParams(params);
    logger.debug(`Query executed in ${duration}ms`, { text, params: sanitizedParams });

    return result;
  } catch (error) {
    // エラー時もパラメータをサニタイズ
    const sanitizedParams = sanitizeParams(params);
    logger.error('Query error:', { text, params: sanitizedParams, error });
    throw error;
  }
};
