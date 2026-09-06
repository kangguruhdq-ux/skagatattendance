from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ---------- Generic envelope ----------
class ApiError(BaseModel):
    code: str
    message: str


class ApiResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[ApiError] = None


# ---------- Auth ----------
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str


class MeResponse(BaseModel):
    id: int
    username: str
    role: str
    full_name: str


# ---------- Class / Subject / Schedule ----------
class ClassCreate(BaseModel):
    name: str
    major: Optional[str] = None
    grade: Optional[str] = None
    academic_year: Optional[str] = None


class ClassOut(ClassCreate):
    id: int
    student_count: Optional[int] = 0

    class Config:
        from_attributes = True


class SubjectCreate(BaseModel):
    name: str
    code: Optional[str] = None


class SubjectOut(SubjectCreate):
    id: int

    class Config:
        from_attributes = True


class ScheduleCreate(BaseModel):
    class_id: int
    subject_id: int
    teacher_id: int
    day_of_week: int = Field(ge=0, le=6)
    start_time: str
    end_time: str
    room: Optional[str] = None


class ScheduleOut(ScheduleCreate):
    id: int
    subject_name: Optional[str] = None
    class_name: Optional[str] = None
    teacher_name: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- Student ----------
class StudentCreate(BaseModel):
    username: str
    password: str
    student_code: str
    full_name: str
    class_id: Optional[int] = None


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    class_id: Optional[int] = None
    is_active: Optional[bool] = None


class StudentOut(BaseModel):
    id: int
    student_code: str
    full_name: str
    class_id: Optional[int]
    class_name: Optional[str] = None
    is_active: bool
    username: str

    class Config:
        from_attributes = True


# ---------- Teacher ----------
class TeacherCreate(BaseModel):
    username: str
    password: str
    teacher_code: str
    full_name: str
    subject_specialty: Optional[str] = None


class TeacherOut(BaseModel):
    id: int
    teacher_code: str
    full_name: str
    subject_specialty: Optional[str]
    is_active: bool
    username: str

    class Config:
        from_attributes = True


# ---------- Attendance Session ----------
class SessionCreate(BaseModel):
    subject_id: int
    class_id: int
    date: str          # "2026-09-05"
    start_time: str    # "07:00"
    end_time: str      # "09:00"
    late_threshold_minutes: int = 10
    require_gps: bool = False
    require_photo: bool = False
    require_biometric: bool = False


class SessionOut(BaseModel):
    id: int
    subject_id: int
    subject_name: Optional[str] = None
    class_id: int
    class_name: Optional[str] = None
    teacher_id: int
    date: str
    start_time: str
    end_time: str
    late_threshold_minutes: int
    require_gps: bool
    require_photo: bool
    require_biometric: bool
    status: str  # not_started / active / expired
    present_count: int = 0
    total_students: int = 0

    class Config:
        from_attributes = True


class SessionQrOut(BaseModel):
    session_id: int
    token: str
    expires_at: datetime


# ---------- Attendance scan / record ----------
# Note: POST /api/attendance/scan is multipart/form-data (not JSON) because it
# may include a photo file — see the `scan_attendance` route for its actual
# parameters (token, latitude, longitude, biometric_token, photo).


class AttendanceRecordOut(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    session_id: int
    checked_in_at: datetime
    status: str
    location_verified: Optional[bool] = None
    distance_meters: Optional[float] = None
    biometric_verified: bool = False
    has_photo: bool = False

    class Config:
        from_attributes = True


class ManualStatusUpdate(BaseModel):
    status: str
    reason: str


# ---------- Dashboard / stats ----------
class StudentDashboard(BaseModel):
    full_name: str
    today_status: Optional[str] = None
    attendance_rate: float
    present: int
    late: int
    absent: int
    excused: int
    sick: int
    today_schedule: List[dict] = []


class TeacherDashboard(BaseModel):
    full_name: str
    today_sessions: int
    active_sessions: int
    total_students_taught: int
    attendance_rate_today: float
    recent_sessions: List[dict] = []


class AdminDashboard(BaseModel):
    total_students: int
    total_teachers: int
    total_classes: int
    today_attendance_rate: float
    weekly_attendance: List[dict] = []
    attendance_by_class: List[dict] = []
