"""
Microsoft 365 Authentication Configuration

非対話型認証（クライアントシークレット方式）の設定管理。
"""

from pydantic_settings import BaseSettings
from msal import ConfidentialClientApplication


class M365AuthConfig(BaseSettings):
    """Microsoft 365 認証設定

    環境変数から認証情報を読み込み、MSALアプリケーションを生成します。
    """

    ms_tenant_id: str
    ms_client_id: str
    ms_client_secret: str
    ms_authority: str = ""
    ms_graph_endpoint: str = "https://graph.microsoft.com/v1.0"
    ms_scopes: str = "https://graph.microsoft.com/.default"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.ms_authority:
            self.ms_authority = f"https://login.microsoftonline.com/{self.ms_tenant_id}"

    def get_msal_app(self) -> ConfidentialClientApplication:
        """MSAL ConfidentialClientApplication インスタンスを取得

        Returns:
            設定済みのMSALアプリケーション
        """
        return ConfidentialClientApplication(
            self.ms_client_id,
            authority=self.ms_authority,
            client_credential=self.ms_client_secret,
        )

    def get_scopes(self) -> list[str]:
        """Graph API スコープを取得

        Returns:
            スコープのリスト
        """
        return [self.ms_scopes]
