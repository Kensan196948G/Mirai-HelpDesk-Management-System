"""
M365 Operations Routes

Microsoft 365 task management with approval workflow.
Graph API integration for actual M365 operations.
"""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.ticket import Ticket, TicketStatus
from app.models.approval import Approval, ApprovalStatus
from app.models.m365_task import M365Task, M365TaskType, M365TaskStatus, M365ExecutionLog
from app.models.user import UserRole
from app.api.deps import CurrentUser, DbSession
from app.m365.operations import M365Operations
from app.m365.exceptions import (
    M365Error,
    M365APIError,
    M365AuthenticationError,
    M365AuthorizationError,
    M365ValidationError,
)
from utils.masking import mask_pii, preview_pii

logger = logging.getLogger(__name__)

router = APIRouter()


# ============== Schemas ==============

class M365TaskListResponse(BaseModel):
    """Schema for paginated M365 task list."""
    items: list["M365TaskResponse"]
    total: int
    page: int
    page_size: int


class ApprovalResponse(BaseModel):
    """Schema for approval response."""
    id: int
    ticket_id: int
    ticket_number: str
    ticket_subject: str
    request_reason: str
    status: str
    approver_id: int | None
    approver_name: str | None
    approved_at: str | None
    comment: str | None
    created_at: str


class ApprovalListResponse(BaseModel):
    """Schema for paginated approval list."""
    items: list[ApprovalResponse]
    total: int
    page: int
    page_size: int

class M365TaskCreate(BaseModel):
    """Schema for creating an M365 task."""
    ticket_id: int
    task_type: M365TaskType
    target_upn: str | None = None
    target_resource_id: str | None = None
    target_description: str = Field(..., min_length=5)
    checklist: str | None = None
    rollback_procedure: str | None = None


class M365TaskResponse(BaseModel):
    """Schema for M365 task response."""
    id: int
    ticket_id: int
    task_type: str
    status: str
    target_upn: str | None
    target_resource_id: str | None
    target_description: str
    operator_id: int | None
    created_at: str
    completed_at: str | None


class ExecutionLogCreate(BaseModel):
    """Schema for creating an execution log."""
    action: str = Field(..., min_length=1)
    method: str = Field(..., pattern="^(admin_center|powershell|graph_api)$")
    command_or_action: str = Field(..., min_length=1)
    result: str = Field(..., pattern="^(success|failure)$")
    result_details: str | None = None
    error_message: str | None = None


class ApprovalRequest(BaseModel):
    """Schema for requesting approval."""
    reason: str = Field(..., min_length=10)


class ApprovalDecision(BaseModel):
    """Schema for approval decision."""
    comment: str | None = None


# ============== Routes ==============

from fastapi import Query


