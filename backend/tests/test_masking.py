"""
Tests for PII Masking Utility

個人識別情報（PII）マスキング機能の包括的なテストスイート。
"""

import os
import pytest
from utils.masking import (
    PIIMasker,
    mask_pii,
    mask_pii_dict,
    preview_pii,
    get_masker,
    EMAIL_RE,
    IPV4_RE,
    PHONE_RE,
    TOKEN_RE,
    KEY_VALUE_RE,
    EMPLOYEE_RE,
)


class TestRegexPatterns:
    """正規表現パターンのテスト"""

    def test_email_pattern(self):
        """メールアドレス正規表現のテスト"""
        # 有効なメールアドレス
        assert EMAIL_RE.search("user@example.com")
        assert EMAIL_RE.search("john.doe@company.co.jp")
        assert EMAIL_RE.search("test+tag@domain.com")

        # 無効なパターン
        assert not EMAIL_RE.search("not-an-email")
        assert not EMAIL_RE.search("@example.com")

    def test_ipv4_pattern(self):
        """IPv4アドレス正規表現のテスト"""
        # 有効なIPv4アドレス
        assert IPV4_RE.search("192.168.1.1")
        assert IPV4_RE.search("10.0.0.1")
        assert IPV4_RE.search("172.16.0.1")

        # 無効なパターン
        assert not IPV4_RE.search("not.an.ip.address")

    def test_phone_pattern(self):
        """電話番号正規表現のテスト（日本形式）"""
        # 日本の電話番号形式
        assert PHONE_RE.search("03-1234-5678")
        assert PHONE_RE.search("090-1234-5678")
        assert PHONE_RE.search("0120-123-456")
        assert PHONE_RE.search("+81-90-1234-5678")
        assert PHONE_RE.search("0312345678")

    def test_token_pattern(self):
        """トークン正規表現のテスト"""
        # 24文字以上のトークン
        assert TOKEN_RE.search("abcdefghijklmnopqrstuvwxyz1234567890")
        assert TOKEN_RE.search("ghp_1234567890abcdefghijklmnopqrstuvwxyz")

        # 24文字未満
        assert not TOKEN_RE.search("short_token_123")

    def test_key_value_pattern(self):
        """キー/値ペア正規表現のテスト"""
        # パスワード系
        assert KEY_VALUE_RE.search("password=secret123")
        assert KEY_VALUE_RE.search("api_key:abc123def456")
        assert KEY_VALUE_RE.search("token = my_secret_token")
        assert KEY_VALUE_RE.search("client_secret=xyz789")

    def test_employee_pattern(self):
        """社員番号正規表現のテスト"""
        # 日本語
        assert EMPLOYEE_RE.search("社員番号:E12345")
        assert EMPLOYEE_RE.search("従業員番号：ABC123")

        # 英語
        assert EMPLOYEE_RE.search("employee id: 12345")
        assert EMPLOYEE_RE.search("EMPLOYEE_ID:E-12345")


