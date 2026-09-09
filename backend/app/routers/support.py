import os
import random
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user, require_role
from app.database.db import get_db
from app.models.models import (
    RoleEnum,
    SupportTicket,
    TicketMessage,
    TicketPriority,
    TicketStatus,
    User,
)
from app.services import activity_service, notification_service
from app.utils.response import ApiException, ok

router = APIRouter(prefix="/api/support", tags=["support"])
settings = get_settings()

ALLOWED_ATTACHMENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/x-png",
    "image/webp",
    "application/pdf",
    "application/octet-stream",
}
ALLOWED_ATTACHMENT_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}

EXT_BY_TYPE = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/png": ".png",
    "image/x-png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}


def _upload_dir() -> str:
    path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), settings.UPLOAD_ATTACHMENTS_DIR
    )
    os.makedirs(path, exist_ok=True)
    return path


async def _save_attachment(file: UploadFile) -> str:
    ext = os.path.splitext(file.filename or "")[1].lower()
    is_valid_type = file.content_type in ALLOWED_ATTACHMENT_TYPES
    is_valid_ext = ext in ALLOWED_ATTACHMENT_EXTENSIONS
    if not (is_valid_type or is_valid_ext):
        raise ApiException(
            400,
            "INVALID_FILE_TYPE",
            "File lampiran harus berupa gambar (JPG, PNG, WEBP) atau PDF.",
        )
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.MAX_ATTACHMENT_SIZE_MB:
        raise ApiException(
            400,
            "FILE_TOO_LARGE",
            f"Ukuran file maksimal {settings.MAX_ATTACHMENT_SIZE_MB}MB.",
        )
    if not ext or ext not in ALLOWED_ATTACHMENT_EXTENSIONS:
        ext = EXT_BY_TYPE.get(file.content_type, ".jpg")
    filename = f"att_{uuid.uuid4().hex}{ext}"
    full_path = os.path.join(_upload_dir(), filename)
    with open(full_path, "wb") as f:
        f.write(contents)
    return filename


def _user_display_name(u: Optional[User]) -> str:
    if not u:
        return "Unknown"
    if u.student_profile:
        return u.student_profile.full_name
    if u.teacher_profile:
        return u.teacher_profile.full_name
    return u.username.title()


