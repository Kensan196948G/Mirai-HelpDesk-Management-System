"""
PII (Personally Identifiable Information) Masking Utility

個人識別情報を自動的にマスキングするユーティリティモジュール。
監査ログ、チケットコメント、M365実施ログのセキュリティを強化します。

マスキング対象:
- メールアドレス
- IPv4アドレス
- 電話番号（日本形式）
- トークン（24文字以上）
- キー/値ペア（password=xxx, api_key=xxx等）
- 社員番号

環境変数による制御:
- ENABLE_PII_MASKING: マスキング機能の有効化
- MASK_EMAIL: メールアドレスのマスキング
- MASK_IP: IPアドレスのマスキング
- MASK_PHONE: 電話番号のマスキング
- MASK_TOKEN: トークンのマスキング
"""

import os
import re
from typing import Dict, Optional


# 正規表現パターン
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
IPV4_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")

# 日本の電話番号形式をサポート
# 例: 03-1234-5678, 090-1234-5678, 0120-123-456, +81-90-1234-5678
# より柔軟なパターン: 区切り記号の有無、全角・半角対応、国際番号対応
PHONE_RE = re.compile(
    r"(?:\+81[- ]?\d{1,4}[- ]?\d{2,4}[- ]?\d{3,4}|0\d{1,4}[- ]?\d{2,4}[- ]?\d{3,4})"
)

# トークン（24文字以上の英数字、ハイフン、アンダースコア）
TOKEN_RE = re.compile(r"\b[A-Za-z0-9_-]{24,}\b")

# キー/値ペア（password=xxx, api_key=xxx等）
KEY_VALUE_RE = re.compile(
    r"\b(password|token|api_key|secret|access_key|private_key|client_secret)\s*[:=]\s*[^\s,;]+",
    re.IGNORECASE
)

# 社員番号（日本語と英語両方サポート）
# "社員番号:E12345"、"employee id: E-99999"、"employee ID is E-99999" などを捕捉
# コロンまたは"is"の後に来る社員番号をマスキング
EMPLOYEE_RE = re.compile(
    r"(社員番号|従業員番号|employee[\s_]?id|emp[\s_]?id)(?:[:：]\s*|\s+is\s+)([A-Z\d]+-?[A-Z\d]+)",
    re.IGNORECASE
)