class TestPIIMasker:
    """PIIMaskerクラスのテスト"""

    def test_masker_initialization_default(self):
        """デフォルト設定での初期化テスト"""
        masker = PIIMasker()
        assert masker.enabled is True
        assert masker.mask_email is True
        assert masker.mask_ip is True
        assert masker.mask_phone is True
        assert masker.mask_token is True

    def test_masker_initialization_from_env(self, monkeypatch):
        """環境変数からの初期化テスト"""
        monkeypatch.setenv("ENABLE_PII_MASKING", "false")
        monkeypatch.setenv("MASK_EMAIL", "false")

        masker = PIIMasker()
        assert masker.enabled is False
        assert masker.mask_email is False

    def test_mask_email(self):
        """メールアドレスマスキングのテスト"""
        masker = PIIMasker()
        text = "Contact us at support@example.com for help."
        result = masker.mask_text(text)
        assert "support@example.com" not in result
        assert "<EMAIL>" in result

    def test_mask_multiple_emails(self):
        """複数メールアドレスマスキングのテスト"""
        masker = PIIMasker()
        text = "Email john@example.com or jane@example.com"
        result = masker.mask_text(text)
        assert "john@example.com" not in result
        assert "jane@example.com" not in result
        assert result.count("<EMAIL>") == 2

    def test_mask_ip_address(self):
        """IPアドレスマスキングのテスト"""
        masker = PIIMasker()
        text = "Server IP: 192.168.1.100"
        result = masker.mask_text(text)
        assert "192.168.1.100" not in result
        assert "<IP_ADDRESS>" in result

    def test_mask_phone_number(self):
        """電話番号マスキングのテスト"""
        masker = PIIMasker()
        text = "お問い合わせは03-1234-5678まで"
        result = masker.mask_text(text)
        assert "03-1234-5678" not in result
        assert "<PHONE>" in result

    def test_mask_token(self):
        """トークンマスキングのテスト"""
        masker = PIIMasker()
        # KEY_VALUE_REがマッチする場合はそちらが優先される（より具体的なパターン）
        text = "GitHub token: ghp_1234567890abcdefghijklmnopqrstuvwxyz"
        result = masker.mask_text(text)
        assert "ghp_1234567890abcdefghijklmnopqrstuvwxyz" not in result
        # "token:"の形式はKEY_VALUE_REでマッチするため<REDACTED>になる
        assert "<REDACTED>" in result or "<TOKEN>" in result

    def test_mask_key_value_pairs(self):
        """キー/値ペアマスキングのテスト"""
        masker = PIIMasker()
        text = "Config: password=secret123, api_key=abc456def"
        result = masker.mask_text(text)
        assert "secret123" not in result
        assert "abc456def" not in result
        assert "password=<REDACTED>" in result
        assert "api_key=<REDACTED>" in result

    def test_mask_employee_id(self):
        """社員番号マスキングのテスト"""
        masker = PIIMasker()
        text = "申請者: 社員番号:E12345"
        result = masker.mask_text(text)
        assert "E12345" not in result
        assert "<EMPLOYEE_ID>" in result

    def test_mask_japanese_text_with_pii(self):
        """日本語テキスト内のPIIマスキングのテスト"""
        masker = PIIMasker()
        text = "山田太郎（yamada@example.com）から03-1234-5678に電話がありました。"
        result = masker.mask_text(text)
        assert "yamada@example.com" not in result
        assert "03-1234-5678" not in result
        assert "<EMAIL>" in result
        assert "<PHONE>" in result
        # 日本語名は残る（PIIではないと判断）
        assert "山田太郎" in result

    def test_mask_multiple_pii_types(self):
        """複数種類のPII同時マスキングのテスト"""
        masker = PIIMasker()
        text = """
        ユーザー情報:
        - メール: user@example.com
        - 電話: 090-1234-5678
        - IP: 192.168.1.50
        - 社員番号: E00123
        - パスワード: password=MySecret123
        """
        result = masker.mask_text(text)

        # すべてマスキングされている
        assert "user@example.com" not in result
        assert "090-1234-5678" not in result
        assert "192.168.1.50" not in result
        assert "E00123" not in result
        assert "MySecret123" not in result

        # マスクされた値が含まれている
        assert "<EMAIL>" in result
        assert "<PHONE>" in result
        assert "<IP_ADDRESS>" in result
        assert "<EMPLOYEE_ID>" in result
        assert "<REDACTED>" in result

    def test_mask_dict(self):
        """辞書のマスキングテスト"""
        masker = PIIMasker()
        data = {
            "username": "john_doe",
            "email": "john@example.com",
            "password": "secret123",
            "phone": "090-1234-5678",
            "description": "Contact at support@example.com"
        }
        result = masker.mask_dict(data)

        # 特定キーは完全マスキング
        assert result["password"] == "<REDACTED>"
        assert result["email"] == "<REDACTED>"

        # その他の値はパターンマスキング
        assert "@example.com" not in result["description"]
        assert "<EMAIL>" in result["description"]

    def test_mask_nested_dict(self):
        """ネストされた辞書のマスキングテスト"""
        masker = PIIMasker()
        data = {
            "user": {
                "email": "user@example.com",
                "password": "secret",
                "profile": {
                    "phone": "090-1234-5678"
                }
            }
        }
        result = masker.mask_dict(data)
        assert result["user"]["email"] == "<REDACTED>"
        assert result["user"]["password"] == "<REDACTED>"

    def test_mask_dict_with_list(self):
        """リスト含む辞書のマスキングテスト"""
        masker = PIIMasker()
        data = {
            "emails": ["user1@example.com", "user2@example.com"],
            "servers": [
                {"ip": "192.168.1.1", "name": "server1"},
                {"ip": "192.168.1.2", "name": "server2"}
            ]
        }
        result = masker.mask_dict(data)

        # リスト内の文字列がマスキングされている
        assert "user1@example.com" not in str(result["emails"])
        assert "192.168.1.1" not in str(result["servers"])

    def test_preview_text(self):
        """プレビューテキスト生成のテスト"""
        masker = PIIMasker()
        long_text = "Contact support@example.com for assistance. " * 10
        result = masker.preview_text(long_text, max_length=80)

        # マスキングされている
        assert "support@example.com" not in result
        assert "<EMAIL>" in result

        # 長さ制限されている
        assert len(result) <= 80

    def test_disabled_masking(self, monkeypatch):
        """マスキング無効化のテスト"""
        monkeypatch.setenv("ENABLE_PII_MASKING", "false")
        masker = PIIMasker()

        text = "Email: user@example.com, IP: 192.168.1.1"
        result = masker.mask_text(text)

        # マスキングされていない
        assert result == text

    def test_selective_masking_disable_email(self, monkeypatch):
        """特定のマスキングのみ無効化（メール）のテスト"""
        monkeypatch.setenv("MASK_EMAIL", "false")
        masker = PIIMasker()

        text = "Email: user@example.com, IP: 192.168.1.1"
        result = masker.mask_text(text)

        # メールはマスキングされていない
        assert "user@example.com" in result

        # IPはマスキングされている
        assert "192.168.1.1" not in result
        assert "<IP_ADDRESS>" in result

    def test_empty_text(self):
        """空テキストのテスト"""
        masker = PIIMasker()
        assert masker.mask_text("") == ""
        assert masker.mask_text(None) is None

    def test_text_without_pii(self):
        """PII含まないテキストのテスト"""
        masker = PIIMasker()
        text = "これはPIIを含まない通常のテキストです。"
        result = masker.mask_text(text)
        assert result == text