def _attachment_url(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    clean = os.path.basename(path)
    return f"/api/support/attachments/{clean}"


def _ticket_out(t: SupportTicket, include_messages: bool = False) -> dict:
    data = {
        "id": t.id,
        "ticket_number": t.ticket_number,
        "user_id": t.user_id,
        "user_name": _user_display_name(t.user),
        "user_role": t.user.role.value if t.user else "student",
        "subject": t.subject,
        "category": t.category,
        "priority": t.priority.value if hasattr(t.priority, "value") else str(t.priority),
        "status": t.status.value if hasattr(t.status, "value") else str(t.status),
        "attachment_path": _attachment_url(t.attachment_path),
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        "is_deleted": t.deleted_at is not None,
        "deleted_at": t.deleted_at.isoformat() if t.deleted_at else None,
        "message_count": len(t.messages) if t.messages else 0,
    }
    if include_messages and t.messages:
        msgs = []
        for m in t.messages:
            if m.deleted_at is None:
                msgs.append({
                    "id": m.id,
                    "sender_id": m.sender_id,
                    "sender_name": _user_display_name(m.sender),
                    "sender_role": m.sender.role.value if m.sender else "user",
                    "message": m.message,
                    "attachment_path": _attachment_url(m.attachment_path),
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                })
        data["messages"] = msgs
    return data


# =========================================================================
# TICKET LIST & SEARCH
# =========================================================================

@router.get("/tickets")
def list_tickets(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    include_deleted: bool = Query(False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(SupportTicket)

    # Role filter: Students and Teachers only see their own tickets
    if user.role != RoleEnum.admin:
        query = query.filter(SupportTicket.user_id == user.id)
        query = query.filter(SupportTicket.deleted_at == None)  # noqa: E711
    else:
        if include_deleted:
            query = query.filter(SupportTicket.deleted_at != None)  # noqa: E711
        else:
            query = query.filter(SupportTicket.deleted_at == None)  # noqa: E711

    if status:
        query = query.filter(SupportTicket.status == status)
    if category:
        query = query.filter(SupportTicket.category == category)
    if priority:
        query = query.filter(SupportTicket.priority == priority)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (SupportTicket.subject.ilike(term)) | (SupportTicket.ticket_number.ilike(term))
        )

    tickets = query.order_by(SupportTicket.updated_at.desc()).all()
    return ok({"tickets": [_ticket_out(t) for t in tickets]})


# =========================================================================
# TICKET STATS (ADMIN)
# =========================================================================

@router.get("/stats")
def get_ticket_stats(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    base = db.query(SupportTicket).filter(SupportTicket.deleted_at == None)  # noqa: E711
    total = base.count()
    open_count = base.filter(SupportTicket.status == TicketStatus.OPEN).count()
    in_progress = base.filter(SupportTicket.status == TicketStatus.IN_PROGRESS).count()
    waiting_user = base.filter(SupportTicket.status == TicketStatus.WAITING_FOR_USER).count()
    resolved = base.filter(SupportTicket.status == TicketStatus.RESOLVED).count()
    closed = base.filter(SupportTicket.status == TicketStatus.CLOSED).count()
    high_priority = base.filter(SupportTicket.priority == TicketPriority.HIGH).count()

    return ok({
        "total": total,
        "open": open_count,
        "in_progress": in_progress,
        "waiting_for_user": waiting_user,
        "resolved": resolved,
        "closed": closed,
        "high_priority": high_priority,
    })


# =========================================================================
# CREATE TICKET
# =========================================================================

@router.post("/tickets")
async def create_ticket(
    subject: str = Form(...),
    category: str = Form(...),
    priority: str = Form("MEDIUM"),
    description: Optional[str] = Form(None),
    message: Optional[str] = Form(None),
    attachment: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    clean_sub = subject.strip()
    raw_desc = description if (description is not None and description.strip()) else message
    clean_desc = (raw_desc or "").strip()
    if not clean_sub:
        raise ApiException(400, "INVALID_SUBJECT", "Subjek tiket wajib diisi.")
    if not clean_desc:
        raise ApiException(400, "INVALID_DESCRIPTION", "Deskripsi masalah wajib diisi.")

    # Generate unique ticket number: SKG-XXXXXX
    ticket_num = f"SKG-{random.randint(100000, 999999)}"
    while db.query(SupportTicket).filter(SupportTicket.ticket_number == ticket_num).first():
        ticket_num = f"SKG-{random.randint(100000, 999999)}"

    # Priority parsing
    try:
        prio_enum = TicketPriority(priority.upper())
    except ValueError:
        prio_enum = TicketPriority.MEDIUM

    att_filename = None
    if attachment:
        att_filename = await _save_attachment(attachment)

    ticket = SupportTicket(
        ticket_number=ticket_num,
        user_id=user.id,
        subject=clean_sub,
        category=category.strip(),
        priority=prio_enum,
        status=TicketStatus.OPEN,
        attachment_path=att_filename,
    )
    db.add(ticket)
    db.flush()

    # Create initial message
    first_message = TicketMessage(
        ticket_id=ticket.id,
        sender_id=user.id,
        message=clean_desc,
        attachment_path=att_filename,
    )
    db.add(first_message)
    db.commit()
    db.refresh(ticket)

    # Notify Admins
    sender_name = _user_display_name(user)
    notification_service.notify_role(
        db,
        role="admin",
        title="Tiket Bantuan Baru",
        message=f"{ticket_num}: {clean_sub} (dari {sender_name})",
        notif_type="ticket",
        link=f"/admin/support",
    )

    activity_service.log_activity(
        db,
        action="TICKET_CREATE",
        description=f"Membuat tiket #{ticket_num}: {clean_sub}",
        user_id=user.id,
    )

    return ok(_ticket_out(ticket, include_messages=True))


# =========================================================================
# GET TICKET DETAIL & CONVERSATION
# =========================================================================

@router.get("/tickets/{ticket_id}")
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = db.query(SupportTicket).get(ticket_id)
    if not ticket:
        raise ApiException(404, "TICKET_NOT_FOUND", "Tiket tidak ditemukan.")

    # Strict Ownership Check: Students & Teachers cannot inspect others' tickets
    if user.role != RoleEnum.admin and ticket.user_id != user.id:
        raise ApiException(404, "TICKET_NOT_FOUND", "Tiket tidak ditemukan.")

    return ok(_ticket_out(ticket, include_messages=True))


# =========================================================================
# SEND MESSAGE / REPLY
# =========================================================================

@router.post("/tickets/{ticket_id}/messages")
async def send_ticket_message(
    ticket_id: int,
    message: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    attachment: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = db.query(SupportTicket).get(ticket_id)
    if not ticket or ticket.deleted_at is not None:
        raise ApiException(404, "TICKET_NOT_FOUND", "Tiket tidak ditemukan.")

    # Strict Ownership Check
    if user.role != RoleEnum.admin and ticket.user_id != user.id:
        raise ApiException(404, "TICKET_NOT_FOUND", "Tiket tidak ditemukan.")

    raw_msg = message if (message is not None and message.strip()) else text
    clean_msg = (raw_msg or "").strip()
    if not clean_msg and attachment:
        clean_msg = "Lampiran berkas"
    elif not clean_msg:
        raise ApiException(400, "INVALID_MESSAGE", "Pesan balasan tidak boleh kosong.")

    att_filename = None
    if attachment:
        att_filename = await _save_attachment(attachment)

    new_msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=user.id,
        message=clean_msg,
        attachment_path=att_filename,
    )
    db.add(new_msg)

    # Workflow status update
    if user.role == RoleEnum.admin:
        # Admin replied -> if was waiting for user, remains or in progress
        if ticket.status == TicketStatus.OPEN:
            ticket.status = TicketStatus.IN_PROGRESS
        ticket.updated_at = datetime.utcnow()

        # Notify ticket owner
        notification_service.create_notification(
            db,
            user_id=ticket.user_id,
            title="Balasan Tiket Bantuan",
            message=f"Admin membalas tiket #{ticket.ticket_number}: {ticket.subject}",
            notif_type="ticket",
            link=f"/student/support",
        )
    else:
        # User replied
        if ticket.status in (TicketStatus.WAITING_FOR_USER, TicketStatus.RESOLVED):
            ticket.status = TicketStatus.IN_PROGRESS
        ticket.updated_at = datetime.utcnow()

        # Notify Admin
        notification_service.notify_role(
            db,
            role="admin",
            title="Pesan Baru dari User",
            message=f"{_user_display_name(user)} membalas tiket #{ticket.ticket_number}",
            notif_type="ticket",
            link=f"/admin/support",
        )

    db.commit()
    db.refresh(ticket)

    activity_service.log_activity(
        db,
        action="TICKET_REPLY",
        description=f"Membalas pesan pada tiket #{ticket.ticket_number}",
        user_id=user.id,
    )

    return ok(_ticket_out(ticket, include_messages=True))


@router.delete("/tickets/{ticket_id}/messages")
def clear_ticket_messages(
    ticket_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = db.query(SupportTicket).get(ticket_id)
    if not ticket or ticket.deleted_at is not None:
        raise ApiException(404, "TICKET_NOT_FOUND", "Tiket tidak ditemukan.")

    if user.role != RoleEnum.admin and ticket.user_id != user.id:
        raise ApiException(403, "FORBIDDEN", "Anda tidak memiliki izin menghapus riwayat pesan tiket ini.")

    now = datetime.utcnow()
    # Soft delete all reply messages (index > 0), preserving initial report description
    for idx, msg in enumerate(ticket.messages):
        if idx > 0 and msg.deleted_at is None:
            msg.deleted_at = now
            msg.deleted_by = user.id

    ticket.updated_at = now
    db.commit()
    db.refresh(ticket)

    activity_service.log_activity(
        db,
        action="TICKET_MESSAGES_CLEAR",
        description=f"Menghapus riwayat balasan pada tiket #{ticket.ticket_number}",
        user_id=user.id,
    )

    return ok(_ticket_out(ticket, include_messages=True))


@router.delete("/tickets/{ticket_id}/messages/{message_id}")
def delete_ticket_message(
    ticket_id: int,
    message_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = db.query(SupportTicket).get(ticket_id)
    if not ticket or ticket.deleted_at is not None:
        raise ApiException(404, "TICKET_NOT_FOUND", "Tiket tidak ditemukan.")

    msg = db.query(TicketMessage).filter(
        TicketMessage.id == message_id,
        TicketMessage.ticket_id == ticket_id,
    ).first()
    if not msg or msg.deleted_at is not None:
        raise ApiException(404, "MESSAGE_NOT_FOUND", "Pesan tidak ditemukan.")

    # Permission check: admin, sender of the message, or ticket owner
    if user.role != RoleEnum.admin and msg.sender_id != user.id and ticket.user_id != user.id:
        raise ApiException(403, "FORBIDDEN", "Anda tidak memiliki izin menghapus pesan ini.")

    msg.deleted_at = datetime.utcnow()
    msg.deleted_by = user.id
    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)

    return ok(_ticket_out(ticket, include_messages=True))


# =========================================================================
# UPDATE STATUS / PRIORITY (ADMIN)
# =========================================================================

@router.patch("/tickets/{ticket_id}/status")
def update_ticket_status(
    ticket_id: int,
    status: str = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    ticket = db.query(SupportTicket).get(ticket_id)
    if not ticket:
        raise ApiException(404, "TICKET_NOT_FOUND", "Tiket tidak ditemukan.")

    try:
        new_status = TicketStatus(status.upper())
    except ValueError:
        raise ApiException(400, "INVALID_STATUS", f"Status '{status}' tidak valid.")

    ticket.status = new_status
    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)

    # Notify ticket owner
    notification_service.create_notification(
        db,
        user_id=ticket.user_id,
        title="Status Tiket Diperbarui",
        message=f"Status tiket #{ticket.ticket_number} diubah menjadi {new_status.value}",
        notif_type="ticket",
        link="/student/support",
    )

    activity_service.log_activity(
        db,
        action="TICKET_STATUS_UPDATE",
        description=f"Mengubah status tiket #{ticket.ticket_number} menjadi {new_status.value}",
        user_id=user.id,
    )

    return ok(_ticket_out(ticket, include_messages=True))


@router.patch("/tickets/{ticket_id}/priority")
def update_ticket_priority(
    ticket_id: int,
    priority: str = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    ticket = db.query(SupportTicket).get(ticket_id)
    if not ticket:
        raise ApiException(404, "TICKET_NOT_FOUND", "Tiket tidak ditemukan.")

    try:
        new_prio = TicketPriority(priority.upper())
    except ValueError:
        raise ApiException(400, "INVALID_PRIORITY", f"Prioritas '{priority}' tidak valid.")

    ticket.priority = new_prio
    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)

    activity_service.log_activity(
        db,
        action="TICKET_PRIORITY_UPDATE",
        description=f"Mengubah prioritas tiket #{ticket.ticket_number} menjadi {new_prio.value}",
        user_id=user.id,
    )

    return ok(_ticket_out(ticket, include_messages=True))


# =========================================================================
# SOFT DELETE & RESTORE (ADMIN)
# =========================================================================

@router.delete("/tickets/{ticket_id}")
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = db.query(SupportTicket).get(ticket_id)
    if not ticket:
        raise ApiException(404, "TICKET_NOT_FOUND", "Tiket tidak ditemukan.")

    if user.role != RoleEnum.admin and ticket.user_id != user.id:
        raise ApiException(403, "FORBIDDEN", "Anda tidak memiliki izin menghapus tiket ini.")

    ticket.deleted_at = datetime.utcnow()
    ticket.deleted_by = user.id
    db.commit()

    activity_service.log_activity(
        db,
        action="TICKET_DELETE",
        description=f"Soft delete tiket #{ticket.ticket_number}",
        user_id=user.id,
    )

    return ok({"id": ticket.id, "ticket_number": ticket.ticket_number, "deleted": True})


@router.post("/tickets/{ticket_id}/restore")
def restore_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    ticket = db.query(SupportTicket).get(ticket_id)
    if not ticket:
        raise ApiException(404, "TICKET_NOT_FOUND", "Tiket tidak ditemukan.")

    ticket.deleted_at = None
    ticket.deleted_by = None
    db.commit()

    activity_service.log_activity(
        db,
        action="TICKET_RESTORE",
        description=f"Memulihkan tiket #{ticket.ticket_number}",
        user_id=user.id,
    )

    return ok({"id": ticket.id, "ticket_number": ticket.ticket_number, "restored": True})


# =========================================================================
# ATTACHMENT STREAMING
# =========================================================================

@router.get("/attachments/{filename}")
def get_attachment(filename: str):
    safe_name = os.path.basename(filename)
    file_path = os.path.join(_upload_dir(), safe_name)
    if not os.path.exists(file_path):
        raise ApiException(404, "FILE_NOT_FOUND", "Berkas lampiran tidak ditemukan.")
    ext = os.path.splitext(safe_name)[1].lower()
    media_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
    }
    media_type = media_map.get(ext, "application/octet-stream")
    return FileResponse(file_path, media_type=media_type)
