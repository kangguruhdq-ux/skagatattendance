from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.db import get_db
from app.models.models import Notification, User
from app.services import notification_service
from app.utils.response import ApiException, ok

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def get_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    unread_count = notification_service.get_unread_count(db, user.id)

    out = [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "link": n.link,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]
    return ok({"notifications": out, "unread_count": unread_count})


@router.post("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    notif = db.query(Notification).get(notification_id)
    if not notif or notif.user_id != user.id:
        raise ApiException(404, "NOT_FOUND", "Notifikasi tidak ditemukan.")

    notif.is_read = True
    db.commit()
    return ok({"id": notif.id, "is_read": True})


@router.post("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.is_read == False)  # noqa: E712
        .update({"is_read": True})
    )
    db.commit()
    return ok({"marked_all_read": True})


@router.delete("/all")
def delete_all_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    deleted_count = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return ok({"deleted_count": deleted_count, "all_deleted": True})


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    notif = db.query(Notification).get(notification_id)
    if not notif or notif.user_id != user.id:
        raise ApiException(404, "NOT_FOUND", "Notifikasi tidak ditemukan.")

    db.delete(notif)
    db.commit()
    return ok({"id": notification_id, "deleted": True})

