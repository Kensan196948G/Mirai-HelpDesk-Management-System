"""
Microsoft 365 連携モジュール

このパッケージはMicrosoft Graph APIを使用したM365操作を提供します。
すべてのM365操作は承認フロー、SOD原則、監査証跡の記録が必須です。
"""

from .graph_client import GraphClient
from .operations import M365Operations
from .auth import M365AuthConfig
from .exceptions import (
    M365Error,
    M365AuthenticationError,
    M365AuthorizationError,
    M365APIError,
    M365ValidationError,
)

__all__ = [
    "GraphClient",
    "M365Operations",
    "M365AuthConfig",
    "M365Error",
    "M365AuthenticationError",
    "M365AuthorizationError",
    "M365APIError",
    "M365ValidationError",
]
