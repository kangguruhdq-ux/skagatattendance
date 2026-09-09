"""
Activity log service for audit trails.
Records actions like LOGIN, SESSION_CREATE, CORRECTION_APPROVE, TICKET_REPLY, etc.
"""
from typing import Optional
from sqlalchemy.orm import Session

from app.models.models import ActivityLog


def log_activity(
    db: Session,
    action: str,
    description: str,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    details: Optional[str] = None,
) -> ActivityLog:
    entry = ActivityLog(
        user_id=user_id,
        action=action,
        description=description,
        ip_address=ip_address,
        details=details,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