class TestModuleFunctions:
    """モジュールレベル関数のテスト"""

    def test_mask_pii_function(self):
        """mask_pii関数のテスト"""
        text = "Email me at support@example.com"
        result = mask_pii(text)
        assert "support@example.com" not in result
        assert "<EMAIL>" in result

    def test_mask_pii_dict_function(self):
        """mask_pii_dict関数のテスト"""
        data = {
            "email": "user@example.com",
            "password": "secret"
        }
        result = mask_pii_dict(data)
        assert result["email"] == "<REDACTED>"
        assert result["password"] == "<REDACTED>"

    def test_preview_pii_function(self):
        """preview_pii関数のテスト"""
        text = "Very long email: support@example.com " * 20
        result = preview_pii(text, max_length=50)
        assert len(result) <= 50
        assert "<EMAIL>" in result

    def test_get_masker_singleton(self):
        """シングルトンパターンのテスト"""
        masker1 = get_masker()
        masker2 = get_masker()
        assert masker1 is masker2


class TestRealWorldScenarios:
    """実際のユースケースシナリオのテスト"""

    def test_ticket_comment_masking(self):
        """チケットコメントのマスキングシナリオ"""
        masker = PIIMasker()
        comment = """
        問題の詳細:
        ユーザー（yamada@example.com）がサーバー（192.168.1.50）に接続できません。
        連絡先: 090-1234-5678
        社員番号: E12345
        """
        result = masker.mask_text(comment)

        # すべてのPIIがマスキングされている
        assert "yamada@example.com" not in result
        assert "192.168.1.50" not in result
        assert "090-1234-5678" not in result
        assert "E12345" not in result

    def test_m365_execution_log_masking(self):
        """M365実施ログのマスキングシナリオ"""
        masker = PIIMasker()
        log_entry = """
        操作: ライセンス付与
        対象: user@contoso.com
        実施者IP: 10.0.0.25
        コマンド: Set-MsolUserLicense -UserPrincipalName user@contoso.com
        結果: 成功
        """
        result = masker.mask_text(log_entry)

        assert "user@contoso.com" not in result
        assert "10.0.0.25" not in result
        assert "<EMAIL>" in result
        assert "<IP_ADDRESS>" in result

    def test_audit_log_export_masking(self):
        """監査ログエクスポートのマスキングシナリオ"""
        masker = PIIMasker()
        audit_data = {
            "actor_email": "admin@example.com",
            "actor_ip": "172.16.0.1",
            "action": "USER_CREATED",
            "description": "Created user account for john.doe@example.com",
            "old_value": None,
            "new_value": "email: john.doe@example.com, phone: 03-1234-5678"
        }
        result = masker.mask_dict(audit_data)

        # メールアドレスがマスキングされている
        assert "@example.com" not in str(result)

        # IPアドレスがマスキングされている
        assert "172.16.0.1" not in str(result)

    def test_password_reset_masking(self):
        """パスワードリセット情報のマスキングシナリオ"""
        masker = PIIMasker()
        reset_info = """
        パスワードリセット実施
        - ユーザー: user@example.com
        - 新パスワード: password=TempPass123!
        - 実施者トークン: token=abcdefghijklmnopqrstuvwxyz123456
        - 確認コード送信先: 090-9876-5432
        """
        result = masker.mask_text(reset_info)

        # すべての機密情報がマスキングされている
        assert "user@example.com" not in result
        assert "TempPass123!" not in result
        assert "abcdefghijklmnopqrstuvwxyz123456" not in result
        assert "090-9876-5432" not in result

    def test_mixed_language_content(self):
        """日英混在コンテンツのマスキング"""
        masker = PIIMasker()
        text = """
        User request from 山田太郎 (yamada.taro@example.jp):
        "Cannot access server at 192.168.100.50. Please call me at 090-1111-2222.
        My employee ID is E-99999."

        Password reset token: api_key=test_dummy_api_key_for_masking_test_only_123456789
        """
        result = masker.mask_text(text)

        # 日本語名は残る
        assert "山田太郎" in result

        # PIIはすべてマスキングされる
        assert "yamada.taro@example.jp" not in result
        assert "192.168.100.50" not in result
        assert "090-1111-2222" not in result
        assert "E-99999" not in result
        assert "test_dummy_api_key_for_masking_test_only" not in result