class PIIMasker:
    """PII マスキングクラス"""

    def __init__(self):
        """環境変数から設定を読み込む"""
        self.enabled = os.getenv("ENABLE_PII_MASKING", "true").lower() == "true"
        self.mask_email = os.getenv("MASK_EMAIL", "true").lower() == "true"
        self.mask_ip = os.getenv("MASK_IP", "true").lower() == "true"
        self.mask_phone = os.getenv("MASK_PHONE", "true").lower() == "true"
        self.mask_token = os.getenv("MASK_TOKEN", "true").lower() == "true"

    def mask_text(self, text: str) -> str:
        """
        テキスト内のPIIをマスキング

        Args:
            text: マスキング対象のテキスト

        Returns:
            マスキング後のテキスト
        """
        if not self.enabled or not text:
            return text

        masked = text

        # キー/値ペアを最初にマスキング（より具体的なパターン）
        masked = KEY_VALUE_RE.sub(lambda m: f"{m.group(1)}=<REDACTED>", masked)

        # 社員番号をマスキング
        masked = EMPLOYEE_RE.sub(lambda m: f"{m.group(1)}: <EMPLOYEE_ID>", masked)

        # メールアドレスをマスキング
        if self.mask_email:
            masked = EMAIL_RE.sub("<EMAIL>", masked)

        # IPv4アドレスをマスキング
        if self.mask_ip:
            masked = IPV4_RE.sub("<IP_ADDRESS>", masked)

        # 電話番号をマスキング
        if self.mask_phone:
            masked = PHONE_RE.sub("<PHONE>", masked)

        # トークンをマスキング（他のパターンで既にマスキングされていない場合）
        if self.mask_token:
            # トークンのマスキングは最後に行い、既にマスキングされた値は除外
            def mask_token_if_needed(match: re.Match) -> str:
                token = match.group(0)
                # 既にマスキングされている場合（<REDACTED>や<EMAIL>など）はスキップ
                if "<" in masked[max(0, match.start()-10):match.start()] or \
                   ">" in masked[match.end():min(len(masked), match.end()+10)]:
                    return token
                # REDACTEDという文字列が含まれている場合はスキップ
                if "REDACTED" in masked[max(0, match.start()-20):match.end()]:
                    return token
                return "<TOKEN>"

            masked = TOKEN_RE.sub(mask_token_if_needed, masked)

        return masked

    def mask_dict(self, data: Dict, keys_to_mask: Optional[list] = None) -> Dict:
        """
        辞書内のPIIをマスキング

        Args:
            data: マスキング対象の辞書
            keys_to_mask: マスキング対象のキー（Noneの場合は全ての値をマスキング）

        Returns:
            マスキング後の辞書
        """
        if not self.enabled:
            return data

        masked_data = {}
        default_keys_to_mask = {
            "password", "token", "api_key", "secret", "access_key",
            "private_key", "client_secret", "email", "phone", "employee_id"
        }

        if keys_to_mask:
            keys_to_check = set(keys_to_mask)
        else:
            keys_to_check = default_keys_to_mask

        for key, value in data.items():
            if isinstance(value, str):
                # 特定のキーの場合は完全にマスキング
                if key.lower() in keys_to_check:
                    masked_data[key] = "<REDACTED>"
                else:
                    # その他の文字列値は通常のマスキング
                    masked_data[key] = self.mask_text(value)
            elif isinstance(value, dict):
                # ネストされた辞書を再帰的にマスキング
                masked_data[key] = self.mask_dict(value, keys_to_mask)
            elif isinstance(value, list):
                # リスト内の各要素をマスキング
                masked_data[key] = [
                    self.mask_dict(item, keys_to_mask) if isinstance(item, dict)
                    else self.mask_text(item) if isinstance(item, str)
                    else item
                    for item in value
                ]
            else:
                # その他の型はそのまま
                masked_data[key] = value

        return masked_data

    def preview_text(self, text: str, max_length: int = 100) -> str:
        """
        テキストのプレビューを生成（マスキング + 長さ制限）

        Args:
            text: プレビュー対象のテキスト
            max_length: 最大文字数

        Returns:
            プレビューテキスト
        """
        masked = self.mask_text(text)
        if len(masked) <= max_length:
            return masked
        return masked[:max_length - 3] + "..."


# グローバルインスタンス（シングルトン）
_masker_instance: Optional[PIIMasker] = None


def get_masker() -> PIIMasker:
    """
    PIIMaskerのシングルトンインスタンスを取得

    Returns:
        PIIMaskerインスタンス
    """
    global _masker_instance
    if _masker_instance is None:
        _masker_instance = PIIMasker()
    return _masker_instance


def mask_pii(text: str) -> str:
    """
    PII（個人識別情報）をマスキング（簡易版）

    Args:
        text: マスキング対象のテキスト

    Returns:
        マスキング後のテキスト
    """
    masker = get_masker()
    return masker.mask_text(text)


def mask_pii_dict(data: Dict, keys_to_mask: Optional[list] = None) -> Dict:
    """
    辞書内のPIIをマスキング（簡易版）

    Args:
        data: マスキング対象の辞書
        keys_to_mask: マスキング対象のキー

    Returns:
        マスキング後の辞書
    """
    masker = get_masker()
    return masker.mask_dict(data, keys_to_mask)


def preview_pii(text: str, max_length: int = 100) -> str:
    """
    PIIマスキング済みプレビューテキストを生成（簡易版）

    Args:
        text: プレビュー対象のテキスト
        max_length: 最大文字数

    Returns:
        プレビューテキスト
    """
    masker = get_masker()
    return masker.preview_text(text, max_length)