@router.get("/tasks", response_model=M365TaskListResponse)
async def list_m365_tasks(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: M365TaskStatus | None = Query(default=None, alias="status"),
):
    """List M365 tasks (Agent, M365 Operator, Manager only)."""
    if current_user.role not in [UserRole.AGENT, UserRole.M365_OPERATOR, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")

    from sqlalchemy import func
    from app.models.user import User

    query = select(M365Task).options(selectinload(M365Task.ticket))

    if status_filter:
        query = query.where(M365Task.status == status_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(M365Task.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    tasks = result.scalars().all()

    items = [
        M365TaskResponse(
            id=t.id,
            ticket_id=t.ticket_id,
            task_type=t.task_type.value,
            status=t.status.value,
            target_upn=t.target_upn,
            target_resource_id=t.target_resource_id,
            target_description=t.target_description,
            operator_id=t.operator_id,
            created_at=t.created_at.isoformat(),
            completed_at=t.completed_at.isoformat() if t.completed_at else None,
        )
        for t in tasks
    ]

    return M365TaskListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/approvals", response_model=ApprovalListResponse)
async def list_approvals(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: ApprovalStatus | None = Query(default=None, alias="status"),
):
    """List approval requests (Approver, Manager only)."""
    if current_user.role not in [UserRole.APPROVER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")

    from sqlalchemy import func
    from app.models.user import User

    query = select(Approval).options(
        selectinload(Approval.ticket),
        selectinload(Approval.approver),
    )

    if status_filter:
        query = query.where(Approval.status == status_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Approval.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    approvals = result.scalars().all()

    items = [
        ApprovalResponse(
            id=a.id,
            ticket_id=a.ticket_id,
            ticket_number=a.ticket.ticket_number if a.ticket else "",
            ticket_subject=a.ticket.subject if a.ticket else "",
            request_reason=a.request_reason or "",
            status=a.status.value,
            approver_id=a.approver_id,
            approver_name=a.approver.display_name if a.approver else None,
            approved_at=a.approved_at.isoformat() if a.approved_at else None,
            comment=a.comment,
            created_at=a.created_at.isoformat(),
        )
        for a in approvals
    ]

    return ApprovalListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/tasks", response_model=M365TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_m365_task(
    data: M365TaskCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Create an M365 task for a ticket."""
    # Only agents can create M365 tasks
    if current_user.role not in [UserRole.AGENT, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify ticket exists
    result = await db.execute(select(Ticket).where(Ticket.id == data.ticket_id))
    ticket = result.scalar_one_or_none()
    
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    task = M365Task(
        ticket_id=data.ticket_id,
        task_type=data.task_type,
        target_upn=data.target_upn,
        target_resource_id=data.target_resource_id,
        target_description=data.target_description,
        checklist=data.checklist,
        rollback_procedure=data.rollback_procedure,
    )
    
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    return M365TaskResponse(
        id=task.id,
        ticket_id=task.ticket_id,
        task_type=task.task_type.value,
        status=task.status.value,
        target_upn=task.target_upn,
        target_resource_id=task.target_resource_id,
        target_description=task.target_description,
        operator_id=task.operator_id,
        created_at=task.created_at.isoformat(),
        completed_at=task.completed_at.isoformat() if task.completed_at else None,
    )


@router.post("/tasks/{task_id}/request-approval")
async def request_approval(
    task_id: int,
    data: ApprovalRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """Request approval for an M365 task."""
    result = await db.execute(
        select(M365Task).options(selectinload(M365Task.ticket)).where(M365Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if approval already exists
    existing = await db.execute(
        select(Approval).where(
            Approval.ticket_id == task.ticket_id,
            Approval.status == ApprovalStatus.PENDING,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Approval already pending")
    
    # Create approval request
    approval = Approval(
        ticket_id=task.ticket_id,
        request_reason=data.reason,
    )
    
    # Update ticket status
    task.ticket.status = TicketStatus.PENDING_APPROVAL
    
    db.add(approval)
    await db.commit()
    
    return {"message": "Approval requested", "approval_id": approval.id}


@router.post("/approvals/{approval_id}/approve")
async def approve_task(
    approval_id: int,
    data: ApprovalDecision,
    current_user: CurrentUser,
    db: DbSession,
):
    """Approve an M365 task."""
    # Only approvers and managers can approve
    if current_user.role not in [UserRole.APPROVER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.execute(
        select(Approval).options(selectinload(Approval.ticket)).where(Approval.id == approval_id)
    )
    approval = result.scalar_one_or_none()
    
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found")
    
    if approval.status != ApprovalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Approval already processed")
    
    # Approve
    approval.approve(current_user.id, data.comment)
    
    # Update ticket status
    approval.ticket.status = TicketStatus.PENDING_CHANGE
    
    await db.commit()
    
    return {"message": "Approved", "status": "approved"}


@router.post("/approvals/{approval_id}/reject")
async def reject_task(
    approval_id: int,
    data: ApprovalDecision,
    current_user: CurrentUser,
    db: DbSession,
):
    """Reject an M365 task."""
    if current_user.role not in [UserRole.APPROVER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not data.comment:
        raise HTTPException(status_code=400, detail="Rejection comment required")
    
    result = await db.execute(
        select(Approval).options(selectinload(Approval.ticket)).where(Approval.id == approval_id)
    )
    approval = result.scalar_one_or_none()
    
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found")
    
    if approval.status != ApprovalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Approval already processed")
    
    # Reject
    approval.reject(current_user.id, data.comment)
    
    # Update ticket status back to assigned
    approval.ticket.status = TicketStatus.ASSIGNED
    
    await db.commit()
    
    return {"message": "Rejected", "status": "rejected"}


@router.post("/tasks/{task_id}/execute")
async def execute_m365_task(
    task_id: int,
    data: ExecutionLogCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Execute M365 task with Graph API integration (M365 Operator only).

    This endpoint:
    1. Verifies approval and SOD compliance
    2. Executes the M365 operation via Graph API
    3. Records execution log with results
    4. Updates task status
    """
    # Only M365 operators can execute
    if current_user.role not in [UserRole.M365_OPERATOR, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Only M365 Operators can execute tasks")

    result = await db.execute(
        select(M365Task).options(selectinload(M365Task.ticket)).where(M365Task.id == task_id)
    )
    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    # Verify approval
    approval_result = await db.execute(
        select(Approval).where(
            Approval.ticket_id == task.ticket_id,
            Approval.status == ApprovalStatus.APPROVED,
        )
    )
    approval = approval_result.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=400, detail="Task requires approval before execution")

    # SOD check: operator cannot be the approver
    if approval.approver_id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="SOD violation: Approver cannot be the operator",
        )

    # Execute M365 operation via Graph API
    execution_result = {}
    result_status = "success"
    error_message = None

    try:
        async with M365Operations() as m365_ops:
            # Log with PII masking
            logger.info(
                f"Executing M365 task: type={task.task_type}, target={mask_pii(task.target_upn)}, "
                f"operator={current_user.id}, action={preview_pii(data.action, max_length=80)}"
            )

            # Execute based on task type
            if task.task_type == M365TaskType.LICENSE_ASSIGN:
                execution_result = await m365_ops.assign_license(
                    user_id=task.target_upn,
                    sku_id=task.target_resource_id,
                    operator_comment=data.action
                )

            elif task.task_type == M365TaskType.LICENSE_REMOVE:
                execution_result = await m365_ops.remove_license(
                    user_id=task.target_upn,
                    sku_id=task.target_resource_id,
                    operator_comment=data.action
                )

            elif task.task_type == M365TaskType.PASSWORD_RESET:
                # Use provided password or generate new one
                new_password = data.command_or_action if data.command_or_action else None
                execution_result = await m365_ops.reset_password(
                    user_id=task.target_upn,
                    new_password=new_password,
                    operator_comment=data.action
                )

            elif task.task_type == M365TaskType.MFA_RESET:
                execution_result = await m365_ops.reset_mfa(
                    user_id=task.target_upn,
                    operator_comment=data.action
                )

            elif task.task_type == M365TaskType.GROUP_ADD:
                execution_result = await m365_ops.add_user_to_group(
                    group_id=task.target_resource_id,
                    user_id=task.target_upn,
                    operator_comment=data.action
                )

            elif task.task_type == M365TaskType.GROUP_REMOVE:
                execution_result = await m365_ops.remove_user_from_group(
                    group_id=task.target_resource_id,
                    user_id=task.target_upn,
                    operator_comment=data.action
                )

            else:
                # For other task types, require manual execution logging
                logger.warning(f"Task type {task.task_type} requires manual execution")
                execution_result = {
                    "status": "manual_execution_required",
                    "message": f"Task type {task.task_type} is not yet automated"
                }

    except M365ValidationError as e:
        result_status = "failure"
        error_message = f"Validation error: {e.message}"
        logger.error(f"M365 validation error: {error_message}", exc_info=True)
        execution_result = {"error": error_message, "details": e.details}

    except M365AuthenticationError as e:
        result_status = "failure"
        error_message = f"Authentication error: {e.message}"
        logger.error(f"M365 authentication error: {error_message}", exc_info=True)
        execution_result = {"error": error_message, "details": e.details}

    except M365AuthorizationError as e:
        result_status = "failure"
        error_message = f"Authorization error: {e.message}"
        logger.error(f"M365 authorization error: {error_message}", exc_info=True)
        execution_result = {"error": error_message, "details": e.details}

    except M365APIError as e:
        result_status = "failure"
        error_message = f"API error: {e.message}"
        logger.error(f"M365 API error: {error_message}", exc_info=True)
        execution_result = {"error": error_message, "details": e.details, "status_code": e.status_code}

    except M365Error as e:
        result_status = "failure"
        error_message = f"M365 error: {e.message}"
        logger.error(f"M365 error: {error_message}", exc_info=True)
        execution_result = {"error": error_message, "details": e.details}

    except Exception as e:
        result_status = "failure"
        error_message = f"Unexpected error: {str(e)}"
        logger.error(
            f"Unexpected error during M365 execution: {mask_pii(error_message)}",
            exc_info=True
        )
        execution_result = {"error": error_message}

    # Log execution result with PII masking
    logger.info(
        f"M365 task execution completed: task_id={task_id}, result={result_status}, "
        f"operator={current_user.id}, details={preview_pii(json.dumps(execution_result), max_length=100)}"
    )

    # Create execution log with Graph API results
    log = M365ExecutionLog(
        task_id=task_id,
        operator_id=current_user.id,
        action=data.action,
        method="graph_api",  # Always use graph_api for automated operations
        command_or_action=data.command_or_action or json.dumps({"task_type": task.task_type.value}),
        result=result_status,
        result_details=json.dumps(execution_result, ensure_ascii=False, default=str),
        error_message=error_message,
    )

    # Update task status
    if task.status == M365TaskStatus.PENDING:
        task.status = M365TaskStatus.IN_PROGRESS
        task.started_at = datetime.now(timezone.utc)
        task.operator_id = current_user.id
        task.ticket.status = TicketStatus.IN_PROGRESS

    if result_status == "success":
        task.status = M365TaskStatus.COMPLETED
        task.completed_at = datetime.now(timezone.utc)
        # Optionally update ticket to resolved
        task.ticket.status = TicketStatus.RESOLVED
        task.ticket.resolved_at = datetime.now(timezone.utc)
    elif result_status == "failure":
        task.status = M365TaskStatus.FAILED

    db.add(log)
    await db.commit()
    await db.refresh(task)

    return {
        "message": "Task execution completed",
        "log_id": log.id,
        "task_status": task.status.value,
        "result": result_status,
        "execution_result": execution_result,
        "error_message": error_message
    }


# ============== New Graph API Integration Endpoints ==============


@router.get("/users/search")
async def search_m365_users(
    query: str = Query(..., min_length=1, description="Search query for users"),
    top: int = Query(default=10, ge=1, le=50, description="Maximum results to return"),
    current_user: CurrentUser = None,
    db: DbSession = None,
):
    """Search M365 users (Manager/M365 Operator only).

    Search for users by displayName, mail, or userPrincipalName.
    """
    if current_user.role not in [UserRole.MANAGER, UserRole.M365_OPERATOR, UserRole.AGENT]:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        async with M365Operations() as m365_ops:
            users = await m365_ops.search_users(query, top)

            return {
                "query": query,
                "count": len(users),
                "users": users
            }

    except M365AuthenticationError as e:
        logger.error(f"Authentication error in user search: {e.message}")
        raise HTTPException(
            status_code=503,
            detail="M365 authentication is not configured or failed. Please contact system administrator."
        )

    except M365APIError as e:
        logger.error(f"API error in user search: {e.message}")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to search users: {e.message}"
        )

    except Exception as e:
        logger.error(f"Unexpected error in user search: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Internal server error during user search"
        )


@router.get("/users/{user_id}")
async def get_m365_user(
    user_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get M365 user details (Manager/M365 Operator only).

    Retrieve detailed information about a specific user.
    """
    if current_user.role not in [UserRole.MANAGER, UserRole.M365_OPERATOR, UserRole.AGENT]:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        async with M365Operations() as m365_ops:
            user = await m365_ops.get_user(user_id)
            return {"user": user}

    except M365APIError as e:
        if e.status_code == 404:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        logger.error(f"API error getting user: {e.message}")
        raise HTTPException(status_code=502, detail=f"Failed to get user: {e.message}")

    except M365AuthenticationError:
        raise HTTPException(status_code=503, detail="M365 authentication failed")

    except Exception as e:
        logger.error(f"Unexpected error getting user: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/licenses/available")
async def get_available_licenses(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get available M365 licenses (Manager/M365 Operator only).

    Returns list of all available license SKUs with consumption details.
    """
    if current_user.role not in [UserRole.MANAGER, UserRole.M365_OPERATOR]:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        async with M365Operations() as m365_ops:
            licenses = await m365_ops.list_available_licenses()

            return {
                "count": len(licenses),
                "licenses": licenses
            }

    except M365AuthenticationError:
        raise HTTPException(status_code=503, detail="M365 authentication failed")

    except M365APIError as e:
        logger.error(f"API error getting licenses: {e.message}")
        raise HTTPException(status_code=502, detail=f"Failed to get licenses: {e.message}")

    except Exception as e:
        logger.error(f"Unexpected error getting licenses: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/users/{user_id}/licenses")
async def get_user_licenses(
    user_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get user's assigned licenses (Manager/M365 Operator only).

    Returns list of licenses assigned to the specified user.
    """
    if current_user.role not in [UserRole.MANAGER, UserRole.M365_OPERATOR, UserRole.AGENT]:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        async with M365Operations() as m365_ops:
            licenses = await m365_ops.get_user_licenses(user_id)

            return {
                "user_id": user_id,
                "count": len(licenses),
                "licenses": licenses
            }

    except M365APIError as e:
        if e.status_code == 404:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        logger.error(f"API error getting user licenses: {e.message}")
        raise HTTPException(status_code=502, detail=f"Failed to get user licenses: {e.message}")

    except M365AuthenticationError:
        raise HTTPException(status_code=503, detail="M365 authentication failed")

    except Exception as e:
        logger.error(f"Unexpected error getting user licenses: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/tasks/{task_id}/summary")
async def get_task_operation_summary(
    task_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get operation summary for an M365 task (M365 Operator/Manager only).

    Provides preview information about what the task will do,
    including current state of the target resource.
    """
    if current_user.role not in [UserRole.M365_OPERATOR, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(M365Task).where(M365Task.id == task_id)
    )
    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    try:
        async with M365Operations() as m365_ops:
            summary = await m365_ops.get_operation_summary(
                task_type=task.task_type.value,
                target_upn=task.target_upn
            )

            return {
                "task_id": task_id,
                "task_type": task.task_type.value,
                "target_description": task.target_description,
                "current_state": summary
            }

    except M365APIError as e:
        logger.error(f"API error getting task summary: {e.message}")
        raise HTTPException(status_code=502, detail=f"Failed to get task summary: {e.message}")

    except M365AuthenticationError:
        raise HTTPException(status_code=503, detail="M365 authentication failed")

    except Exception as e:
        logger.error(f"Unexpected error getting task summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
