"""
Utility modules for Mirai HelpDesk Management System.
"""

from .audit_log import log_api_operation, log_m365_operation

__all__ = ["log_api_operation", "log_m365_operation"]
