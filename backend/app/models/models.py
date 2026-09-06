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


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
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

    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject")
    school_class = relationship("SchoolClass")
    teacher = relationship("Teacher", back_populates="sessions")
    records = relationship("AttendanceRecord", back_populates="session")


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

    # Whether a WebAuthn (fingerprint/Face ID) biometric check passed for
    # this specific check-in (see BiometricCredential below).
    biometric_verified = Column(Boolean, default=False)

    student = relationship("Student", back_populates="attendance_records")
    session = relationship("AttendanceSession", back_populates="records")


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
