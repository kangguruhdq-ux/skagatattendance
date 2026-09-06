from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.database.db import get_db
from app.models.models import (
    AttendanceSession,
    AttendanceRecord,
    AttendanceStatus,
    Student,
    User,
    SchoolClass,
    Subject,
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

    return ok(
        {
            "full_name": teacher.full_name,
            "today_sessions": len(sessions_today),
            "active_sessions": active_count,
            "total_students_taught": total_students_taught,
            "attendance_rate_today": attendance_rate_today,
            "recent_sessions": recent_sessions,
        }
    )


@router.get("/sessions")
def my_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher")),
):
    teacher = _get_teacher(user)

    sessions = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.teacher_id == teacher.id)
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