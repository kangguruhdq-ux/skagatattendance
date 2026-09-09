from datetime import datetime
from datetime import datetime, timezone
from typing import Optional

def _format_utc_iso(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()

from fastapi import APIRouter, Depends, Form, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user, require_role
from app.database.db import get_db
from app.models.models import (
    AttendanceSession, AttendanceRecord, AttendanceStatus, PhotoStatus, Student, Teacher,
    Subject, SchoolClass, User,
)
from app.schemas.schemas import SessionCreate, ManualStatusUpdate
from app.services import qr_service, attendance_service, geo_service, photo_service, settings_service, webauthn_service as wa
from app.utils.response import ok, ApiException

router = APIRouter(prefix="/api/attendance", tags=["attendance"])
settings = get_settings()

MAX_SCANS_PER_MINUTE = 6  # basic in-memory rate limit per student for /scan
_scan_hits: dict = {}


def _rate_limit(student_id: int):
    now = datetime.now().timestamp()
    window = _scan_hits.setdefault(student_id, [])
    window[:] = [t for t in window if now - t < 60]
    if len(window) >= MAX_SCANS_PER_MINUTE:
        raise ApiException(429, "RATE_LIMITED", "Too many attempts. Please wait a moment.")
    window.append(now)


def _session_to_out(session: AttendanceSession, db: Session) -> dict:
    present_count = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.session_id == session.id)
        .filter(AttendanceRecord.status != AttendanceStatus.absent)
        .count()
    )
    total_students = (
        db.query(Student)
        .filter(Student.class_id == session.class_id, Student.is_active == True)  # noqa: E712
        .count()
    )
    return {
        "id": session.id,
        "subject_id": session.subject_id,
        "subject_name": session.subject.name if session.subject else None,
        "class_id": session.class_id,
        "class_name": session.school_class.name if session.school_class else None,
        "teacher_id": session.teacher_id,
        "date": session.date,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "late_threshold_minutes": session.late_threshold_minutes,
        "require_gps": session.require_gps,
        "require_photo": session.require_photo,
        "require_biometric": session.require_biometric,
        "status": attendance_service.get_session_status(session),
        "present_count": present_count,
        "total_students": total_students,
    }


@router.post("/session")
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher", "admin")),
):
    subject = db.query(Subject).get(payload.subject_id)
    school_class = db.query(SchoolClass).get(payload.class_id)
    if not subject or not school_class:
        raise ApiException(400, "INVALID_TARGET", "Invalid subject or class.")

    teacher = user.teacher_profile
    if not teacher:
        # admin creating on behalf of a subject's teacher isn't in scope here;
        # for demo purposes an admin must impersonate no one — require a teacher account
        raise ApiException(400, "TEACHER_REQUIRED", "Only a teacher account can create sessions.")

    if payload.start_time >= payload.end_time:
        raise ApiException(400, "INVALID_TIME_RANGE", "Start time must be before end time.")

    session = AttendanceSession(
        subject_id=payload.subject_id,
        class_id=payload.class_id,
        teacher_id=teacher.id,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        late_threshold_minutes=payload.late_threshold_minutes,
        require_gps=payload.require_gps,
        require_photo=payload.require_photo,
        require_biometric=payload.require_biometric,
        nonce=qr_service.generate_session_nonce(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return ok(_session_to_out(session, db))


@router.get("/session/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = db.query(AttendanceSession).get(session_id)
    if not session:
        raise ApiException(404, "NOT_FOUND", "Session not found.")
    return ok(_session_to_out(session, db))


@router.get("/session/{session_id}/qr")
def get_session_qr(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher", "admin")),
):
    session = db.query(AttendanceSession).get(session_id)
    if not session:
        raise ApiException(404, "NOT_FOUND", "Session not found.")
    if attendance_service.get_session_status(session) == "expired":
        raise ApiException(400, "SESSION_EXPIRED", "Attendance session has ended.")

    expires_ts = attendance_service.compute_expires_at_ts(session)
    token = qr_service.issue_qr_token(session.id, session.nonce, expires_ts)
    return ok({
        "session_id": session.id,
        "token": token,
        "expires_at": datetime.fromtimestamp(expires_ts).isoformat(),
    })


@router.get("/session/{session_id}/records")
def get_session_records(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher", "admin")),
):
    session = db.query(AttendanceSession).get(session_id)
    if not session:
        raise ApiException(404, "NOT_FOUND", "Session not found.")

    records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.session_id == session_id)
        .all()
    )
    out = []
    for r in records:
        photo_st = r.photo_status.value if r.photo_status else ("pending" if r.photo_path else "none")
        out.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": r.student.full_name if r.student else None,
            "session_id": r.session_id,
            "checked_in_at": r.checked_in_at.isoformat(),
            "checked_in_at": _format_utc_iso(r.checked_in_at),
            "status": r.status.value,
            "location_verified": r.location_verified,
            "distance_meters": r.distance_meters,
            "biometric_verified": r.biometric_verified,
            "has_photo": bool(r.photo_path),
            "photo_status": photo_st,
            "photo_reviewed_by": r.photo_reviewed_by,
            "photo_reviewed_at": r.photo_reviewed_at.isoformat() if r.photo_reviewed_at else None,
            "photo_reviewed_at": _format_utc_iso(r.photo_reviewed_at),
            "photo_rejection_reason": r.photo_rejection_reason,
        })
    return ok({"session": _session_to_out(session, db), "records": out})


