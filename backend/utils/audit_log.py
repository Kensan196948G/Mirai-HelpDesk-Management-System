"""
JSON Lines形式の監査ログユーティリティ

すべてのAPI操作とM365操作を追記専用のJSON Lines形式で記録します。
監査証跡の要件に基づき、誰が/いつ/何を/なぜを明確に記録します。
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4


def _get_log_dir() -> Path:
    """ログディレクトリのパスを取得"""
    base = os.getenv("LOG_DIR", "logs")
    log_dir = Path(base)
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def _write_log(log_path: Path, record: dict[str, Any]) -> None:
    """JSON Lines形式でログを書き込み"""
    log_path.parent.mkdir(parents=True, exist_ok=True)

    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False))
        handle.write("\n")


def log_api_operation(
    user_id: int,
    user_email: str,
    action: str,
    resource_type: str,
    resource_id: int | None = None,
    ip_address: str = "",
    user_agent: str = "",
    details: dict[str, Any] | None = None
) -> None:
    """
    API操作をJSON Lines形式で記録

    Args:
        user_id: 操作を行ったユーザーのID
        user_email: 操作を行ったユーザーのメールアドレス
        action: 操作の種類 (例: "CREATE_TICKET", "UPDATE_STATUS", "DELETE_COMMENT")
        resource_type: リソースタイプ (例: "ticket", "comment", "attachment", "user")
        resource_id: リソースID (該当する場合)
        ip_address: クライアントのIPアドレス
        user_agent: クライアントのUser-Agent
        details: 操作の詳細情報 (オプション)

    ログファイル: logs/api_operations.jsonl

    例:
        log_api_operation(
            user_id=123,
            user_email="user@example.com",
            action="CREATE_TICKET",
            resource_type="ticket",
            resource_id=456,
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0...",
            details={"subject": "パスワードリセット依頼", "priority": "P2"}
        )
    """
    log_path = _get_log_dir() / "api_operations.jsonl"

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "request_id": uuid4().hex,
        "log_type": "api_operation",
        "user_id": user_id,
        "user_email": user_email,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "details": details or {},
    }

    _write_log(log_path, record)


def log_m365_operation(
    operator_id: int,
    operator_email: str,
    task_type: str,
    target_upn: str,
    method: str,
    result: str,
    ticket_id: int | None = None,
    command: str = "",
    details: dict[str, Any] | None = None
) -> None:
    """
    M365操作をJSON Lines形式で記録

    Args:
        operator_id: 操作を実施したオペレーターのID
        operator_email: 操作を実施したオペレーターのメールアドレス
        task_type: タスクタイプ (例: "ADD_LICENSE", "RESET_PASSWORD", "ADD_GROUP_MEMBER")
        target_upn: 対象ユーザーのUPN (UserPrincipalName)
        method: 実施方法 (例: "GRAPH_API", "POWERSHELL", "ADMIN_CENTER")
        result: 実施結果 (例: "SUCCESS", "FAILED", "PARTIAL")
        ticket_id: 関連チケットID
        command: 実行したコマンドまたはAPIエンドポイント
        details: 操作の詳細情報 (オプション)

    ログファイル: logs/m365_operations.jsonl

    例:
        log_m365_operation(
            operator_id=123,
            operator_email="operator@example.com",
            task_type="ADD_LICENSE",
            target_upn="user@contoso.onmicrosoft.com",
            method="GRAPH_API",
            result="SUCCESS",
            ticket_id=456,
            command="POST /users/{id}/assignLicense",
            details={"license_sku": "ENTERPRISEPACK", "before": [], "after": ["ENTERPRISEPACK"]}
        )
    """
    log_path = _get_log_dir() / "m365_operations.jsonl"

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "operation_id": uuid4().hex,
        "log_type": "m365_operation",
        "operator_id": operator_id,
        "operator_email": operator_email,
        "task_type": task_type,
        "target_upn": target_upn,
        "method": method,
        "result": result,
        "ticket_id": ticket_id,
        "command": command,
        "details": details or {},
    }

    _write_log(log_path, record)


def log_authentication(
    user_id: int | None,
    user_email: str,
    action: str,
    ip_address: str = "",
    user_agent: str = "",
    success: bool = True,
    details: dict[str, Any] | None = None
) -> None:
    """
    認証操作をJSON Lines形式で記録

    Args:
        user_id: ユーザーID (認証失敗の場合はNone)
        user_email: ユーザーのメールアドレス
        action: 認証操作 (例: "LOGIN", "LOGOUT", "TOKEN_REFRESH", "LOGIN_FAILED")
        ip_address: クライアントのIPアドレス
        user_agent: クライアントのUser-Agent
        success: 認証の成功/失敗
        details: 操作の詳細情報 (オプション)

    ログファイル: logs/authentication.jsonl

    例:
        log_authentication(
            user_id=123,
            user_email="user@example.com",
            action="LOGIN",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0...",
            success=True,
            details={"auth_method": "PASSWORD"}
        )
    """
    log_path = _get_log_dir() / "authentication.jsonl"

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_id": uuid4().hex,
        "log_type": "authentication",
        "user_id": user_id,
        "user_email": user_email,
        "action": action,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "success": success,
        "details": details or {},
    }

    _write_log(log_path, record)


def log_approval(
    approval_id: int,
    approver_id: int,
    approver_email: str,
    ticket_id: int,
    action: str,
    decision: str,
    reason: str = "",
    details: dict[str, Any] | None = None
) -> None:
    """
    承認操作をJSON Lines形式で記録

    Args:
        approval_id: 承認ID
        approver_id: 承認者のID
        approver_email: 承認者のメールアドレス
        ticket_id: チケットID
        action: 承認操作 (例: "REQUEST_APPROVAL", "APPROVE", "REJECT")
        decision: 承認判断 (例: "APPROVED", "REJECTED", "PENDING")
        reason: 承認/却下理由
        details: 操作の詳細情報 (オプション)

    ログファイル: logs/approvals.jsonl

    例:
        log_approval(
            approval_id=789,
            approver_id=123,
            approver_email="manager@example.com",
            ticket_id=456,
            action="APPROVE",
            decision="APPROVED",
            reason="業務上必要な権限であることを確認",
            details={"requested_permission": "SharePoint Site Admin"}
        )
    """
    log_path = _get_log_dir() / "approvals.jsonl"

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_id": uuid4().hex,
        "log_type": "approval",
        "approval_id": approval_id,
        "approver_id": approver_id,
        "approver_email": approver_email,
        "ticket_id": ticket_id,
        "action": action,
        "decision": decision,
        "reason": reason,
        "details": details or {},
    }

    _write_log(log_path, record)
