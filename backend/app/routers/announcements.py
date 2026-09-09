from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.database.db import get_db
from app.models.models import Announcement, RoleEnum, User
from app.services import activity_service, notification_service
from app.utils.response import ApiException, ok

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


def _announcement_out(a: Announcement) -> dict:
    return {
        "id": a.id,
        "title": a.title,
        "content": a.content,
        "category": a.category,
        "target_role": a.target_role,
        "author_name": a.author.username if a.author else "Admin",
        "published_at": a.published_at.isoformat() if a.published_at else None,
        "expires_at": a.expires_at.isoformat() if a.expires_at else None,
        "is_active": a.is_active,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@router.get("")
def list_announcements(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Announcement).filter(Announcement.is_active == True)  # noqa: E712

    # Role filter: users only see announcements targeted to ALL or their specific role
    if user.role != RoleEnum.admin:
        query = query.filter(
            Announcement.target_role.in_(["ALL", user.role.value.upper(), user.role.value.lower()])
        )

    announcements = query.order_by(Announcement.published_at.desc()).all()
    return ok({"announcements": [_announcement_out(a) for a in announcements]})


@router.post("")
def create_announcement(
    title: str = Form(...),
    content: str = Form(...),
    category: str = Form("Info"),
    target_role: str = Form("ALL"),  # ALL, STUDENT, TEACHER, ADMIN
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    clean_title = title.strip()
    clean_content = content.strip()
    if not clean_title or not clean_content:
        raise ApiException(400, "INVALID_INPUT", "Judul dan isi pengumuman wajib diisi.")

    ann = Announcement(
        title=clean_title,
        content=clean_content,
        category=category.strip(),
        target_role=target_role.strip().upper(),
        created_by=user.id,
        published_at=datetime.utcnow(),
        is_active=True,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)

    # Notify users about new announcement
    target = target_role.strip().upper()
    if target in ("STUDENT", "ALL"):
        notification_service.notify_role(
            db, role="student", title="Pengumuman Baru", message=clean_title, notif_type="info", link="/student/announcements"
        )
    if target in ("TEACHER", "ALL"):
        notification_service.notify_role(
            db, role="teacher", title="Pengumuman Baru", message=clean_title, notif_type="info", link="/teacher/announcements"
        )

    activity_service.log_activity(
        db,
        action="ANNOUNCEMENT_CREATE",
        description=f"Membuat pengumuman: {clean_title}",
        user_id=user.id,
    )

    return ok(_announcement_out(ann))


@router.put("/{announcement_id}")
def update_announcement(
    announcement_id: int,
    title: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    target_role: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    ann = db.query(Announcement).get(announcement_id)
    if not ann:
        raise ApiException(404, "NOT_FOUND", "Pengumuman tidak ditemukan.")

    if title is not None:
        ann.title = title.strip()
    if content is not None:
        ann.content = content.strip()
    if category is not None:
        ann.category = category.strip()
    if target_role is not None:
        ann.target_role = target_role.strip().upper()
    if is_active is not None:
        ann.is_active = is_active

    db.commit()
    db.refresh(ann)

    activity_service.log_activity(
        db,
        action="ANNOUNCEMENT_UPDATE",
        description=f"Memperbarui pengumuman #{ann.id}: {ann.title}",
        user_id=user.id,
    )

    return ok(_announcement_out(ann))


@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    ann = db.query(Announcement).get(announcement_id)
    if not ann:
        raise ApiException(404, "NOT_FOUND", "Pengumuman tidak ditemukan.")

    db.delete(ann)
    db.commit()

    activity_service.log_activity(
        db,
        action="ANNOUNCEMENT_DELETE",
        description=f"Menghapus pengumuman #{announcement_id}",
        user_id=user.id,
    )

    return ok({"id": announcement_id, "deleted": True})