@router.get("/records/{record_id}/photo")
def get_record_photo(record_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    record = db.query(AttendanceRecord).get(record_id)
    if not record or not record.photo_path:
        raise ApiException(404, "NOT_FOUND", "No photo found for this record.")

    # Access control: the student who owns the record, or the teacher/admin
    # who owns the session, may view the proof photo — nobody else.
    is_owner_student = user.student_profile and user.student_profile.id == record.student_id
    is_session_teacher = user.teacher_profile and user.teacher_profile.id == record.session.teacher_id
    is_admin = user.role.value == "admin"
    if not (is_owner_student or is_session_teacher or is_admin):
        raise ApiException(403, "FORBIDDEN", "You do not have permission to view this photo.")

    path = photo_service.resolve_photo_path(record.photo_path)
    return FileResponse(path)


@router.get("/scan-requirements")
def scan_requirements(
    token: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("student")),
):
    """Read-only preflight so the app only prompts for fingerprint/photo/GPS
    when the session actually requires it. Does not consume or validate
    anything beyond signature + existence — the real checks happen in /scan."""
    decoded = qr_service.verify_qr_token(token)
    if not decoded:
        raise ApiException(400, "INVALID_TOKEN", "This QR code is not valid.")
    session = db.query(AttendanceSession).get(decoded["session_id"])
    if not session or session.nonce != decoded["nonce"]:
        raise ApiException(400, "INVALID_TOKEN", "This QR code is not valid.")
    return ok({
        "require_gps": session.require_gps,
        "require_photo": session.require_photo,
        "require_biometric": session.require_biometric,
        "status": attendance_service.get_session_status(session),
        "subject_name": session.subject.name if session.subject else None,
    })


