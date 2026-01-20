"""
SLA Policy Model

SLAポリシーモデル - チケットの優先度別対応時間を定義する
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.ticket import TicketPriority

if TYPE_CHECKING:
    from app.models.ticket import Ticket


class SLAPolicy(Base):
    """
    SLAポリシーモデル

    各優先度レベルに対する応答時間と解決時間を定義する。

    設定例:
    - P1（全社停止）: 初動 15分(0.25h) / 暫定復旧 2h / 恒久対応 24h
    - P2（部門影響）: 初動 1h / 復旧 8h
    - P3（個人）: 初動 4h / 解決 3営業日(24h)
    - P4（問い合わせ）: 初動 1営業日(8h) / 解決 5営業日(40h)

    注: 営業時間外を考慮する場合は将来的に拡張が必要
    """

    __tablename__ = "sla_policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # ポリシー情報
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 優先度
    priority: Mapped[TicketPriority] = mapped_column(Enum(TicketPriority), unique=True, nullable=False)

    # SLA時間（時間単位）
    response_time_hours: Mapped[float] = mapped_column(Float, nullable=False)  # 初動対応時間
    resolution_time_hours: Mapped[float] = mapped_column(Float, nullable=False)  # 解決時間

    # ステータス
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # タイムスタンプ
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # リレーションシップ（将来的にチケットとの紐付けに使用可能）
    # tickets: Mapped[list["Ticket"]] = relationship("Ticket", back_populates="sla_policy")

    def __repr__(self) -> str:
        return f"<SLAPolicy(id={self.id}, priority={self.priority}, name={self.name})>"

    @property
    def response_time_minutes(self) -> float:
        """初動対応時間を分単位で取得"""
        return self.response_time_hours * 60

    @property
    def resolution_time_minutes(self) -> float:
        """解決時間を分単位で取得"""
        return self.resolution_time_hours * 60
