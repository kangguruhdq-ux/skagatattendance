"""
SQLAlchemy ORM models for SKAGATA ATTENDANCE.

Relationships:
  User (auth) --1:1--> Student / Teacher (profile)
  SchoolClass --1:N--> Student
  Teacher --1:N--> AttendanceSession
  SchoolClass --1:N--> AttendanceSession
  AttendanceSession --1:N--> AttendanceRecord
  Student --1:N--> AttendanceRecord

Unique constraint (student_id, session_id) on AttendanceRecord
prevents duplicate check-ins for the same session.
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey,
    Enum, UniqueConstraint, Text,
)
from sqlalchemy.orm import relationship

from app.database.db import Base


class RoleEnum(str, enum.Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    late = "late"
    absent = "absent"
    excused = "excused"
    sick = "sick"


class SessionStatusHint(str, enum.Enum):
    not_started = "not_started"
    active = "active"
    expired = "expired"


class PhotoStatus(str, enum.Enum):
    none = "none"
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    email = Column(String(128), nullable=True)
    avatar_path = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student_profile = relationship("Student", back_populates="user", uselist=False)
    teacher_profile = relationship("Teacher", back_populates="user", uselist=False)


class SchoolClass(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), nullable=False)          # e.g. "XI TKJ 1"
    major = Column(String(64), nullable=True)           # e.g. "TKJ"
    grade = Column(String(16), nullable=True)           # e.g. "XI"
    academic_year = Column(String(16), nullable=True)   # e.g. "2025/2026"

    students = relationship("Student", back_populates="school_class")
    schedules = relationship("Schedule", back_populates="school_class")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    student_code = Column(String(32), unique=True, nullable=False)  # NIS (dummy)
    full_name = Column(String(128), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="student_profile")
    school_class = relationship("SchoolClass", back_populates="students")
    attendance_records = relationship("AttendanceRecord", back_populates="student")


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    teacher_code = Column(String(32), unique=True, nullable=False)  # NIP (dummy)
    full_name = Column(String(128), nullable=False)
    subject_specialty = Column(String(128), nullable=True)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="teacher_profile")
    sessions = relationship("AttendanceSession", back_populates="teacher")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    code = Column(String(32), nullable=True)
    is_active = Column(Boolean, default=True, nullable=True)

    schedules = relationship("Schedule", back_populates="subject")


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday ... 6=Sunday
    start_time = Column(String(5), nullable=False)  # "07:00"
    end_time = Column(String(5), nullable=False)    # "08:30"
    room = Column(String(32), nullable=True)
    is_active = Column(Boolean, default=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    school_class = relationship("SchoolClass", back_populates="schedules")
    subject = relationship("Subject", back_populates="schedules")
    teacher = relationship("Teacher")


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)

    date = Column(String(10), nullable=False)   # "2026-09-05"
    start_time = Column(String(5), nullable=False)
    end_time = Column(String(5), nullable=False)
    late_threshold_minutes = Column(Integer, default=10)

    require_gps = Column(Boolean, default=False)
    require_photo = Column(Boolean, default=False)
    require_biometric = Column(Boolean, default=False)

    # Random, unguessable identifier embedded in the signed QR token.
    # The token itself (session_id + nonce + exp, HMAC-signed) is generated
    # on demand by qr_service and is never persisted in plaintext form here
    # beyond this nonce, so a leaked QR image cannot be replayed after expiry
    # and cannot be reconstructed without the server secret.
    nonce = Column(String(64), nullable=False)

    room = Column(String(32), nullable=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject")
    school_class = relationship("SchoolClass")
    teacher = relationship("Teacher", back_populates="sessions")
    records = relationship("AttendanceRecord", back_populates="session")
    schedule = relationship("Schedule")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("student_id", "session_id", name="uq_student_session"),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id"), nullable=False)

    checked_in_at = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.present)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    distance_meters = Column(Float, nullable=True)
    location_verified = Column(Boolean, nullable=True)

    manual_override = Column(Boolean, default=False)
    override_reason = Column(Text, nullable=True)

    # Photo proof: a selfie/photo taken at the moment of check-in, stored on
    # disk (never in the DB itself). Path is relative to UPLOAD_DIR's parent.
    photo_path = Column(String(255), nullable=True)
    photo_status = Column(Enum(PhotoStatus), default=PhotoStatus.none, nullable=True)
    photo_reviewed_by = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    photo_reviewed_at = Column(DateTime, nullable=True)
    photo_rejection_reason = Column(Text, nullable=True)

    # Whether a WebAuthn (fingerprint/Face ID) biometric check passed for
    # this specific check-in (see BiometricCredential below).
    biometric_verified = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False, nullable=True)

    student = relationship("Student", back_populates="attendance_records")
    session = relationship("AttendanceSession", back_populates="records")
    photo_reviewer = relationship("Teacher", foreign_keys=[photo_reviewed_by])


class BiometricCredential(Base):
    """
    A WebAuthn public-key credential enrolled by a student's device
    (fingerprint / Face ID / device PIN as platform authenticator).

    We never store the fingerprint itself — only the public key of a
    credential whose private key stays inside the device's secure hardware.
    Verifying a signature made with that private key proves the same
    enrolled person/device performed the check-in.
    """
    __tablename__ = "biometric_credentials"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)

    credential_id = Column(String(512), unique=True, nullable=False)  # base64url
    public_key_cose = Column(Text, nullable=False)  # base64-encoded COSE key CBOR
    sign_count = Column(Integer, default=0)
    device_label = Column(String(128), nullable=True)  # e.g. "Andi's phone"
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student")


# =========================================================================
# SYSTEM SETTINGS & GEOFENCE CONFIGURATION
# =========================================================================

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(64), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    updater = relationship("User", foreign_keys=[updated_by])


# =========================================================================
# SUPPORT TICKET / REPORT SYSTEM
# =========================================================================

class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    WAITING_FOR_USER = "WAITING_FOR_USER"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class TicketPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(32), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject = Column(String(255), nullable=False)
    category = Column(String(64), nullable=False)  # Presensi, GPS, Kamera, Foto, Akun, Jadwal, Sistem, Bug, Lainnya
    priority = Column(Enum(TicketPriority), default=TicketPriority.MEDIUM, nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN, nullable=False)
    attachment_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    deleter = relationship("User", foreign_keys=[deleted_by])
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketMessage.created_at")


class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    attachment_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    ticket = relationship("SupportTicket", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    deleter = relationship("User", foreign_keys=[deleted_by])


# =========================================================================
# ATTENDANCE CORRECTION REQUESTS
# =========================================================================

class CorrectionStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AttendanceCorrection(Base):
    __tablename__ = "attendance_corrections"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id"), nullable=True)
    date = Column(String(10), nullable=False)  # "2026-09-09"
    target_status = Column(Enum(AttendanceStatus), nullable=False)
    reason = Column(String(128), nullable=False)
    explanation = Column(Text, nullable=False)
    attachment_path = Column(String(255), nullable=True)
    status = Column(Enum(CorrectionStatus), default=CorrectionStatus.PENDING, nullable=False)

    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student")
    session = relationship("AttendanceSession")
    reviewer = relationship("User", foreign_keys=[reviewed_by])


# =========================================================================
# ANNOUNCEMENTS
# =========================================================================

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(64), default="Info", nullable=False)
    target_role = Column(String(32), default="ALL", nullable=False)  # ALL, STUDENT, TEACHER, ADMIN
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    published_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    author = relationship("User", foreign_keys=[created_by])


# =========================================================================
# NOTIFICATIONS
# =========================================================================

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(32), default="info")  # info, success, warning, ticket, correction, attendance
    link = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])


# =========================================================================
# ACTIVITY / AUDIT LOGS
# =========================================================================

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(64), nullable=False)
    description = Column(Text, nullable=False)
    ip_address = Column(String(64), nullable=True)
    details = Column(Text, nullable=True)  # JSON or text summary
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])

