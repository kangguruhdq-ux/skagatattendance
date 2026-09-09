import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user, require_role
from app.database.db import get_db
from app.models.models import (
    AttendanceCorrection,
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
    CorrectionStatus,
    RoleEnum,
    Student,
    User,
)
from app.services import activity_service, notification_service
from app.utils.response import ApiException, ok

router = APIRouter(prefix="/api/corrections", tags=["corrections"])
settings = get_settings()


def _upload_dir() -> str:
    path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), settings.UPLOAD_ATTACHMENTS_DIR
    )
    os.makedirs(path, exist_ok=True)
    return path


async def _save_attachment(file: UploadFile) -> str:
    contents = await file.read()
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    filename = f"corr_{uuid.uuid4().hex}{ext}"
    full_path = os.path.join(_upload_dir(), filename)
    with open(full_path, "wb") as f:
        f.write(contents)
    return filename


def _correction_out(c: AttendanceCorrection) -> dict:
    student_name = c.student.full_name if c.student else None
    student_code = c.student.student_code if c.student else None
    class_name = c.student.school_class.name if c.student and c.student.school_class else None
    subject_name = c.session.subject.name if c.session and c.session.subject else None

    return {
        "id": c.id,
        "student_id": c.student_id,
        "student_name": student_name,
        "student_code": student_code,
        "class_name": class_name,
        "session_id": c.session_id,
        "subject_name": subject_name,
        "date": c.date,
        "target_status": c.target_status.value if hasattr(c.target_status, "value") else str(c.target_status),
        "reason": c.reason,
        "explanation": c.explanation,
        "attachment_path": c.attachment_path,
        "status": c.status.value if hasattr(c.status, "value") else str(c.status),
        "reviewed_by": c.reviewed_by,
        "reviewer_name": c.reviewer.username if c.reviewer else None,
        "reviewed_at": c.reviewed_at.isoformat() if c.reviewed_at else None,
        "review_notes": c.review_notes,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


# =========================================================================
# STUDENT: SUBMIT & LIST CORRECTIONS
# =========================================================================

@router.post("")
async def submit_correction(
    date: str = Form(...),
    target_status: str = Form(...),
    reason: str = Form(...),
    explanation: str = Form(...),
    session_id: Optional[int] = Form(None),
    attachment: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("student")),
):
    if not user.student_profile:
        raise ApiException(400, "NO_STUDENT_PROFILE", "Profil siswa tidak ditemukan.")

    student = user.student_profile

    # Validate target status
    try:
        status_enum = AttendanceStatus(target_status.lower())
    except ValueError:
        raise ApiException(400, "INVALID_STATUS", f"Status '{target_status}' tidak valid.")

    clean_reason = reason.strip()
    clean_explanation = explanation.strip()
    if not clean_reason:
        raise ApiException(400, "REASON_REQUIRED", "Alasan pengajuan wajib diisi.")
    if not clean_explanation:
        raise ApiException(400, "EXPLANATION_REQUIRED", "Penjelasan detail wajib diisi.")

    att_path = None
    if attachment:
        att_path = await _save_attachment(attachment)

    correction = AttendanceCorrection(
        student_id=student.id,
        session_id=session_id,
        date=date.strip(),
        target_status=status_enum,
        reason=clean_reason,
        explanation=clean_explanation,
        attachment_path=att_path,
        status=CorrectionStatus.PENDING,
    )
    db.add(correction)
    db.commit()
    db.refresh(correction)

    # Notify Admin & Teachers
    notification_service.notify_role(
        db,
        role="admin",
        title="Pengajuan Koreksi Presensi",
        message=f"{student.full_name} mengajukan koreksi presensi tanggal {date}",
        notif_type="correction",
        link="/admin/corrections",
    )

    activity_service.log_activity(
        db,
        action="CORRECTION_SUBMIT",
        description=f"Siswa {student.full_name} mengajukan koreksi presensi tanggal {date}",
        user_id=user.id,
    )

    return ok(_correction_out(correction))


