"""
Audit Log Routes

監査ログの取得・エクスポートエンドポイント。
監査ログは追記専用であり、このAPIでは読み取り操作のみを提供します。

アクセス権限: Auditor, Manager のみ
"""

import csv
import io
import json
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, select

from app.database import get_db
from app.models.audit_log import AuditLog, AuditAction
from app.models.user import UserRole
from app.api.deps import CurrentUser, DbSession, require_roles
from utils.masking import mask_pii


router = APIRouter()


# ============== スキーマ定義 ==============

class ExportFormat(str, Enum):
    """エクスポート形式"""
    CSV = "csv"
    JSON = "json"


class AuditLogResponse(BaseModel):
    """監査ログ単一レスポンス"""
    id: int
    actor_id: Optional[int] = None
    actor_email: Optional[str] = None
    actor_ip: Optional[str] = None
    actor_user_agent: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[int] = None
    description: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    related_ticket_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """監査ログ一覧レスポンス"""
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AuditLogDetailResponse(AuditLogResponse):
    """監査ログ詳細レスポンス（単一取得用）"""
    # 将来の拡張用（関連データの追加など）
    pass


class AuditStatistics(BaseModel):
    """監査ログ統計情報"""
    total_logs: int
    logs_by_action: dict[str, int]
    logs_by_resource: dict[str, int]
    period_start: datetime
    period_end: datetime


# ============== ヘルパー関数 ==============

def convert_audit_log_to_response(log: AuditLog) -> AuditLogResponse:
    """AuditLogモデルをレスポンススキーマに変換"""
    return AuditLogResponse(
        id=log.id,
        actor_id=log.actor_id,
        actor_email=log.actor_email,
        actor_ip=log.actor_ip,
        actor_user_agent=log.actor_user_agent,
        action=log.action.value,
        resource_type=log.resource_type,
        resource_id=log.resource_id,
        description=log.description,
        old_value=log.old_value,
        new_value=log.new_value,
        reason=log.reason,
        related_ticket_id=log.related_ticket_id,
        created_at=log.created_at,
    )


def generate_csv_content(logs: list[AuditLog]) -> str:
    """監査ログをCSV形式に変換（PII自動マスキング）"""
    output = io.StringIO()
    writer = csv.writer(output)

    # ヘッダー行
    headers = [
        "ID",
        "日時",
        "アクター_ID",
        "アクター_メール",
        "アクター_IP",
        "アクション",
        "リソース種別",
        "リソース_ID",
        "説明",
        "変更前",
        "変更後",
        "理由",
        "関連チケット_ID",
    ]
    writer.writerow(headers)

    # データ行（PII自動マスキング適用）
    for log in logs:
        row = [
            log.id,
            log.created_at.isoformat(),
            log.actor_id or "",
            mask_pii(log.actor_email or ""),
            mask_pii(log.actor_ip or ""),
            log.action.value,
            log.resource_type,
            log.resource_id or "",
            mask_pii(log.description),
            mask_pii(log.old_value or ""),
            mask_pii(log.new_value or ""),
            mask_pii(log.reason or ""),
            log.related_ticket_id or "",
        ]
        writer.writerow(row)

    return output.getvalue()


def generate_json_content(logs: list[AuditLog]) -> str:
    """監査ログをJSON形式に変換（PII自動マスキング）"""
    data = []
    for log in logs:
        data.append({
            "id": log.id,
            "created_at": log.created_at.isoformat(),
            "actor_id": log.actor_id,
            "actor_email": mask_pii(log.actor_email or ""),
            "actor_ip": mask_pii(log.actor_ip or ""),
            "actor_user_agent": log.actor_user_agent,
            "action": log.action.value,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "description": mask_pii(log.description),
            "old_value": mask_pii(log.old_value or ""),
            "new_value": mask_pii(log.new_value or ""),
            "reason": mask_pii(log.reason or ""),
            "related_ticket_id": log.related_ticket_id,
        })
    return json.dumps(data, ensure_ascii=False, indent=2)


# ============== 権限チェック用依存関係 ==============

# Auditor または Manager のみアクセス可能
AUDIT_ALLOWED_ROLES = [UserRole.AUDITOR, UserRole.MANAGER]


# ============== エンドポイント ==============

