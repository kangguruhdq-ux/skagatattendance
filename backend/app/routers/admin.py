import csv
import io
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.core.security import hash_password
from app.database.db import get_db
from app.models.models import (
    Student, Teacher, SchoolClass, Subject, Schedule, User, RoleEnum,
    AttendanceRecord, AttendanceSession, AttendanceStatus,
)
from app.schemas.schemas import (
    StudentCreate, StudentUpdate, TeacherCreate, ClassCreate, SubjectCreate, ScheduleCreate,
)
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
    db.commit()
    return ok({"id": student.id})


@router.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    student = db.query(Student).get(student_id)
    if not student:
        raise ApiException(404, "NOT_FOUND", "Student not found.")
    # Soft delete/deactivate to preserve attendance history integrity.
    student.is_active = False
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


@router.delete("/teachers/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    teacher = db.query(Teacher).get(teacher_id)
    if not teacher:
        raise ApiException(404, "NOT_FOUND", "Teacher not found.")
    teacher.is_active = False
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


# ---------------- Schedules ----------------
@router.get("/schedules")
def list_schedules(db: Session = Depends(get_db), user: User = Depends(require_role("admin", "teacher"))):
    schedules = db.query(Schedule).all()
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
                "room": s.room,
            }
            for s in schedules
        ]
    })


@router.post("/schedules")
def create_schedule(payload: ScheduleCreate, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    schedule = Schedule(**payload.model_dump())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return ok({"id": schedule.id})


# ---------------- Reports ----------------
@router.get("/reports")
def reports(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "teacher")),
    start_date: str = Query(...),
    end_date: str = Query(...),
    class_id: int = Query(default=None),
    status: str = Query(default=None),
    format: str = Query(default="json"),
):
    q = (
        db.query(AttendanceRecord)
        .join(AttendanceSession)
        .filter(AttendanceSession.date >= start_date, AttendanceSession.date <= end_date)
    )
    if class_id:
        q = q.filter(AttendanceSession.class_id == class_id)
    if status:
        try:
            q = q.filter(AttendanceRecord.status == AttendanceStatus(status))
        except ValueError:
            raise ApiException(400, "INVALID_STATUS", "Invalid status filter.")

    records = q.all()
    rows = [
        {
            "date": r.session.date,
            "class_name": r.session.school_class.name if r.session.school_class else "",
            "subject": r.session.subject.name if r.session.subject else "",
            "student_code": r.student.student_code if r.student else "",
            "student_name": r.student.full_name if r.student else "",
            "check_in_time": r.checked_in_at.strftime("%H:%M"),
            "status": r.status.value,
        }
        for r in records
    ]

    if format == "csv":
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()) if rows else
                                 ["date", "class_name", "subject", "student_code", "student_name", "check_in_time", "status"])
        writer.writeheader()
        writer.writerows(rows)
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=attendance_report.csv"},
        )

    return ok({"rows": rows, "count": len(rows)})