@router.get("/my")
def get_my_corrections(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("student")),
):
    if not user.student_profile:
        return ok({"corrections": []})

    corrections = (
        db.query(AttendanceCorrection)
        .filter(AttendanceCorrection.student_id == user.student_profile.id)
        .order_by(AttendanceCorrection.created_at.desc())
        .all()
    )
    return ok({"corrections": [_correction_out(c) for c in corrections]})


# =========================================================================
# TEACHER / ADMIN: LIST & REVIEW CORRECTIONS
# =========================================================================

@router.get("/teacher")
def get_teacher_corrections(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher")),
):
    if not user.teacher_profile:
        return ok({"corrections": []})

    # Teacher sees corrections for sessions taught by them, or for their students
    teacher_id = user.teacher_profile.id
    sessions = db.query(AttendanceSession.id).filter(AttendanceSession.teacher_id == teacher_id).all()
    session_ids = [s[0] for s in sessions]

    corrections = (
        db.query(AttendanceCorrection)
        .filter(AttendanceCorrection.session_id.in_(session_ids))
        .order_by(AttendanceCorrection.created_at.desc())
        .all()
    )
    return ok({"corrections": [_correction_out(c) for c in corrections]})


@router.get("/admin")
def get_admin_corrections(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    query = db.query(AttendanceCorrection)
    if status:
        query = query.filter(AttendanceCorrection.status == status.upper())
    corrections = query.order_by(AttendanceCorrection.created_at.desc()).all()
    return ok({"corrections": [_correction_out(c) for c in corrections]})


@router.post("/{correction_id}/review")
def review_correction(
    correction_id: int,
    decision: str = Form(...),  # "APPROVED" or "REJECTED"
    review_notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher", "admin")),
):
    correction = db.query(AttendanceCorrection).get(correction_id)
    if not correction:
        raise ApiException(404, "CORRECTION_NOT_FOUND", "Pengajuan koreksi tidak ditemukan.")

    clean_decision = decision.strip().upper()
    if clean_decision not in ("APPROVED", "REJECTED"):
        raise ApiException(400, "INVALID_DECISION", "Keputusan harus APPROVED atau REJECTED.")

    correction.status = CorrectionStatus(clean_decision)
    correction.reviewed_by = user.id
    correction.reviewed_at = datetime.utcnow()
    correction.review_notes = review_notes.strip() if review_notes else None

    # If APPROVED: update attendance record!
    if clean_decision == "APPROVED":
        target_st = correction.target_status
        if correction.session_id:
            record = (
                db.query(AttendanceRecord)
                .filter(
                    AttendanceRecord.student_id == correction.student_id,
                    AttendanceRecord.session_id == correction.session_id,
                )
                .first()
            )
            if record:
                record.status = target_st
                record.manual_override = True
                record.override_reason = (
                    f"Koreksi disetujui ({user.username}): {review_notes or 'Disetujui'}"
                )
            else:
                new_record = AttendanceRecord(
                    student_id=correction.student_id,
                    session_id=correction.session_id,
                    status=target_st,
                    manual_override=True,
                    override_reason=f"Koreksi disetujui ({user.username}): {review_notes or 'Disetujui'}",
                )
                db.add(new_record)

    db.commit()
    db.refresh(correction)

    # Notify student
    student_user_id = correction.student.user_id if correction.student else None
    if student_user_id:
        status_label = "disetujui" if clean_decision == "APPROVED" else "ditolak"
        notification_service.create_notification(
            db,
            user_id=student_user_id,
            title="Hasil Pengajuan Koreksi Presensi",
            message=f"Pengajuan koreksi presensi tanggal {correction.date} telah {status_label}.",
            notif_type="correction",
            link="/student/corrections",
        )

    activity_service.log_activity(
        db,
        action=f"CORRECTION_{clean_decision}",
        description=f"{user.username} {clean_decision.lower()} koreksi presensi #{correction.id}",
        user_id=user.id,
    )

    return ok(_correction_out(correction))
