import csv
import io
from datetime import date, timedelta
import secrets
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.core.security import hash_password
from app.database.db import get_db
from app.models.models import (
    Student, Teacher, SchoolClass, Subject, Schedule, User, RoleEnum,
    AttendanceRecord, AttendanceSession, AttendanceStatus, PhotoStatus,
)
from app.schemas.schemas import (
    StudentCreate, StudentUpdate, TeacherCreate, TeacherUpdate, ClassCreate, SubjectCreate, ScheduleCreate, ScheduleUpdate,
    AdminSessionCreate, AdminSessionUpdate, AttendanceRecordCorrection,
)
from app.services import attendance_service
from app.utils.response import ok, ApiException

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---------------- Dashboard ----------------
@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    total_students = db.query(Student).filter(Student.is_active == True).count()  # noqa: E712
    total_teachers = db.query(Teacher).filter(Teacher.is_active == True).count()  # noqa: E712
    total_classes = db.query(SchoolClass).count()

    today_str = date.today().isoformat()
    today_sessions = db.query(AttendanceSession).filter(AttendanceSession.date == today_str).all()
    total_records = 0
    present_like = 0
    for s in today_sessions:
        recs = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id).all()
        total_records += len(recs)
        present_like += sum(1 for r in recs if r.status in (AttendanceStatus.present, AttendanceStatus.late))
    today_rate = round((present_like / total_records) * 100, 1) if total_records else 0.0

    weekly = []
    for i in range(6, -1, -1):
        d = (date.today() - timedelta(days=i)).isoformat()
        sessions = db.query(AttendanceSession).filter(AttendanceSession.date == d).all()
        recs_total, recs_present = 0, 0
        for s in sessions:
            recs = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id).all()
            recs_total += len(recs)
            recs_present += sum(1 for r in recs if r.status in (AttendanceStatus.present, AttendanceStatus.late))
        weekly.append({
            "date": d,
            "rate": round((recs_present / recs_total) * 100, 1) if recs_total else 0.0,
        })

    by_class = []
    for c in db.query(SchoolClass).all():
        sessions = db.query(AttendanceSession).filter(AttendanceSession.class_id == c.id).all()
        recs_total, recs_present = 0, 0
        for s in sessions:
            recs = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id).all()
            recs_total += len(recs)
            recs_present += sum(1 for r in recs if r.status in (AttendanceStatus.present, AttendanceStatus.late))
        by_class.append({
            "class_name": c.name,
            "rate": round((recs_present / recs_total) * 100, 1) if recs_total else 0.0,
        })

    return ok({
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "today_attendance_rate": today_rate,
        "weekly_attendance": weekly,
        "attendance_by_class": by_class,
    })


# ---------------- Users (Complete Role-Based Management) ----------------

class UserCreatePayload(BaseModel):
    username: str
    password: str
    role: str  # "admin" | "teacher" | "student"
    full_name: str
    student_code: Optional[str] = None
    class_id: Optional[int] = None
    teacher_code: Optional[str] = None
    subject_specialty: Optional[str] = None


