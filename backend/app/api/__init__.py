"""
API Router

Combines all API route modules.
"""

from fastapi import APIRouter

from app.api.routes import auth, tickets, knowledge, users, reports, m365, audit, sla

api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["Tickets"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["Knowledge"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(m365.router, prefix="/m365", tags=["M365 Operations"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Logs"])
api_router.include_router(sla.router, prefix="/sla", tags=["SLA Policies"])