async def _process_attendance(
    db: Session,
    student: Student,
    session: AttendanceSession,
    latitude: Optional[float],
    longitude: Optional[float],
    biometric_token: Optional[str],
    photo: Optional[UploadFile],
    force_photo_required: bool = False,
) -> dict:
    # Server-side, live re-check of session timing — source of truth
    status = attendance_service.get_session_status(session)
    if status == "not_started":
        raise ApiException(400, "SESSION_NOT_STARTED", "Attendance session has not started yet.")
    if status == "expired":
        raise ApiException(400, "SESSION_EXPIRED", "Attendance session has ended.")

    if student.class_id != session.class_id:
        raise ApiException(403, "WRONG_CLASS", "This session is not for your class.")

    existing = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.student_id == student.id, AttendanceRecord.session_id == session.id)
        .first()
    )
    if existing:
        raise ApiException(409, "ALREADY_RECORDED", "Attendance already recorded.")

    # ---- Fingerprint / Face ID verification (WebAuthn) ----
    biometric_verified = False
    if session.require_biometric:
        if not biometric_token:
            raise ApiException(400, "BIOMETRIC_REQUIRED", "Fingerprint/Face ID verification is required for this session.")
        if not wa.consume_biometric_proof_token(biometric_token, student.id):
            raise ApiException(401, "BIOMETRIC_VERIFICATION_FAILED", "Fingerprint/Face ID verification failed or expired. Please try again.")
        biometric_verified = True

    # ---- GPS validation ----
    location_verified = None
    distance = None
    if session.require_gps:
        if latitude is None or longitude is None:
            raise ApiException(400, "LOCATION_REQUIRED", "Izin lokasi GPS diperlukan untuk sesi ini.")
        school_loc = settings_service.get_school_location(db)
        within, distance = geo_service.is_within_radius(
            latitude, longitude,
            school_loc["latitude"], school_loc["longitude"],
            school_loc["radius_meters"],
        )
        if school_loc["enabled"]:
            location_verified = within
            if not within:
                raise ApiException(
                    403,
                    "OUTSIDE_AREA",
                    f"Posisi Anda di luar batas toleransi ({int(distance)}m dari {school_loc['school_name']}). Batas maksimal {int(school_loc['radius_meters'])}m.",
                )
        else:
            # Geofence validation disabled in system settings
            location_verified = True

    # ---- Photo proof ----
    photo_filename = None
    if session.require_photo or force_photo_required:
        if not photo:
            raise ApiException(400, "PHOTO_REQUIRED", "A photo is required to record attendance for this session.")
        photo_filename = await photo_service.save_attendance_photo(photo, session.id, student.id)
    elif photo:
        # Photo is optional for this session but provided — keep it.
        photo_filename = await photo_service.save_attendance_photo(photo, session.id, student.id)

    determined_status = attendance_service.determine_attendance_status(session)
    photo_status = PhotoStatus.pending if photo_filename else PhotoStatus.none

    record = AttendanceRecord(
        student_id=student.id,
        session_id=session.id,
        status=determined_status,
        latitude=latitude,
        longitude=longitude,
        distance_meters=distance,
        location_verified=location_verified,
        biometric_verified=biometric_verified,
        photo_path=photo_filename,
        photo_status=photo_status,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "student_name": student.full_name,
        "subject_name": session.subject.name if session.subject else None,
        "class_name": session.school_class.name if session.school_class else None,
        "checked_in_at": record.checked_in_at.isoformat(),
        "checked_in_at": _format_utc_iso(record.checked_in_at),
        "status": record.status.value,
        "location_verified": record.location_verified,
        "distance_meters": record.distance_meters,
        "biometric_verified": record.biometric_verified,
        "has_photo": bool(record.photo_path),
        "photo_status": record.photo_status.value if record.photo_status else "none",
    }


@router.post("/scan")
async def scan_attendance(
    token: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    biometric_token: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("student")),
):
    student = user.student_profile
    if not student:
        raise ApiException(400, "STUDENT_PROFILE_MISSING", "No student profile linked to this account.")

    _rate_limit(student.id)

    decoded = qr_service.verify_qr_token(token)
    if not decoded:
        raise ApiException(400, "INVALID_TOKEN", "This QR code is not valid.")

    session = db.query(AttendanceSession).get(decoded["session_id"])
    if not session or session.nonce != decoded["nonce"]:
        raise ApiException(400, "INVALID_TOKEN", "This QR code is not valid.")

    result = await _process_attendance(
        db=db,
        student=student,
        session=session,
        latitude=latitude,
        longitude=longitude,
        biometric_token=biometric_token,
        photo=photo,
        force_photo_required=False,
    )
    return ok(result)


@router.post("/photo-checkin")
async def photo_checkin(
    session_id: int = Form(...),
    photo: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    biometric_token: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("student")),
):
    student = user.student_profile
    if not student:
        raise ApiException(400, "STUDENT_PROFILE_MISSING", "No student profile linked to this account.")

    _rate_limit(student.id)

    session = db.query(AttendanceSession).get(session_id)
    if not session:
        raise ApiException(404, "SESSION_NOT_FOUND", "Attendance session not found.")

    result = await _process_attendance(
        db=db,
        student=student,
        session=session,
        latitude=latitude,
        longitude=longitude,
        biometric_token=biometric_token,
        photo=photo,
        force_photo_required=True,
    )
    return ok(result)


@router.put("/records/{record_id}/status")
def update_record_status(
    record_id: int,
    payload: ManualStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("teacher", "admin")),
):
    record = db.query(AttendanceRecord).get(record_id)
    if not record:
        raise ApiException(404, "NOT_FOUND", "Record not found.")

    if user.role.value == "teacher":
        if not user.teacher_profile or record.session.teacher_id != user.teacher_profile.id:
            raise ApiException(403, "FORBIDDEN", "Anda hanya dapat mengubah presensi pada sesi Anda sendiri.")
    try:
        new_status = AttendanceStatus(payload.status)
    except ValueError:
        raise ApiException(400, "INVALID_STATUS", "Invalid attendance status.")

    record.status = new_status
    record.manual_override = True
    record.override_reason = payload.reason
    db.commit()
    return ok({"id": record.id, "status": record.status.value})
