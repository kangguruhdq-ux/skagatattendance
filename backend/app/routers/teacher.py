from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.database.db import get_db
from app.models.models import (
    AttendanceSession,
    AttendanceRecord,
    AttendanceStatus,
    PhotoStatus,
    Student,
    Teacher,
    User,
    SchoolClass,
    Subject,
    Schedule,
)
from app.services import attendance_service
from app.utils.response import ok, ApiException

router = APIRouter(prefix="/api/teacher", tags=["teacher"])


def _get_teacher(user: User):
    if not user.teacher_profile:
        raise ApiException(
            400,
            "TEACHER_PROFILE_MISSING",
            "No teacher profile linked to this account.",
        )
    return user.teacher_profile


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher")),
):
    teacher = _get_teacher(user)
    today_str = date.today().isoformat()

    sessions_today = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.teacher_id == teacher.id,
            AttendanceSession.date == today_str,
            AttendanceSession.is_deleted != True,
        )
        .order_by(AttendanceSession.start_time)
        .all()
    )

    active_count = sum(
        1
        for s in sessions_today
        if attendance_service.get_session_status(s) == "active"
    )

    class_ids = {s.class_id for s in sessions_today}

    total_students_taught = (
        db.query(Student)
        .filter(
            Student.class_id.in_(class_ids),
            Student.is_active == True,  # noqa: E712
        )
        .count()
        if class_ids
        else 0
    )

    total_records_today = 0
    present_like_today = 0

    for s in sessions_today:
        records = (
            db.query(AttendanceRecord)
            .filter(AttendanceRecord.session_id == s.id)
            .all()
        )

        total_records_today += len(records)

        present_like_today += sum(
            1
            for r in records
            if r.status
            in (
                AttendanceStatus.present,
                AttendanceStatus.late,
            )
        )

    attendance_rate_today = (
        round((present_like_today / total_records_today) * 100, 1)
        if total_records_today
        else 0.0
    )

    recent_sessions = [
        {
            "id": s.id,
            "subject": s.subject.name if s.subject else "",
            "class_name": s.school_class.name if s.school_class else "",
            "start_time": s.start_time,
            "end_time": s.end_time,
            "status": attendance_service.get_session_status(s),
        }
        for s in sessions_today
    ]

    today_weekday = date.today().weekday()
    schedules_today = (
        db.query(Schedule)
        .filter(
            Schedule.teacher_id == teacher.id,
            Schedule.day_of_week == today_weekday,
        )
        .order_by(Schedule.start_time)
        .all()
    )
    today_schedule = [
        {
            "id": sc.id,
            "subject": sc.subject.name if sc.subject else "",
            "class_name": sc.school_class.name if sc.school_class else "",
            "start_time": sc.start_time,
            "end_time": sc.end_time,
            "room": sc.room or "",
        }
        for sc in schedules_today
    ]

    return ok(
        {
            "full_name": teacher.full_name,
            "today_sessions": len(sessions_today),
            "active_sessions": active_count,
            "total_students_taught": total_students_taught,
            "attendance_rate_today": attendance_rate_today,
            "recent_sessions": recent_sessions,
            "today_schedule": today_schedule,
        }
    )


@router.get("/schedule")
def get_teacher_schedule(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher")),
):
    teacher = _get_teacher(user)
    schedules = (
        db.query(Schedule)
        .filter(Schedule.teacher_id == teacher.id)
        .order_by(Schedule.day_of_week, Schedule.start_time)
        .all()
    )
    return ok({
        "schedules": [
            {
                "id": s.id,
                "class_id": s.class_id,
                "class_name": s.school_class.name if s.school_class else "",
                "subject_id": s.subject_id,
                "subject_name": s.subject.name if s.subject else "",
                "day_of_week": s.day_of_week,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "room": s.room or "",
            }
            for s in schedules
        ]
    })


@router.get("/sessions")
def my_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher")),
):
    teacher = _get_teacher(user)

    sessions = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.teacher_id == teacher.id,
            AttendanceSession.is_deleted != True,
        )
        .order_by(
            AttendanceSession.date.desc(),
            AttendanceSession.start_time.desc(),
        )
        .all()
    )

    return ok(
        {
            "sessions": [
                {
                    "id": s.id,
                    "subject": s.subject.name if s.subject else "",
                    "class_name": s.school_class.name if s.school_class else "",
                    "date": s.date,
                    "start_time": s.start_time,
                    "end_time": s.end_time,
                    "status": attendance_service.get_session_status(s),
                }
                for s in sessions
            ]
        }
    )


# ============================================================
# TEACHER - LIST CLASSES
# ============================================================

@router.get("/classes")
def list_classes(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher")),
):
    # Pastikan akun benar-benar mempunyai profil guru
    _get_teacher(user)

    classes = (
        db.query(SchoolClass)
        .order_by(
            SchoolClass.grade,
            SchoolClass.name,
        )
        .all()
    )

    return ok(
        {
            "classes": [
                {
                    "id": c.id,
                    "name": c.name,
                    "major": c.major,
                    "grade": c.grade,
                    "academic_year": c.academic_year,
                }
                for c in classes
            ]
        }
    )


# ============================================================
# TEACHER - LIST SUBJECTS
# ============================================================

@router.get("/subjects")
def list_subjects(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher")),
):
    # Pastikan akun benar-benar mempunyai profil guru
    _get_teacher(user)

    subjects = (
        db.query(Subject)
        .order_by(Subject.name)
        .all()
    )

    return ok(
        {
            "subjects": [
                {
                    "id": s.id,
                    "name": s.name,
                    "code": getattr(s, "code", None),
                }
                for s in subjects
            ]
        }
    )


