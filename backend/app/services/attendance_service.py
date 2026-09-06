"""
Core attendance business rules: session status, late/present logic.
Kept separate from routers so API layer stays thin and testable.
"""
from datetime import datetime, timedelta, timezone

from app.models.models import AttendanceSession, AttendanceStatus

WIB = timezone(timedelta(hours=7))


def get_wib_now() -> datetime:
    """Returns current datetime in WIB (Asia/Jakarta, UTC+7) as naive datetime."""
    return datetime.now(WIB).replace(tzinfo=None)


def _parse_session_bounds(session: AttendanceSession):
    date_part = session.date  # "2026-09-05"
    start = datetime.strptime(f"{date_part} {session.start_time}", "%Y-%m-%d %H:%M")
    end = datetime.strptime(f"{date_part} {session.end_time}", "%Y-%m-%d %H:%M")
    return start, end


def get_session_status(session: AttendanceSession, now: datetime = None) -> str:
    now = now or get_wib_now()
    start, end = _parse_session_bounds(session)
    if now < start:
        return "not_started"
    if now > end:
        return "expired"
    return "active"


def compute_expires_at_ts(session: AttendanceSession) -> int:
    _, end = _parse_session_bounds(session)
    return int(end.timestamp())


def determine_attendance_status(session: AttendanceSession, now: datetime = None) -> AttendanceStatus:
    now = now or get_wib_now()
    start, _ = _parse_session_bounds(session)
    late_cutoff = start + timedelta(minutes=session.late_threshold_minutes)
    if now <= late_cutoff:
        return AttendanceStatus.present
    return AttendanceStatus.late
