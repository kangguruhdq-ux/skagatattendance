from datetime import date, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.database.db import get_db
from app.models.models import (
    AttendanceRecord, AttendanceSession, AttendanceStatus, Schedule, User,
)
from app.services import attendance_service
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
    records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).all()

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
        .filter(AttendanceSession.class_id == student.class_id, AttendanceSession.date == today_str)
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
        .filter(AttendanceRecord.student_id == student.id)
        .order_by(AttendanceRecord.checked_in_at.desc())
        .all()
    )
    return ok({
        "records": [
            {
                "id": r.id,
                "date": r.checked_in_at.date().isoformat(),
                "subject": r.session.subject.name if r.session and r.session.subject else "",
                "class_name": r.session.school_class.name if r.session and r.session.school_class else "",
                "check_in_time": r.checked_in_at.strftime("%H:%M"),
                "status": r.status.value,
            }
            for r in records
        ]
    })
