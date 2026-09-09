"""
Notification service for alerting users and roles about attendance, support tickets, and announcements.
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.models import Notification, User, RoleEnum


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notif_type: str = "info",
    link: Optional[str] = None,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notif_type,
        link=link,
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def notify_role(
    db: Session,
    role: str,
    title: str,
    message: str,
    notif_type: str = "info",
    link: Optional[str] = None,
) -> List[Notification]:
    """Sends a notification to all active users with a specified role (e.g. 'admin')."""
    role_enum = RoleEnum(role)
    users = db.query(User).filter(User.role == role_enum, User.is_active == True).all()  # noqa: E712
    created = []
    for u in users:
        notif = Notification(
            user_id=u.id,
            title=title,
            message=message,
            type=notif_type,
            link=link,
            is_read=False,
        )
        db.add(notif)
        created.append(notif)
    db.commit()
    return created


def get_unread_count(db: Session, user_id: int) -> int:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
        .count()
    )
