"""
Reports Routes

Dashboard statistics and SLA reporting.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import func, select

from app.models.ticket import Ticket, TicketStatus, TicketPriority, TicketCategory
from app.models.user import UserRole
from app.api.deps import CurrentUser, DbSession


router = APIRouter()


# ============== Schemas ==============

class DashboardStats(BaseModel):
    """Dashboard statistics."""
    total_tickets: int
    open_tickets: int
    resolved_today: int
    overdue_tickets: int
    avg_resolution_hours: float | None
    tickets_by_status: dict[str, int]
    tickets_by_priority: dict[str, int]
    tickets_by_category: dict[str, int]


class SLAReport(BaseModel):
    """SLA compliance report."""
    period_start: str
    period_end: str
    total_tickets: int
    sla_met: int
    sla_breached: int
    compliance_rate: float
    by_priority: dict[str, dict]


# ============== Routes ==============

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get dashboard statistics."""
    # Only staff can see dashboard
    if current_user.role == UserRole.REQUESTER:
        # Requesters see only their stats
        base_filter = Ticket.requester_id == current_user.id
    else:
        base_filter = True
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Total tickets
    total_result = await db.execute(
        select(func.count(Ticket.id)).where(base_filter)
    )
    total_tickets = total_result.scalar() or 0
    
    # Open tickets (not closed/canceled)
    open_statuses = [
        TicketStatus.NEW,
        TicketStatus.TRIAGE,
        TicketStatus.ASSIGNED,
        TicketStatus.IN_PROGRESS,
        TicketStatus.PENDING_CUSTOMER,
        TicketStatus.PENDING_APPROVAL,
        TicketStatus.PENDING_CHANGE,
        TicketStatus.REOPENED,
    ]
    open_result = await db.execute(
        select(func.count(Ticket.id)).where(
            base_filter,
            Ticket.status.in_(open_statuses),
        )
    )
    open_tickets = open_result.scalar() or 0
    
    # Resolved today
    resolved_result = await db.execute(
        select(func.count(Ticket.id)).where(
            base_filter,
            Ticket.resolved_at >= today_start,
        )
    )
    resolved_today = resolved_result.scalar() or 0
    
    # Overdue tickets
    overdue_result = await db.execute(
        select(func.count(Ticket.id)).where(
            base_filter,
            Ticket.due_at < now,
            Ticket.status.in_(open_statuses),
        )
    )
    overdue_tickets = overdue_result.scalar() or 0
    
    # Tickets by status
    status_result = await db.execute(
        select(Ticket.status, func.count(Ticket.id))
        .where(base_filter)
        .group_by(Ticket.status)
    )
    tickets_by_status = {row[0].value: row[1] for row in status_result}
    
    # Tickets by priority
    priority_result = await db.execute(
        select(Ticket.priority, func.count(Ticket.id))
        .where(base_filter)
        .group_by(Ticket.priority)
    )
    tickets_by_priority = {row[0].value: row[1] for row in priority_result}
    
    # Tickets by category
    category_result = await db.execute(
        select(Ticket.category, func.count(Ticket.id))
        .where(base_filter)
        .group_by(Ticket.category)
    )
    tickets_by_category = {row[0].value: row[1] for row in category_result}
    
    return DashboardStats(
        total_tickets=total_tickets,
        open_tickets=open_tickets,
        resolved_today=resolved_today,
        overdue_tickets=overdue_tickets,
        avg_resolution_hours=None,  # TODO: Calculate
        tickets_by_status=tickets_by_status,
        tickets_by_priority=tickets_by_priority,
        tickets_by_category=tickets_by_category,
    )


@router.get("/sla", response_model=SLAReport)
async def get_sla_report(
    current_user: CurrentUser,
    db: DbSession,
    days: int = Query(default=30, ge=1, le=365),
):
    """Get SLA compliance report for the specified period."""
    # Only managers can see SLA reports
    if current_user.role not in [UserRole.MANAGER, UserRole.AUDITOR]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc)
    period_start = now - timedelta(days=days)
    
    # Get closed tickets in period
    result = await db.execute(
        select(Ticket).where(
            Ticket.closed_at >= period_start,
            Ticket.closed_at <= now,
        )
    )
    tickets = result.scalars().all()
    
    total = len(tickets)
    sla_met = 0
    sla_breached = 0
    by_priority = {p.value: {"total": 0, "met": 0, "breached": 0} for p in TicketPriority}
    
    for ticket in tickets:
        priority = ticket.priority.value
        by_priority[priority]["total"] += 1
        
        # Simple SLA check: was it resolved before due date?
        if ticket.due_at and ticket.resolved_at:
            if ticket.resolved_at <= ticket.due_at:
                sla_met += 1
                by_priority[priority]["met"] += 1
            else:
                sla_breached += 1
                by_priority[priority]["breached"] += 1
        else:
            # No due date = assume met
            sla_met += 1
            by_priority[priority]["met"] += 1
    
    compliance_rate = (sla_met / total * 100) if total > 0 else 100.0
    
    return SLAReport(
        period_start=period_start.isoformat(),
        period_end=now.isoformat(),
        total_tickets=total,
        sla_met=sla_met,
        sla_breached=sla_breached,
        compliance_rate=round(compliance_rate, 2),
        by_priority=by_priority,
    )


from fastapi import HTTPException
