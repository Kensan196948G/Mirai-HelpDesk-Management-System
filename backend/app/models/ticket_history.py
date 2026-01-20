"""
Ticket History Model

追記専用の監査証跡テーブル。チケットの全ての変更履歴を記録する。
このテーブルのレコードは削除・更新禁止。
"""

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.ticket import Ticket


class HistoryAction(str, enum.Enum):
    """履歴アクションの種類"""
    CREATED = "created"                    # チケット作成
    STATUS_CHANGED = "status_changed"      # ステータス変更
    PRIORITY_CHANGED = "priority_changed"  # 優先度変更
    ASSIGNED = "assigned"                  # 担当者割当
    REASSIGNED = "reassigned"              # 担当者変更
    CATEGORY_CHANGED = "category_changed"  # カテゴリ変更
    UPDATED = "updated"                    # 一般的な更新
    RESOLVED = "resolved"                  # 解決
    CLOSED = "closed"                      # クローズ
    REOPENED = "reopened"                  # 再開
    ESCALATED = "escalated"                # エスカレーション
    COMMENT_ADDED = "comment_added"        # コメント追加
    ATTACHMENT_ADDED = "attachment_added"  # 添付ファイル追加


class TicketHistory(Base):
    """
    チケット履歴モデル（追記専用）

    変更不可の監査証跡として機能する。
    記録内容: 誰が(actor_id)、いつ(created_at)、何を(action)、変更前(before)、変更後(after)

    重要: このテーブルはINSERTのみ許可。UPDATE/DELETEは禁止。
    """

    __tablename__ = "ticket_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # 対象チケット
    ticket_id: Mapped[int] = mapped_column(
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # 誰が（操作者）
    actor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True  # システム操作の場合はNULL
    )

    # 何を（アクション種別）
    action: Mapped[HistoryAction] = mapped_column(
        Enum(HistoryAction),
        nullable=False,
        index=True
    )

    # 変更対象フィールド（例: "status", "assignee_id", "priority"）
    field_name: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # 変更前の値（JSON形式）
    before: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 変更後の値（JSON形式）
    after: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 変更理由・備考（任意）
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # いつ（作成日時のみ、更新は不可）
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    # リレーションシップ
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="history")
    actor: Mapped["User | None"] = relationship("User", foreign_keys=[actor_id])

    def __repr__(self) -> str:
        return f"<TicketHistory(id={self.id}, ticket_id={self.ticket_id}, action={self.action})>"

    @classmethod
    def create_entry(
        cls,
        ticket_id: int,
        action: HistoryAction,
        actor_id: int | None = None,
        field_name: str | None = None,
        before: str | None = None,
        after: str | None = None,
        reason: str | None = None,
    ) -> "TicketHistory":
        """
        履歴エントリを作成するファクトリメソッド

        Args:
            ticket_id: 対象チケットID
            action: アクション種別
            actor_id: 操作者ID（システム操作の場合はNone）
            field_name: 変更対象フィールド名
            before: 変更前の値（JSON文字列）
            after: 変更後の値（JSON文字列）
            reason: 変更理由

        Returns:
            TicketHistory: 新しい履歴エントリ
        """
        return cls(
            ticket_id=ticket_id,
            actor_id=actor_id,
            action=action,
            field_name=field_name,
            before=before,
            after=after,
            reason=reason,
        )