# ============================================================
# TEACHER - PROFILE
# ============================================================

class TeacherProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    subject_specialty: Optional[str] = None


@router.get("/profile")
def get_teacher_profile(
    user: User = Depends(require_role("teacher")),
):
    teacher = _get_teacher(user)
    return ok(
        {
            "id": teacher.id,
            "username": user.username,
            "teacher_code": teacher.teacher_code,
            "full_name": teacher.full_name,
            "subject_specialty": teacher.subject_specialty,
            "role": user.role.value,
        }
    )


@router.put("/profile")
def update_teacher_profile(
    payload: TeacherProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher")),
):
    teacher = _get_teacher(user)
    if payload.full_name is not None and payload.full_name.strip():
        teacher.full_name = payload.full_name.strip()
    if payload.subject_specialty is not None:
        teacher.subject_specialty = payload.subject_specialty.strip()
    db.commit()
    db.refresh(teacher)
    return ok(
        {
            "id": teacher.id,
            "teacher_code": teacher.teacher_code,
            "full_name": teacher.full_name,
            "subject_specialty": teacher.subject_specialty,
        }
    )


# ============================================================
# TEACHER - SESSION UPDATE & CANCEL
# ============================================================

class TeacherSessionUpdate(BaseModel):
    end_time: Optional[str] = None
    late_threshold_minutes: Optional[int] = None


@router.put("/sessions/{session_id}")
def update_teacher_session(
    session_id: int,
    payload: TeacherSessionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher")),
):
    teacher = _get_teacher(user)
    session = db.query(AttendanceSession).get(session_id)
    if not session:
        raise ApiException(404, "SESSION_NOT_FOUND", "Sesi presensi tidak ditemukan.")

    # Ownership check
    if session.teacher_id != teacher.id:
        raise ApiException(403, "FORBIDDEN", "Anda tidak memiliki izin mengedit sesi guru lain.")

    if payload.end_time is not None:
        if payload.end_time <= session.start_time:
            raise ApiException(400, "INVALID_END_TIME", "Jam selesai harus lebih besar dari jam mulai.")
        session.end_time = payload.end_time

    if payload.late_threshold_minutes is not None:
        if payload.late_threshold_minutes < 0:
            raise ApiException(400, "INVALID_THRESHOLD", "Toleransi keterlambatan tidak boleh negatif.")
        session.late_threshold_minutes = payload.late_threshold_minutes

    db.commit()
    db.refresh(session)
    return ok(
        {
            "id": session.id,
            "start_time": session.start_time,
            "end_time": session.end_time,
            "late_threshold_minutes": session.late_threshold_minutes,
        }
    )


@router.delete("/sessions/{session_id}")
def cancel_teacher_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher")),
):
    teacher = _get_teacher(user)
    session = db.query(AttendanceSession).get(session_id)
    if not session or session.is_deleted:
        raise ApiException(404, "SESSION_NOT_FOUND", "Sesi presensi tidak ditemukan.")

    # Ownership check
    if session.teacher_id != teacher.id:
        raise ApiException(403, "FORBIDDEN", "Anda tidak memiliki izin menghapus sesi guru lain.")

    # Soft delete session safely, preserving all historical student attendance
    session.is_deleted = True
    db.commit()
    return ok({"id": session_id, "deleted": True, "message": "Sesi presensi berhasil dihapus."})


# ============================================================
# TEACHER - PHOTO REVIEW (APPROVE / REJECT)
# ============================================================

class PhotoReviewPayload(BaseModel):
    status: str  # "approved" or "rejected"
    reason: Optional[str] = None


@router.post("/records/{record_id}/review-photo")
def review_attendance_photo(
    record_id: int,
    payload: PhotoReviewPayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher")),
):
    teacher = _get_teacher(user)
    record = db.query(AttendanceRecord).get(record_id)
    if not record:
        raise ApiException(404, "RECORD_NOT_FOUND", "Data presensi tidak ditemukan.")

    if not record.photo_path:
        raise ApiException(400, "NO_PHOTO_ATTACHED", "Presensi ini tidak memiliki lampiran foto bukti.")

    # Ownership check: Teacher can ONLY review attendance of sessions they teach!
    if record.session.teacher_id != teacher.id:
        raise ApiException(403, "FORBIDDEN", "Anda hanya dapat mereview foto pada sesi kelas Anda sendiri.")

    status_lower = payload.status.lower()
    if status_lower not in ("approved", "rejected"):
        raise ApiException(400, "INVALID_REVIEW_STATUS", "Status review harus 'approved' atau 'rejected'.")

    now = datetime.utcnow()
    if status_lower == "approved":
        record.photo_status = PhotoStatus.approved
        record.photo_reviewed_by = teacher.id
        record.photo_reviewed_at = now
        record.photo_rejection_reason = None
    else:
        record.photo_status = PhotoStatus.rejected
        record.photo_reviewed_by = teacher.id
        record.photo_reviewed_at = now
        record.photo_rejection_reason = (payload.reason or "Foto tidak memenuhi kriteria / wajah tidak terlihat jelas.").strip()

    db.commit()
    db.refresh(record)

    return ok(
        {
            "id": record.id,
            "photo_status": record.photo_status.value,
            "photo_reviewed_by": record.photo_reviewed_by,
            "photo_reviewed_at": record.photo_reviewed_at.isoformat() if record.photo_reviewed_at else None,
            "photo_rejection_reason": record.photo_rejection_reason,
        }
    )