class UserUpdatePayload(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    class_id: Optional[int] = None
    student_code: Optional[str] = None
    teacher_code: Optional[str] = None
    subject_specialty: Optional[str] = None


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
    role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
):
    q = db.query(User)
    if role:
        try:
            q = q.filter(User.role == RoleEnum(role))
        except ValueError:
            pass
    if is_active is not None:
        q = q.filter(User.is_active == is_active)
    if search:
        s = f"%{search.strip()}%"
        q = q.filter(
            (User.username.ilike(s)) |
            (User.student_profile.has(Student.full_name.ilike(s))) |
            (User.teacher_profile.has(Teacher.full_name.ilike(s)))
        )

    users = q.order_by(User.id.desc()).all()
    out = []
    for u in users:
        full_name = u.username
        code = None
        class_id = None
        class_name = None
        specialty = None

        if u.role == RoleEnum.student and u.student_profile:
            full_name = u.student_profile.full_name
            code = u.student_profile.student_code
            class_id = u.student_profile.class_id
            class_name = u.student_profile.school_class.name if u.student_profile.school_class else None
        elif u.role == RoleEnum.teacher and u.teacher_profile:
            full_name = u.teacher_profile.full_name
            code = u.teacher_profile.teacher_code
            specialty = u.teacher_profile.subject_specialty

        out.append({
            "id": u.id,
            "username": u.username,
            "role": u.role.value,
            "is_active": u.is_active,
            "full_name": full_name,
            "code": code,
            "class_id": class_id,
            "class_name": class_name,
            "subject_specialty": specialty,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return ok({"users": out})


@router.post("/users")
def create_user(
    payload: UserCreatePayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    if db.query(User).filter(User.username == payload.username.strip()).first():
        raise ApiException(400, "USERNAME_TAKEN", "Username sudah digunakan.")

    try:
        target_role = RoleEnum(payload.role.lower())
    except ValueError:
        raise ApiException(400, "INVALID_ROLE", "Role tidak valid. Pilih admin, teacher, atau student.")

    new_user = User(
        username=payload.username.strip(),
        hashed_password=hash_password(payload.password),
        role=target_role,
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    if target_role == RoleEnum.student:
        code = (payload.student_code or f"NIS-{new_user.id:04d}").strip()
        if db.query(Student).filter(Student.student_code == code).first():
            raise ApiException(400, "STUDENT_CODE_TAKEN", "NIS / Kode siswa sudah digunakan.")
        student = Student(
            user_id=new_user.id,
            student_code=code,
            full_name=payload.full_name.strip(),
            class_id=payload.class_id,
        )
        db.add(student)
    elif target_role == RoleEnum.teacher:
        code = (payload.teacher_code or f"NIP-{new_user.id:04d}").strip()
        if db.query(Teacher).filter(Teacher.teacher_code == code).first():
            raise ApiException(400, "TEACHER_CODE_TAKEN", "NIP / Kode guru sudah digunakan.")
        teacher = Teacher(
            user_id=new_user.id,
            teacher_code=code,
            full_name=payload.full_name.strip(),
            subject_specialty=(payload.subject_specialty or "").strip(),
        )
        db.add(teacher)

    db.commit()
    db.refresh(new_user)
    return ok({"id": new_user.id, "username": new_user.username, "role": new_user.role.value})


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdatePayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    target_user = db.query(User).get(user_id)
    if not target_user:
        raise ApiException(404, "USER_NOT_FOUND", "Pengguna tidak ditemukan.")

    if payload.role is not None:
        try:
            target_user.role = RoleEnum(payload.role.lower())
        except ValueError:
            raise ApiException(400, "INVALID_ROLE", "Role tidak valid.")

    if payload.is_active is not None:
        if target_user.id == user.id and not payload.is_active:
            raise ApiException(400, "CANNOT_DEACTIVATE_SELF", "Anda tidak dapat menonaktifkan akun sendiri.")
        target_user.is_active = payload.is_active
        if target_user.student_profile:
            target_user.student_profile.is_active = payload.is_active
        if target_user.teacher_profile:
            target_user.teacher_profile.is_active = payload.is_active

    if payload.password and payload.password.strip():
        target_user.hashed_password = hash_password(payload.password.strip())

    if target_user.student_profile:
        if payload.full_name is not None and payload.full_name.strip():
            target_user.student_profile.full_name = payload.full_name.strip()
        if payload.class_id is not None:
            target_user.student_profile.class_id = payload.class_id
        if payload.student_code is not None and payload.student_code.strip():
            target_user.student_profile.student_code = payload.student_code.strip()
    elif target_user.teacher_profile:
        if payload.full_name is not None and payload.full_name.strip():
            target_user.teacher_profile.full_name = payload.full_name.strip()
        if payload.teacher_code is not None and payload.teacher_code.strip():
            target_user.teacher_profile.teacher_code = payload.teacher_code.strip()
        if payload.subject_specialty is not None:
            target_user.teacher_profile.subject_specialty = payload.subject_specialty.strip()

    db.commit()
    return ok({"id": target_user.id, "updated": True})


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    target_user = db.query(User).get(user_id)
    if not target_user:
        raise ApiException(404, "USER_NOT_FOUND", "Pengguna tidak ditemukan.")

    if target_user.id == user.id:
        raise ApiException(400, "CANNOT_DELETE_SELF", "Anda tidak dapat menghapus akun Anda sendiri.")

    target_user.is_active = False
    if target_user.student_profile:
        target_user.student_profile.is_active = False
    if target_user.teacher_profile:
        target_user.teacher_profile.is_active = False

    db.commit()
    return ok({"id": target_user.id, "deactivated": True})


# ---------------- Students ----------------
@router.get("/students")
def list_students(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
    search: str = Query(default=""),
    class_id: int = Query(default=None),
):
    q = db.query(Student)
    if search:
        q = q.filter(Student.full_name.ilike(f"%{search}%"))
    if class_id:
        q = q.filter(Student.class_id == class_id)
    students = q.all()
    return ok({
        "students": [
            {
                "id": s.id,
                "student_code": s.student_code,
                "full_name": s.full_name,
                "class_id": s.class_id,
                "class_name": s.school_class.name if s.school_class else None,
                "is_active": s.is_active,
                "username": s.user.username if s.user else "",
            }
            for s in students
        ]
    })


@router.post("/students")
def create_student(payload: StudentCreate, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    if db.query(User).filter(User.username == payload.username).first():
        raise ApiException(400, "USERNAME_TAKEN", "Username already exists.")
    if db.query(Student).filter(Student.student_code == payload.student_code).first():
        raise ApiException(400, "STUDENT_CODE_TAKEN", "Student code already exists.")

    new_user = User(username=payload.username, hashed_password=hash_password(payload.password), role=RoleEnum.student)
    db.add(new_user)
    db.flush()

    student = Student(
        user_id=new_user.id,
        student_code=payload.student_code,
        full_name=payload.full_name,
        class_id=payload.class_id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return ok({"id": student.id, "full_name": student.full_name})


@router.put("/students/{student_id}")
def update_student(student_id: int, payload: StudentUpdate, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    student = db.query(Student).get(student_id)
    if not student:
        raise ApiException(404, "NOT_FOUND", "Student not found.")
    if payload.full_name is not None:
        student.full_name = payload.full_name
    if payload.class_id is not None:
        student.class_id = payload.class_id
    if payload.is_active is not None:
        student.is_active = payload.is_active
        if student.user:
            student.user.is_active = payload.is_active
    db.commit()
    return ok({"id": student.id})


@router.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    student = db.query(Student).get(student_id)
    if not student:
        raise ApiException(404, "NOT_FOUND", "Student not found.")
    # Soft delete/deactivate to preserve attendance history integrity.
    student.is_active = False
    if student.user:
        student.user.is_active = False
    db.commit()
    return ok({"id": student.id, "deactivated": True})


# ---------------- Teachers ----------------
@router.get("/teachers")
def list_teachers(db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    teachers = db.query(Teacher).all()
    return ok({
        "teachers": [
            {
                "id": t.id,
                "teacher_code": t.teacher_code,
                "full_name": t.full_name,
                "subject_specialty": t.subject_specialty,
                "is_active": t.is_active,
                "username": t.user.username if t.user else "",
            }
            for t in teachers
        ]
    })


@router.post("/teachers")
def create_teacher(payload: TeacherCreate, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    if db.query(User).filter(User.username == payload.username).first():
        raise ApiException(400, "USERNAME_TAKEN", "Username already exists.")

    new_user = User(username=payload.username, hashed_password=hash_password(payload.password), role=RoleEnum.teacher)
    db.add(new_user)
    db.flush()

    teacher = Teacher(
        user_id=new_user.id,
        teacher_code=payload.teacher_code,
        full_name=payload.full_name,
        subject_specialty=payload.subject_specialty,
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return ok({"id": teacher.id, "full_name": teacher.full_name})


@router.put("/teachers/{teacher_id}")
def update_teacher(
    teacher_id: int,
    payload: TeacherUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    teacher = db.query(Teacher).get(teacher_id)
    if not teacher:
        raise ApiException(404, "NOT_FOUND", "Teacher not found.")
    if payload.full_name is not None and payload.full_name.strip():
        teacher.full_name = payload.full_name.strip()
    if payload.subject_specialty is not None:
        teacher.subject_specialty = payload.subject_specialty.strip()
    if payload.is_active is not None:
        teacher.is_active = payload.is_active
        if teacher.user:
            teacher.user.is_active = payload.is_active
    db.commit()
    return ok({"id": teacher.id, "updated": True})


@router.delete("/teachers/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    teacher = db.query(Teacher).get(teacher_id)
    if not teacher:
        raise ApiException(404, "NOT_FOUND", "Teacher not found.")
    teacher.is_active = False
    if teacher.user:
        teacher.user.is_active = False
    db.commit()
    return ok({"id": teacher.id, "deactivated": True})


# ---------------- Classes ----------------
@router.get("/classes")
def list_classes(db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    classes = db.query(SchoolClass).all()
    return ok({
        "classes": [
            {
                "id": c.id,
                "name": c.name,
                "major": c.major,
                "grade": c.grade,
                "academic_year": c.academic_year,
                "student_count": db.query(Student).filter(Student.class_id == c.id).count(),
            }
            for c in classes
        ]
    })


@router.post("/classes")
def create_class(payload: ClassCreate, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    school_class = SchoolClass(**payload.model_dump())
    db.add(school_class)
    db.commit()
    db.refresh(school_class)
    return ok({"id": school_class.id, "name": school_class.name})


class ClassUpdatePayload(BaseModel):
    name: Optional[str] = None
    major: Optional[str] = None
    grade: Optional[str] = None
    academic_year: Optional[str] = None


@router.put("/classes/{class_id}")
def update_class(
    class_id: int,
    payload: ClassUpdatePayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    school_class = db.query(SchoolClass).get(class_id)
    if not school_class:
        raise ApiException(404, "NOT_FOUND", "Kelas tidak ditemukan.")
    if payload.name is not None and payload.name.strip():
        school_class.name = payload.name.strip()
    if payload.major is not None:
        school_class.major = payload.major.strip()
    if payload.grade is not None:
        school_class.grade = payload.grade.strip()
    if payload.academic_year is not None:
        school_class.academic_year = payload.academic_year.strip()
    db.commit()
    db.refresh(school_class)
    return ok({"id": school_class.id, "name": school_class.name})


@router.delete("/classes/{class_id}")
def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    school_class = db.query(SchoolClass).get(class_id)
    if not school_class:
        raise ApiException(404, "NOT_FOUND", "Kelas tidak ditemukan.")

    student_count = db.query(Student).filter(Student.class_id == class_id).count()
    if student_count > 0:
        raise ApiException(400, "CLASS_HAS_STUDENTS", f"Kelas '{school_class.name}' tidak dapat dihapus karena masih memiliki {student_count} siswa terdaftar.")

    session_count = db.query(AttendanceSession).filter(AttendanceSession.class_id == class_id).count()
    if session_count > 0:
        raise ApiException(400, "CLASS_HAS_SESSIONS", f"Kelas '{school_class.name}' tidak dapat dihapus karena memiliki riwayat sesi presensi.")

    db.delete(school_class)
    db.commit()
    return ok({"id": class_id, "deleted": True})


# ---------------- Subjects ----------------
@router.get("/subjects")
def list_subjects(db: Session = Depends(get_db), user: User = Depends(require_role("admin", "teacher"))):
    subjects = db.query(Subject).all()
    return ok({"subjects": [{"id": s.id, "name": s.name, "code": s.code} for s in subjects]})


@router.post("/subjects")
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    subject = Subject(**payload.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return ok({"id": subject.id, "name": subject.name})


class SubjectUpdatePayload(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None


@router.put("/subjects/{subject_id}")
def update_subject(
    subject_id: int,
    payload: SubjectUpdatePayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    subject = db.query(Subject).get(subject_id)
    if not subject:
        raise ApiException(404, "NOT_FOUND", "Mata pelajaran tidak ditemukan.")
    if payload.name is not None and payload.name.strip():
        subject.name = payload.name.strip()
    if payload.code is not None:
        subject.code = payload.code.strip()
    db.commit()
    db.refresh(subject)
    return ok({"id": subject.id, "name": subject.name, "code": subject.code})


@router.delete("/subjects/{subject_id}")
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    subject = db.query(Subject).get(subject_id)
    if not subject:
        raise ApiException(404, "NOT_FOUND", "Mata pelajaran tidak ditemukan.")

    session_count = db.query(AttendanceSession).filter(AttendanceSession.subject_id == subject_id).count()
    if session_count > 0:
        raise ApiException(400, "SUBJECT_HAS_SESSIONS", f"Mata pelajaran '{subject.name}' tidak dapat dihapus karena memiliki riwayat sesi presensi.")

    db.delete(subject)
    db.commit()
    return ok({"id": subject_id, "deleted": True})


# ---------------- All Attendance Sessions (Admin Oversight) ----------------
# ---------------- All Attendance Sessions (Admin Oversight & Management) ----------------
@router.get("/sessions")
def list_all_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
    date: Optional[str] = Query(None),
    class_id: Optional[int] = Query(None),
    teacher_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
):
    q = db.query(AttendanceSession)
    q = db.query(AttendanceSession).filter(AttendanceSession.is_deleted != True)
    if date:
        q = q.filter(AttendanceSession.date == date)
    if class_id:
        q = q.filter(AttendanceSession.class_id == class_id)
    if teacher_id:
        q = q.filter(AttendanceSession.teacher_id == teacher_id)
    if subject_id:
        q = q.filter(AttendanceSession.subject_id == subject_id)

    sessions = q.order_by(AttendanceSession.date.desc(), AttendanceSession.start_time.desc()).all()
    out = []
    for s in sessions:
        sess_status = attendance_service.get_session_status(s)
        if status and status != "all" and sess_status != status:
            continue

        present_count = (
            db.query(AttendanceRecord.student_id)
            .filter(
                AttendanceRecord.session_id == s.id,
                AttendanceRecord.status != AttendanceStatus.absent,
                AttendanceRecord.is_deleted != True,
            )
            .distinct()
            .count()
        )
        total_enrolled = (
            db.query(Student)
            .filter(Student.class_id == s.class_id)
            .count()
        )
        total_students = max(total_enrolled, present_count)
        pending_photos = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.session_id == s.id,
                AttendanceRecord.photo_status == PhotoStatus.pending,
                AttendanceRecord.is_deleted != True,
            )
            .count()
        )
        out.append({
            "id": s.id,
            "date": s.date,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "room": s.room or "",
            "late_threshold_minutes": s.late_threshold_minutes,
            "class_id": s.class_id,
            "subject_id": s.subject_id,
            "teacher_id": s.teacher_id,
            "schedule_id": s.schedule_id,
            "subject_name": s.subject.name if s.subject else None,
            "class_name": s.school_class.name if s.school_class else None,
            "teacher_name": s.teacher.full_name if s.teacher else None,
            "status": attendance_service.get_session_status(s),
            "status": sess_status,
            "require_gps": s.require_gps,
            "require_photo": s.require_photo,
            "require_biometric": s.require_biometric,
            "present_count": present_count,
            "total_students": total_students,
            "pending_photos": pending_photos,
        })
    return ok({"sessions": out})


@router.post("/sessions")
def create_session(
    payload: AdminSessionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    if payload.start_time >= payload.end_time:
        raise ApiException(400, "INVALID_TIME", "Jam selesai harus lebih akhir dari jam mulai.")

    school_class = db.query(SchoolClass).get(payload.class_id)
    if not school_class:
        raise ApiException(404, "CLASS_NOT_FOUND", "Kelas tidak ditemukan.")

    subject = db.query(Subject).get(payload.subject_id)
    if not subject:
        raise ApiException(404, "SUBJECT_NOT_FOUND", "Mata pelajaran tidak ditemukan.")

    teacher = db.query(Teacher).get(payload.teacher_id)
    if not teacher:
        raise ApiException(404, "TEACHER_NOT_FOUND", "Guru tidak ditemukan.")

    session = AttendanceSession(
        subject_id=payload.subject_id,
        class_id=payload.class_id,
        teacher_id=payload.teacher_id,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room.strip() if payload.room else None,
        late_threshold_minutes=payload.late_threshold_minutes,
        require_gps=payload.require_gps,
        require_photo=payload.require_photo,
        require_biometric=payload.require_biometric,
        schedule_id=payload.schedule_id,
        nonce=secrets.token_hex(32),
        is_deleted=False,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return ok({"id": session.id, "created": True})


@router.get("/sessions/{session_id}")
def get_session_detail(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    s = db.query(AttendanceSession).filter(
        AttendanceSession.id == session_id,
        AttendanceSession.is_deleted != True,
    ).first()
    if not s:
        raise ApiException(404, "SESSION_NOT_FOUND", "Sesi presensi tidak ditemukan.")

    sess_status = attendance_service.get_session_status(s)

    # Attendance records
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == s.id,
        AttendanceRecord.is_deleted != True,
    ).all()

    record_by_student = {r.student_id: r for r in records}

    # Counts
    present_cnt = sum(1 for r in records if r.status == AttendanceStatus.present)
    late_cnt = sum(1 for r in records if r.status == AttendanceStatus.late)
    excused_cnt = sum(1 for r in records if r.status == AttendanceStatus.excused)
    sick_cnt = sum(1 for r in records if r.status == AttendanceStatus.sick)
    absent_cnt = sum(1 for r in records if r.status == AttendanceStatus.absent)
    pending_photos = sum(1 for r in records if r.photo_status == PhotoStatus.pending)

    # Class students
    enrolled_students = (
        db.query(Student)
        .filter(Student.class_id == s.class_id)
        .order_by(Student.full_name)
        .all()
    )
    total_enrolled = len(enrolled_students)
    total_students = max(total_enrolled, len(records))

    student_items = []
    for st in enrolled_students:
        rec = record_by_student.get(st.id)
        if rec:
            method = "photo" if rec.photo_path else "qr"
            student_items.append({
                "student_id": st.id,
                "student_code": st.student_code,
                "full_name": st.full_name,
                "is_active": st.is_active,
                "has_attended": True,
                "record_id": rec.id,
                "status": rec.status.value,
                "check_in_time": rec.checked_in_at.strftime("%H:%M") if rec.checked_in_at else "-",
                "check_in_time": (rec.checked_in_at + timedelta(hours=7)).strftime("%H:%M") if rec.checked_in_at else "-",
                "method": method,
                "photo_path": rec.photo_path,
                "photo_status": rec.photo_status.value if rec.photo_status else "none",
                "photo_rejection_reason": rec.photo_rejection_reason,
                "manual_override": rec.manual_override,
                "override_reason": rec.override_reason,
                "biometric_verified": rec.biometric_verified,
            })
        else:
            student_items.append({
                "student_id": st.id,
                "student_code": st.student_code,
                "full_name": st.full_name,
                "is_active": st.is_active,
                "has_attended": False,
                "record_id": None,
                "status": "absent" if sess_status == "expired" else "not_checked_in",
                "check_in_time": "-",
                "method": "-",
                "photo_path": None,
                "photo_status": "none",
                "photo_rejection_reason": None,
                "manual_override": False,
                "override_reason": None,
                "biometric_verified": False,
            })

    attendance_rate = min(100.0, round(((present_cnt + late_cnt) / max(total_students, 1)) * 100, 1))

    return ok({
        "session": {
            "id": s.id,
            "date": s.date,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "room": s.room or "",
            "late_threshold_minutes": s.late_threshold_minutes,
            "class_id": s.class_id,
            "class_name": s.school_class.name if s.school_class else "",
            "subject_id": s.subject_id,
            "subject_name": s.subject.name if s.subject else "",
            "teacher_id": s.teacher_id,
            "teacher_name": s.teacher.full_name if s.teacher else "",
            "schedule_id": s.schedule_id,
            "status": sess_status,
            "require_gps": s.require_gps,
            "require_photo": s.require_photo,
            "require_biometric": s.require_biometric,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        },
        "stats": {
            "total_students": total_students,
            "total_enrolled": total_enrolled,
            "unique_attendees": len(records),
            "present_count": present_cnt,
            "late_count": late_cnt,
            "excused_count": excused_cnt,
            "sick_count": sick_cnt,
            "absent_count": absent_cnt,
            "pending_photos": pending_photos,
            "attendance_rate": attendance_rate,
        },
        "students": student_items,
    })


@router.put("/sessions/{session_id}")
def update_session(
    session_id: int,
    payload: AdminSessionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    session = db.query(AttendanceSession).filter(
        AttendanceSession.id == session_id,
        AttendanceSession.is_deleted != True,
    ).first()
    if not session:
        raise ApiException(404, "SESSION_NOT_FOUND", "Sesi presensi tidak ditemukan.")

    new_start = payload.start_time if payload.start_time is not None else session.start_time
    new_end = payload.end_time if payload.end_time is not None else session.end_time
    if new_start >= new_end:
        raise ApiException(400, "INVALID_TIME", "Jam selesai harus lebih akhir dari jam mulai.")

    if payload.subject_id is not None:
        session.subject_id = payload.subject_id
    if payload.class_id is not None:
        session.class_id = payload.class_id
    if payload.teacher_id is not None:
        session.teacher_id = payload.teacher_id
    if payload.date is not None:
        session.date = payload.date
    if payload.start_time is not None:
        session.start_time = payload.start_time
    if payload.end_time is not None:
        session.end_time = payload.end_time
    if payload.room is not None:
        session.room = payload.room.strip() or None
    if payload.late_threshold_minutes is not None:
        session.late_threshold_minutes = payload.late_threshold_minutes
    if payload.require_gps is not None:
        session.require_gps = payload.require_gps
    if payload.require_photo is not None:
        session.require_photo = payload.require_photo
    if payload.require_biometric is not None:
        session.require_biometric = payload.require_biometric
    if payload.schedule_id is not None:
        session.schedule_id = payload.schedule_id

    db.commit()
    db.refresh(session)
    return ok({"id": session.id, "updated": True})


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    session = db.query(AttendanceSession).filter(
        AttendanceSession.id == session_id,
        AttendanceSession.is_deleted != True,
    ).first()
    if not session:
        raise ApiException(404, "SESSION_NOT_FOUND", "Sesi presensi tidak ditemukan.")

    # Soft delete session to preserve historical attendance
    session.is_deleted = True
    db.commit()
    return ok({"id": session_id, "deleted": True})


# ---------------- Schedules ----------------
def _validate_schedule(
    db: Session,
    class_id: int,
    subject_id: int,
    teacher_id: int,
    day_of_week: int,
    start_time: str,
    end_time: str,
    room: Optional[str] = None,
    exclude_id: Optional[int] = None,
):
    if start_time >= end_time:
        raise ApiException(400, "INVALID_TIME", "Jam selesai harus lebih akhir dari jam mulai.")

    teacher = db.query(Teacher).get(teacher_id)
    if not teacher:
        raise ApiException(404, "TEACHER_NOT_FOUND", "Guru tidak ditemukan.")

    school_class = db.query(SchoolClass).get(class_id)
    if not school_class:
        raise ApiException(404, "CLASS_NOT_FOUND", "Kelas tidak ditemukan.")

    subject = db.query(Subject).get(subject_id)
    if not subject:
        raise ApiException(404, "SUBJECT_NOT_FOUND", "Mata pelajaran tidak ditemukan.")

    # Overlap condition: (new_start < existing_end and new_end > existing_start)
    # 1. Teacher conflict: same day & overlapping time
    teacher_q = db.query(Schedule).filter(
        Schedule.teacher_id == teacher_id,
        Schedule.day_of_week == day_of_week,
        Schedule.start_time < end_time,
        Schedule.end_time > start_time,
    )
    if exclude_id:
        teacher_q = teacher_q.filter(Schedule.id != exclude_id)
    tc = teacher_q.first()
    if tc:
        c_name = tc.school_class.name if tc.school_class else ""
        raise ApiException(
            400,
            "TEACHER_CONFLICT",
            f"Guru {teacher.full_name} sudah memiliki jadwal mengajar di kelas {c_name} pada {tc.start_time} - {tc.end_time}.",
        )

    # 2. Class conflict: same day & overlapping time
    class_q = db.query(Schedule).filter(
        Schedule.class_id == class_id,
        Schedule.day_of_week == day_of_week,
        Schedule.start_time < end_time,
        Schedule.end_time > start_time,
    )
    if exclude_id:
        class_q = class_q.filter(Schedule.id != exclude_id)
    cc = class_q.first()
    if cc:
        sub_name = cc.subject.name if cc.subject else ""
        raise ApiException(
            400,
            "CLASS_CONFLICT",
            f"Kelas {school_class.name} sudah memiliki pelajaran {sub_name} pada {cc.start_time} - {cc.end_time}.",
        )

    # 3. Room conflict (if room specified): same day & overlapping time
    if room and room.strip():
        clean_room = room.strip()
        room_q = db.query(Schedule).filter(
            Schedule.room == clean_room,
            Schedule.day_of_week == day_of_week,
            Schedule.start_time < end_time,
            Schedule.end_time > start_time,
        )
        if exclude_id:
            room_q = room_q.filter(Schedule.id != exclude_id)
        rc = room_q.first()
        if rc:
            rc_class = rc.school_class.name if rc.school_class else ""
            raise ApiException(
                400,
                "ROOM_CONFLICT",
                f"Ruangan '{clean_room}' sedang dipakai kelas {rc_class} pada {rc.start_time} - {rc.end_time}.",
            )


@router.get("/schedules")
def list_schedules(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "teacher")),
    class_id: Optional[int] = Query(None),
    teacher_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    day_of_week: Optional[int] = Query(None),
    room: Optional[str] = Query(None),
):
    q = db.query(Schedule)
    q = db.query(Schedule).filter(Schedule.is_active != False)
    if class_id:
        q = q.filter(Schedule.class_id == class_id)
    if teacher_id:
        q = q.filter(Schedule.teacher_id == teacher_id)
    if subject_id:
        q = q.filter(Schedule.subject_id == subject_id)
    if day_of_week is not None:
        q = q.filter(Schedule.day_of_week == day_of_week)
    if room:
        q = q.filter(Schedule.room.ilike(f"%{room.strip()}%"))

    schedules = q.order_by(Schedule.day_of_week, Schedule.start_time).all()
    return ok({
        "schedules": [
            {
                "id": s.id,
                "class_id": s.class_id,
                "class_name": s.school_class.name if s.school_class else "",
                "subject_id": s.subject_id,
                "subject_name": s.subject.name if s.subject else "",
                "teacher_id": s.teacher_id,
                "teacher_name": s.teacher.full_name if s.teacher else "",
                "day_of_week": s.day_of_week,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "room": s.room or "",
                "is_active": s.is_active if s.is_active is not None else True,
            }
            for s in schedules
        ]
    })


@router.post("/schedules")
def create_schedule(
    payload: ScheduleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    _validate_schedule(
        db,
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        teacher_id=payload.teacher_id,
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room,
    )
    schedule = Schedule(**payload.model_dump(), is_active=True)
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return ok({"id": schedule.id, "created": True})


@router.put("/schedules/{schedule_id}")
def update_schedule(
    schedule_id: int,
    payload: ScheduleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    schedule = db.query(Schedule).get(schedule_id)
    if not schedule:
        raise ApiException(404, "NOT_FOUND", "Jadwal tidak ditemukan.")

    new_class_id = payload.class_id if payload.class_id is not None else schedule.class_id
    new_subject_id = payload.subject_id if payload.subject_id is not None else schedule.subject_id
    new_teacher_id = payload.teacher_id if payload.teacher_id is not None else schedule.teacher_id
    new_day = payload.day_of_week if payload.day_of_week is not None else schedule.day_of_week
    new_start = payload.start_time if payload.start_time is not None else schedule.start_time
    new_end = payload.end_time if payload.end_time is not None else schedule.end_time
    new_room = payload.room if payload.room is not None else schedule.room

    _validate_schedule(
        db,
        class_id=new_class_id,
        subject_id=new_subject_id,
        teacher_id=new_teacher_id,
        day_of_week=new_day,
        start_time=new_start,
        end_time=new_end,
        room=new_room,
        exclude_id=schedule.id,
    )

    schedule.class_id = new_class_id
    schedule.subject_id = new_subject_id
    schedule.teacher_id = new_teacher_id
    schedule.day_of_week = new_day
    schedule.start_time = new_start
    schedule.end_time = new_end
    schedule.room = new_room

    db.commit()
    return ok({"id": schedule.id, "updated": True})


@router.delete("/schedules/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    schedule = db.query(Schedule).get(schedule_id)
    if not schedule:
        raise ApiException(404, "NOT_FOUND", "Jadwal tidak ditemukan.")

    db.delete(schedule)
    # Soft delete / deactivate schedule
    schedule.is_active = False
    db.commit()
    return ok({"id": schedule_id, "deleted": True})


# ---------------- Reports ----------------
# ---------------- Reports & Attendance Corrections ----------------
@router.get("/reports")
def reports(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "teacher")),
    start_date: str = Query(...),
    end_date: str = Query(...),
    class_id: Optional[int] = Query(default=None),
    student_id: Optional[int] = Query(default=None),
    teacher_id: Optional[int] = Query(default=None),
    subject_id: Optional[int] = Query(default=None),
    session_id: Optional[int] = Query(default=None),
    status: Optional[str] = Query(default=None),
    format: str = Query(default="json"),
):
    q = (
        db.query(AttendanceRecord)
        .join(AttendanceSession)
        .filter(
            AttendanceSession.date >= start_date,
            AttendanceSession.date <= end_date,
            AttendanceRecord.is_deleted != True,
            AttendanceSession.is_deleted != True,
        )
    )
    if class_id:
        q = q.filter(AttendanceSession.class_id == class_id)
    if student_id:
        q = q.filter(AttendanceRecord.student_id == student_id)
    if teacher_id:
        q = q.filter(AttendanceSession.teacher_id == teacher_id)
    if subject_id:
        q = q.filter(AttendanceSession.subject_id == subject_id)
    if session_id:
        q = q.filter(AttendanceRecord.session_id == session_id)
    if status and status != "all":
        try:
            q = q.filter(AttendanceRecord.status == AttendanceStatus(status))
        except ValueError:
            raise ApiException(400, "INVALID_STATUS", "Invalid status filter.")
            raise ApiException(400, "INVALID_STATUS", "Status presensi tidak valid.")

    records = q.all()
    records = q.order_by(AttendanceSession.date.desc(), AttendanceRecord.checked_in_at.desc()).all()

    total_records = len(records)
    unique_student_ids = {r.student_id for r in records}
    unique_students = len(unique_student_ids)

    present_count = sum(1 for r in records if r.status == AttendanceStatus.present)
    late_count = sum(1 for r in records if r.status == AttendanceStatus.late)
    excused_count = sum(1 for r in records if r.status == AttendanceStatus.excused)
    sick_count = sum(1 for r in records if r.status == AttendanceStatus.sick)
    absent_count = sum(1 for r in records if r.status == AttendanceStatus.absent)

    present_total = present_count + late_count
    attendance_rate = min(100.0, round((present_total / max(total_records, 1)) * 100, 1)) if total_records > 0 else 0.0

    summary = {
        "total_records": total_records,
        "unique_students": unique_students,
        "present_count": present_count,
        "late_count": late_count,
        "excused_count": excused_count,
        "sick_count": sick_count,
        "absent_count": absent_count,
        "attendance_rate": attendance_rate,
    }

    rows = [
        {
            "date": r.session.date,
            "class_name": r.session.school_class.name if r.session.school_class else "",
            "subject": r.session.subject.name if r.session.subject else "",
            "id": r.id,
            "session_id": r.session_id,
            "date": r.session.date if r.session else "",
            "class_id": r.session.class_id if r.session else None,
            "class_name": r.session.school_class.name if (r.session and r.session.school_class) else "",
            "subject_id": r.session.subject_id if r.session else None,
            "subject": r.session.subject.name if (r.session and r.session.subject) else "",
            "teacher_id": r.session.teacher_id if r.session else None,
            "teacher_name": r.session.teacher.full_name if (r.session and r.session.teacher) else "",
            "student_id": r.student_id,
            "student_code": r.student.student_code if r.student else "",
            "student_name": r.student.full_name if r.student else "",
            "check_in_time": r.checked_in_at.strftime("%H:%M"),
            "check_in_time": r.checked_in_at.strftime("%H:%M") if r.checked_in_at else "-",
            "check_in_time": (r.checked_in_at + timedelta(hours=7)).strftime("%H:%M") if r.checked_in_at else "-",
            "status": r.status.value,
            "method": "photo" if r.photo_path else "qr",
            "photo_path": r.photo_path,
            "photo_status": r.photo_status.value if r.photo_status else "none",
            "photo_rejection_reason": r.photo_rejection_reason,
            "manual_override": r.manual_override,
            "override_reason": r.override_reason,
        }
        for r in records
    ]

    if format == "csv":
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()) if rows else
                                 ["date", "class_name", "subject", "student_code", "student_name", "check_in_time", "status"])
        fieldnames = [
            "date", "class_name", "subject", "teacher_name",
            "student_code", "student_name", "check_in_time", "status", "method", "override_reason"
        ]
        writer = csv.DictWriter(buf, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
        for row in rows:
            writer.writerow({
                "date": row["date"],
                "class_name": row["class_name"],
                "subject": row["subject"],
                "teacher_name": row["teacher_name"],
                "student_code": row["student_code"],
                "student_name": row["student_name"],
                "check_in_time": row["check_in_time"],
                "status": row["status"],
                "method": row["method"],
                "override_reason": row["override_reason"] or "",
            })
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=attendance_report_{start_date}_to_{end_date}.csv"},
        )

    return ok({"rows": rows, "count": len(rows), "summary": summary})


@router.put("/attendance-records/{record_id}")
def update_attendance_record(
    record_id: int,
    payload: AttendanceRecordCorrection,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    rec = db.query(AttendanceRecord).filter(
        AttendanceRecord.id == record_id,
        AttendanceRecord.is_deleted != True,
    ).first()
    if not rec:
        raise ApiException(404, "RECORD_NOT_FOUND", "Data presensi tidak ditemukan.")

    try:
        new_status = AttendanceStatus(payload.status)
        rec.status = new_status
    except ValueError:
        raise ApiException(400, "INVALID_STATUS", f"Status '{payload.status}' tidak valid.")

    rec.manual_override = True
    if payload.override_reason:
        rec.override_reason = payload.override_reason.strip()

    if payload.checked_in_time and ":" in payload.checked_in_time:
        try:
            parts = payload.checked_in_time.split(":")
            h, m = int(parts[0]), int(parts[1])
            rec.checked_in_at = rec.checked_in_at.replace(hour=h, minute=m)
        except Exception:
            pass

    db.commit()
    db.refresh(rec)
    return ok({"id": rec.id, "updated": True, "status": rec.status.value, "manual_override": rec.manual_override})


@router.delete("/attendance-records/{record_id}")
def delete_attendance_record(
    record_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    rec = db.query(AttendanceRecord).filter(
        AttendanceRecord.id == record_id,
        AttendanceRecord.is_deleted != True,
    ).first()
    if not rec:
        raise ApiException(404, "RECORD_NOT_FOUND", "Data presensi tidak ditemukan.")

    rec.is_deleted = True
    db.commit()
    return ok({"id": record_id, "deleted": True})
