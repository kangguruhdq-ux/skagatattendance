from datetime import date, datetime
from datetime import date, datetime, timedelta, timezone
from typing import Optional

def _format_utc_iso(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()

from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.database.db import get_db
from app.models.models import (
    AttendanceRecord, AttendanceSession, AttendanceStatus, PhotoStatus, Schedule, User,
)
from app.services import attendance_service, photo_service
from app.utils.response import ok, ApiException

router = APIRouter(prefix="/api/student", tags=["student"])

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _get_student(user: User):
    if not user.student_profile:
        raise ApiException(400, "STUDENT_PROFILE_MISSING", "No student profile linked to this account.")
    return user.student_profile


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(require_role("student"))):
    student = _get_student(user)
    records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.student_id == student.id, AttendanceRecord.is_deleted != True)
        .all()
    )

    total = len(records) or 1
    counts = {s: 0 for s in AttendanceStatus}
    for r in records:
        counts[r.status] += 1

    present_like = counts[AttendanceStatus.present] + counts[AttendanceStatus.late]
    attendance_rate = round((present_like / total) * 100, 1) if records else 0.0

    today_str = date.today().isoformat()
    today_record = next((r for r in records if r.checked_in_at.date().isoformat() == today_str), None)

    today_weekday = date.today().weekday()
    schedules = (
        db.query(Schedule)
        .filter(Schedule.class_id == student.class_id, Schedule.day_of_week == today_weekday)
        .order_by(Schedule.start_time)
        .all()
    )
    today_schedule = [
        {
            "subject": s.subject.name if s.subject else "",
            "start_time": s.start_time,
            "end_time": s.end_time,
            "room": s.room,
        }
        for s in schedules
    ]

    # Active sessions for student's class today
    today_sessions = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.class_id == student.class_id, AttendanceSession.date == today_str)
        .filter(
            AttendanceSession.class_id == student.class_id,
            AttendanceSession.date == today_str,
            AttendanceSession.is_deleted != True,
        )
        .all()
    )
    active_sessions_count = sum(
        1 for s in today_sessions if attendance_service.get_session_status(s) == "active"
    )

    return ok({
        "full_name": student.full_name,
        "student_code": student.student_code,
        "class_id": student.class_id,
        "class_name": student.school_class.name if student.school_class else None,
        "today_status": today_record.status.value if today_record else None,
        "attendance_rate": attendance_rate,
        "present": counts[AttendanceStatus.present],
        "late": counts[AttendanceStatus.late],
        "absent": counts[AttendanceStatus.absent],
        "excused": counts[AttendanceStatus.excused],
        "sick": counts[AttendanceStatus.sick],
        "active_sessions_count": active_sessions_count,
        "today_schedule": today_schedule,
    })


@router.get("/active-sessions")
def active_sessions(db: Session = Depends(get_db), user: User = Depends(require_role("student"))):
    student = _get_student(user)
    today_str = date.today().isoformat()

    sessions = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.class_id == student.class_id,
            AttendanceSession.date == today_str,
            AttendanceSession.is_deleted != True,
        )
        .order_by(AttendanceSession.start_time)
        .all()
    )

    out = []
    for s in sessions:
        st = attendance_service.get_session_status(s)
        existing = (
            db.query(AttendanceRecord)
            .filter(AttendanceRecord.student_id == student.id, AttendanceRecord.session_id == s.id)
            .first()
        )
        out.append({
            "id": s.id,
            "subject_name": s.subject.name if s.subject else None,
            "class_name": s.school_class.name if s.school_class else None,
            "teacher_name": s.teacher.full_name if s.teacher else None,
            "date": s.date,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "late_threshold_minutes": s.late_threshold_minutes,
            "require_gps": s.require_gps,
            "require_photo": s.require_photo,
            "require_biometric": s.require_biometric,
            "status": st,
            "has_checked_in": existing is not None,
            "checked_in_at": existing.checked_in_at.isoformat() if existing else None,
            "checked_in_at": _format_utc_iso(existing.checked_in_at) if existing else None,
            "checked_in_status": existing.status.value if existing else None,
        })

    return ok({"sessions": out})


@router.get("/schedule")
def schedule(db: Session = Depends(get_db), user: User = Depends(require_role("student"))):
    student = _get_student(user)
    schedules = (
        db.query(Schedule)
        .filter(Schedule.class_id == student.class_id)
        .order_by(Schedule.day_of_week, Schedule.start_time)
        .all()
    )
    return ok({
        "schedule": [
            {
                "day_of_week": s.day_of_week,
                "day_name": WEEKDAYS[s.day_of_week],
                "subject": s.subject.name if s.subject else "",
                "start_time": s.start_time,
                "end_time": s.end_time,
                "room": s.room,
                "teacher": s.teacher.full_name if s.teacher else "",
            }
            for s in schedules
        ]
    })


