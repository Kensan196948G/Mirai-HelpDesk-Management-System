import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

/**
 * Microsoft 365 認証サービス（非対話型認証）
 * Client Credentials Flow を使用
 */
export class M365AuthService {
  private static credential: ClientSecretCredential | null = null;
  private static client: Client | null = null;

  // 認証情報の初期化
  static initialize(): void {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      throw new AppError(
        'Microsoft 365 credentials not configured. Please set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET.',
        500,
        'M365_CONFIG_ERROR'
      );
    }

    try {
      // Client Credentials による認証（非対話型）
      this.credential = new ClientSecretCredential(
        tenantId,
        clientId,
        clientSecret
      );

      // Graph Client の作成
      const authProvider = new TokenCredentialAuthenticationProvider(
        this.credential,
        {
          scopes: [process.env.GRAPH_API_SCOPE || 'https://graph.microsoft.com/.default'],
        }
      );

      this.client = Client.initWithMiddleware({
        authProvider,
      });

      logger.info('Microsoft 365 Graph API client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Microsoft 365 Graph API client:', error);
      throw new AppError(
        'Failed to initialize Microsoft 365 connection',
        500,
        'M365_INIT_ERROR'
      );
    }
  }

  // Graph Client 取得
  static getClient(): Client {
    if (!this.client) {
      this.initialize();
    }

    if (!this.client) {
      throw new AppError(
        'Microsoft 365 Graph API client not initialized',
        500,
        'M365_CLIENT_ERROR'
      );
    }

    return this.client;
  }

  // アクセストークン取得（デバッグ用）
  static async getAccessToken(): Promise<string> {
    if (!this.credential) {
      this.initialize();
    }

    if (!this.credential) {
      throw new AppError(
        'Microsoft 365 credentials not initialized',
        500,
        'M365_CREDENTIAL_ERROR'
      );
    }

    try {
      const tokenResponse = await this.credential.getToken(
        process.env.GRAPH_API_SCOPE || 'https://graph.microsoft.com/.default'
      );

      if (!tokenResponse || !tokenResponse.token) {
        throw new Error('Failed to acquire access token');
      }

      return tokenResponse.token;
    } catch (error) {
      logger.error('Failed to get Microsoft 365 access token:', error);
      throw new AppError(
        'Failed to authenticate with Microsoft 365',
        500,
        'M365_AUTH_ERROR'
      );
    }
  }

  // 接続テスト
  static async testConnection(): Promise<boolean> {
    try {
      const client = this.getClient();

      // 組織情報を取得してテスト
      const organization = await client
        .api('/organization')
        .select('displayName,id')
        .get();

      logger.info('Microsoft 365 connection test successful', {
        organization: organization.value[0]?.displayName,
      });

      return true;
    } catch (error) {
      logger.error('Microsoft 365 connection test failed:', error);
      return false;
    }
  }
}