@router.get(
    "/logs",
    response_model=AuditLogListResponse,
    summary="監査ログ一覧取得",
    description="監査ログの一覧をフィルタ条件・ページネーション付きで取得します。Auditor/Managerロールのみアクセス可能。",
)
async def get_audit_logs(
    db: DbSession,
    current_user: CurrentUser,
    # ページネーション
    page: int = Query(default=1, ge=1, description="ページ番号"),
    page_size: int = Query(default=50, ge=1, le=200, description="1ページあたりの件数"),
    # フィルタ条件
    action: Optional[AuditAction] = Query(default=None, description="アクション種別でフィルタ"),
    resource_type: Optional[str] = Query(default=None, description="リソース種別でフィルタ"),
    resource_id: Optional[int] = Query(default=None, description="リソースIDでフィルタ"),
    actor_id: Optional[int] = Query(default=None, description="アクターIDでフィルタ"),
    related_ticket_id: Optional[int] = Query(default=None, description="関連チケットIDでフィルタ"),
    # 日時範囲
    start_date: Optional[datetime] = Query(default=None, description="開始日時（UTC）"),
    end_date: Optional[datetime] = Query(default=None, description="終了日時（UTC）"),
):
    """
    監査ログ一覧を取得する。

    フィルタ条件:
    - action: アクション種別（login, ticket_create 等）
    - resource_type: リソース種別（ticket, user, knowledge 等）
    - resource_id: 特定リソースのログのみ取得
    - actor_id: 特定ユーザーの操作ログのみ取得
    - related_ticket_id: 特定チケットに関連するログのみ取得
    - start_date/end_date: 日時範囲指定
    """
    # 権限チェック: Auditor または Manager のみ
    if current_user.role not in AUDIT_ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="監査ログへのアクセス権限がありません。Auditor または Manager ロールが必要です。"
        )

    # クエリ構築
    conditions = []

    if action is not None:
        conditions.append(AuditLog.action == action)

    if resource_type is not None:
        conditions.append(AuditLog.resource_type == resource_type)

    if resource_id is not None:
        conditions.append(AuditLog.resource_id == resource_id)

    if actor_id is not None:
        conditions.append(AuditLog.actor_id == actor_id)

    if related_ticket_id is not None:
        conditions.append(AuditLog.related_ticket_id == related_ticket_id)

    if start_date is not None:
        conditions.append(AuditLog.created_at >= start_date)

    if end_date is not None:
        conditions.append(AuditLog.created_at <= end_date)

    # 総件数取得
    count_query = select(func.count(AuditLog.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # ページネーション計算
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    offset = (page - 1) * page_size

    # データ取得（新しい順）
    data_query = (
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    if conditions:
        data_query = data_query.where(and_(*conditions))

    result = await db.execute(data_query)
    logs = result.scalars().all()

    # レスポンス構築
    items = [convert_audit_log_to_response(log) for log in logs]

    return AuditLogListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/logs/{log_id}",
    response_model=AuditLogDetailResponse,
    summary="監査ログ詳細取得",
    description="指定したIDの監査ログ詳細を取得します。Auditor/Managerロールのみアクセス可能。",
)
async def get_audit_log_detail(
    log_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    特定の監査ログの詳細を取得する。

    Args:
        log_id: 監査ログID

    Returns:
        監査ログの詳細情報

    Raises:
        404: 指定されたIDのログが見つからない場合
        403: アクセス権限がない場合
    """
    # 権限チェック
    if current_user.role not in AUDIT_ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="監査ログへのアクセス権限がありません。Auditor または Manager ロールが必要です。"
        )

    # ログ取得
    result = await db.execute(
        select(AuditLog).where(AuditLog.id == log_id)
    )
    log = result.scalar_one_or_none()

    if log is None:
        raise HTTPException(
            status_code=404,
            detail=f"監査ログID {log_id} が見つかりません。"
        )

    return AuditLogDetailResponse(
        id=log.id,
        actor_id=log.actor_id,
        actor_email=log.actor_email,
        actor_ip=log.actor_ip,
        actor_user_agent=log.actor_user_agent,
        action=log.action.value,
        resource_type=log.resource_type,
        resource_id=log.resource_id,
        description=log.description,
        old_value=log.old_value,
        new_value=log.new_value,
        reason=log.reason,
        related_ticket_id=log.related_ticket_id,
        created_at=log.created_at,
    )


@router.get(
    "/export",
    summary="監査ログエクスポート",
    description="監査ログをCSVまたはJSON形式でエクスポートします。月次監査レポート用。Auditor/Managerロールのみアクセス可能。",
)
async def export_audit_logs(
    db: DbSession,
    current_user: CurrentUser,
    # エクスポート形式
    format: ExportFormat = Query(default=ExportFormat.CSV, description="エクスポート形式（csv/json）"),
    # 日時範囲（デフォルト: 過去30日間）
    start_date: Optional[datetime] = Query(default=None, description="開始日時（UTC）"),
    end_date: Optional[datetime] = Query(default=None, description="終了日時（UTC）"),
    # フィルタ条件
    action: Optional[AuditAction] = Query(default=None, description="アクション種別でフィルタ"),
    resource_type: Optional[str] = Query(default=None, description="リソース種別でフィルタ"),
    actor_id: Optional[int] = Query(default=None, description="アクターIDでフィルタ"),
    # 件数制限（大量データ対策）
    limit: int = Query(default=10000, ge=1, le=100000, description="最大エクスポート件数"),
):
    """
    監査ログをエクスポートする。

    月次監査レポート作成のため、指定期間の監査ログをCSVまたはJSON形式で
    ダウンロードできます。

    注意:
    - デフォルトでは過去30日間のログをエクスポートします
    - 最大100,000件までエクスポート可能です
    - 大量データの場合は日時範囲を絞ってください

    Returns:
        CSV/JSONファイルのストリーミングレスポンス
    """
    # 権限チェック
    if current_user.role not in AUDIT_ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="監査ログへのアクセス権限がありません。Auditor または Manager ロールが必要です。"
        )

    # デフォルト日時範囲: 過去30日間
    now = datetime.now(timezone.utc)
    if end_date is None:
        end_date = now
    if start_date is None:
        start_date = now - timedelta(days=30)

    # クエリ構築
    conditions = [
        AuditLog.created_at >= start_date,
        AuditLog.created_at <= end_date,
    ]

    if action is not None:
        conditions.append(AuditLog.action == action)

    if resource_type is not None:
        conditions.append(AuditLog.resource_type == resource_type)

    if actor_id is not None:
        conditions.append(AuditLog.actor_id == actor_id)

    # データ取得
    query = (
        select(AuditLog)
        .where(and_(*conditions))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )

    result = await db.execute(query)
    logs = result.scalars().all()

    # エクスポート操作自体を監査ログに記録
    export_log = AuditLog.create_log(
        action=AuditAction.EXPORT_DATA,
        resource_type="audit_log",
        description=f"監査ログをエクスポート: {len(logs)}件 ({format.value}形式)",
        actor_id=current_user.id,
        actor_email=current_user.email,
        reason=f"期間: {start_date.isoformat()} - {end_date.isoformat()}",
    )
    db.add(export_log)
    await db.commit()

    # ファイル名生成
    filename_date = now.strftime("%Y%m%d_%H%M%S")

    if format == ExportFormat.CSV:
        # CSV形式
        content = generate_csv_content(logs)
        filename = f"audit_logs_{filename_date}.csv"
        media_type = "text/csv; charset=utf-8"

        # BOM付きUTF-8（Excel対応）
        content_with_bom = "\ufeff" + content

        return StreamingResponse(
            iter([content_with_bom]),
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
            },
        )
    else:
        # JSON形式
        content = generate_json_content(logs)
        filename = f"audit_logs_{filename_date}.json"
        media_type = "application/json; charset=utf-8"

        return StreamingResponse(
            iter([content]),
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
            },
        )


@router.get(
    "/statistics",
    response_model=AuditStatistics,
    summary="監査ログ統計情報取得",
    description="指定期間の監査ログ統計情報を取得します。Auditor/Managerロールのみアクセス可能。",
)
async def get_audit_statistics(
    db: DbSession,
    current_user: CurrentUser,
    days: int = Query(default=30, ge=1, le=365, description="統計対象期間（日数）"),
):
    """
    監査ログの統計情報を取得する。

    アクション種別別、リソース種別別の集計を提供します。
    KPIレビューや監査報告書作成に活用できます。

    Args:
        days: 統計対象期間（デフォルト30日）

    Returns:
        統計情報（総ログ数、アクション別件数、リソース別件数）
    """
    # 権限チェック
    if current_user.role not in AUDIT_ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="監査ログへのアクセス権限がありません。Auditor または Manager ロールが必要です。"
        )

    now = datetime.now(timezone.utc)
    period_start = now - timedelta(days=days)

    # 総件数
    total_result = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.created_at >= period_start)
    )
    total_logs = total_result.scalar() or 0

    # アクション別集計
    action_result = await db.execute(
        select(AuditLog.action, func.count(AuditLog.id))
        .where(AuditLog.created_at >= period_start)
        .group_by(AuditLog.action)
    )
    logs_by_action = {row[0].value: row[1] for row in action_result}

    # リソース種別集計
    resource_result = await db.execute(
        select(AuditLog.resource_type, func.count(AuditLog.id))
        .where(AuditLog.created_at >= period_start)
        .group_by(AuditLog.resource_type)
    )
    logs_by_resource = {row[0]: row[1] for row in resource_result}

    return AuditStatistics(
        total_logs=total_logs,
        logs_by_action=logs_by_action,
        logs_by_resource=logs_by_resource,
        period_start=period_start,
        period_end=now,
    )