@router.get("/attendance")
def attendance_history(db: Session = Depends(get_db), user: User = Depends(require_role("student"))):
    student = _get_student(user)
    records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.student_id == student.id, AttendanceRecord.is_deleted != True)
        .order_by(AttendanceRecord.checked_in_at.desc())
        .all()
    )
    out = []
    for r in records:
        session_status = attendance_service.get_session_status(r.session) if r.session else "expired"
        can_retake = bool(
            r.photo_status == PhotoStatus.rejected and
            session_status == "active"
        )
        photo_st = r.photo_status.value if r.photo_status else ("pending" if r.photo_path else "none")
        out.append({
            "id": r.id,
            "session_id": r.session_id,
            "date": r.checked_in_at.date().isoformat(),
            "subject": r.session.subject.name if r.session and r.session.subject else "",
            "class_name": r.session.school_class.name if r.session and r.session.school_class else "",
            "check_in_time": r.checked_in_at.strftime("%H:%M"),
            "check_in_time": (r.checked_in_at + timedelta(hours=7)).strftime("%H:%M") if r.checked_in_at else "-",
            "status": r.status.value,
            "has_photo": bool(r.photo_path),
            "photo_status": photo_st,
            "photo_rejection_reason": r.photo_rejection_reason,
            "can_retake_photo": can_retake,
        })
    return ok({"records": out})


@router.delete("/records/{record_id}")
def delete_attendance_record(
    record_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("student")),
):
    student = _get_student(user)
    record = db.query(AttendanceRecord).get(record_id)
    if not record:
        raise ApiException(404, "RECORD_NOT_FOUND", "Data presensi tidak ditemukan.")
    if record.student_id != student.id:
        raise ApiException(403, "FORBIDDEN", "Anda tidak memiliki izin menghapus presensi siswa lain.")

    record.is_deleted = True
    db.commit()
    return ok({"id": record.id, "deleted": True})


# ============================================================
# STUDENT - RETAKE PHOTO (WHEN REJECTED BY TEACHER)
# ============================================================

@router.post("/records/{record_id}/retake-photo")
async def retake_attendance_photo(
    record_id: int,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("student")),
):
    student = _get_student(user)
    record = db.query(AttendanceRecord).get(record_id)
    if not record:
        raise ApiException(404, "RECORD_NOT_FOUND", "Data presensi tidak ditemukan.")

    # Ownership check
    if record.student_id != student.id:
        raise ApiException(403, "FORBIDDEN", "Anda tidak memiliki akses ke presensi ini.")

    # Check if photo was rejected
    if record.photo_status != PhotoStatus.rejected:
        raise ApiException(
            400,
            "NOT_REJECTED",
            "Pengambilan foto ulang hanya diizinkan jika foto bukti sebelumnya ditolak oleh guru.",
        )

    # Save new photo
    new_filename = await photo_service.save_attendance_photo(photo, record.session_id, student.id)
    record.photo_path = new_filename
    record.photo_status = PhotoStatus.pending
    record.photo_rejection_reason = None
    db.commit()
    db.refresh(record)

    return ok({
        "id": record.id,
        "photo_status": record.photo_status.value,
        "has_photo": True,
    })


# ============================================================
# STUDENT - PROFILE
# ============================================================

class StudentProfileUpdate(BaseModel):
    full_name: Optional[str] = None


@router.get("/profile")
def get_student_profile(
    user: User = Depends(require_role("student")),
):
    student = _get_student(user)
    return ok({
        "id": student.id,
        "username": user.username,
        "student_code": student.student_code,
        "full_name": student.full_name,
        "class_id": student.class_id,
        "class_name": student.school_class.name if student.school_class else None,
        "major": student.school_class.major if student.school_class else None,
        "grade": student.school_class.grade if student.school_class else None,
        "role": user.role.value,
    })


@router.put("/profile")
def update_student_profile(
    payload: StudentProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("student")),
):
    student = _get_student(user)
    if payload.full_name is not None and payload.full_name.strip():
        student.full_name = payload.full_name.strip()
    db.commit()
    db.refresh(student)
    return ok({
        "id": student.id,
        "student_code": student.student_code,
        "full_name": student.full_name,
    })