class TestEdgeCases:
    """エッジケースのテスト"""

    def test_already_masked_content(self):
        """既にマスキングされたコンテンツの処理"""
        masker = PIIMasker()
        text = "Email: <EMAIL>, IP: <IP_ADDRESS>"
        result = masker.mask_text(text)
        # 既にマスキングされている場合も正常に処理
        assert "<EMAIL>" in result
        assert "<IP_ADDRESS>" in result

    def test_partial_pii(self):
        """部分的なPIIの処理"""
        masker = PIIMasker()
        # 不完全なメールアドレス（@のみ）
        text = "Invalid email: user@ or @example.com"
        result = masker.mask_text(text)
        # 不完全なパターンはマスキングされない
        assert "user@" in result or "@example.com" in result

    def test_pii_at_boundaries(self):
        """テキスト境界のPII"""
        masker = PIIMasker()
        text = "user@example.com"  # PII のみのテキスト
        result = masker.mask_text(text)
        assert result == "<EMAIL>"

    def test_unicode_normalization(self):
        """Unicode正規化のテスト"""
        masker = PIIMasker()
        # 全角・半角混在
        text = "電話:090-1234-5678　メール:user@example.com"
        result = masker.mask_text(text)
        assert "090-1234-5678" not in result
        assert "user@example.com" not in result


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=utils.masking", "--cov-report=html"])
