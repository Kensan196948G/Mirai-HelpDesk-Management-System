"""
Microsoft 365 連携の例外クラス

M365操作における各種エラーを表現する例外クラス群。
"""


class M365Error(Exception):
    """M365操作の基底例外クラス"""

    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class M365AuthenticationError(M365Error):
    """認証エラー

    トークン取得の失敗、証明書の問題、認証情報の不正など。
    """
    pass


class M365AuthorizationError(M365Error):
    """認可エラー

    権限不足、APIスコープの問題など。
    """
    pass


class M365APIError(M365Error):
    """API呼び出しエラー

    HTTPステータスコード、レート制限、ネットワークエラーなど。
    """

    def __init__(self, message: str, status_code: int = None, details: dict = None):
        super().__init__(message, details)
        self.status_code = status_code


class M365ValidationError(M365Error):
    """バリデーションエラー

    入力パラメータの検証失敗、必須フィールドの欠損など。
    """
    pass


class M365ApprovalRequiredError(M365Error):
    """承認必須エラー

    承認が必要な操作を承認なしで実行しようとした場合。
    Mirai HelpDesk固有のエラー。
    """
    pass


class M365SODViolationError(M365Error):
    """SOD違反エラー

    職務分離原則（Segregation of Duties）に違反する操作。
    承認者と実施者が同一など。
    """
    pass
