"""
Seeds the database with realistic DUMMY demo data:
  - 3 demo accounts (student01 / teacher01 / admin, password: demo123)
  - 5 classes, ~40 students, 5 teachers, several subjects & schedules
  - Two weeks of historical attendance sessions/records so dashboards
    and charts have something to show.

Run with:  python -m app.database.seed
Safe to re-run: it wipes and recreates all tables first.

IMPORTANT: All names below are fictional. This is NOT real student data.
"""
import random
from datetime import date, timedelta, datetime

from app.database.db import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.models import (
    User, RoleEnum, Student, Teacher, SchoolClass, Subject, Schedule,
    AttendanceSession, AttendanceRecord, AttendanceStatus,
)
from app.services.qr_service import generate_session_nonce

FIRST_NAMES = [
    "Andi", "Bima", "Citra", "Dimas", "Eka", "Fajar", "Gita", "Hana", "Indra", "Joko",
    "Kirana", "Lutfi", "Maya", "Nanda", "Oki", "Putri", "Rian", "Sari", "Taufik", "Umi",
    "Vino", "Wulan", "Yoga", "Zahra", "Agus", "Bella", "Candra", "Dewi", "Erlangga", "Fitri",
    "Galih", "Hesti", "Irfan", "Jasmine", "Krisna", "Laras", "Made", "Nadia", "Omar", "Puspa",
]
LAST_NAMES = [
    "Pratama", "Saputra", "Maharani", "Kurniawan", "Wijaya", "Santoso", "Utami", "Nugroho",
    "Ramadhan", "Anggraini", "Setiawan", "Handayani", "Firmansyah", "Lestari", "Hidayat",
]

CLASS_DEFS = [
    ("X TKJ 1", "TKJ", "X"),
    ("XI TKJ 1", "TKJ", "XI"),
    ("XI TKJ 2", "TKJ", "XI"),
    ("XII TKJ 1", "TKJ", "XII"),
    ("XII RPL 1", "RPL", "XII"),
]

SUBJECTS = [
    ("Network Fundamentals", "NET101"),
    ("Mathematics", "MTK101"),
    ("English", "ENG101"),
    ("Web Programming", "RPL201"),
    ("Cybersecurity Basics", "SEC101"),
    ("Pancasila", "PKN101"),
]

TEACHER_DEFS = [
    ("teacher01", "T-001", "Bapak Slamet Riyadi", "Network Fundamentals"),
    ("teacher02", "T-002", "Ibu Ratna Dewi", "Mathematics"),
    ("teacher03", "T-003", "Bapak Hendra Wibowo", "English"),
    ("teacher04", "T-004", "Ibu Yuni Astuti", "Web Programming"),
    ("teacher05", "T-005", "Bapak Agus Salim", "Cybersecurity Basics"),
]


def wipe_and_create():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed():
    wipe_and_create()
    db = SessionLocal()
    random.seed(42)

    try:
        # ---- Admin ----
        admin_user = User(username="admin", hashed_password=hash_password("demo123"), role=RoleEnum.admin)
        db.add(admin_user)

        # ---- Classes ----
        classes = []
        for name, major, grade in CLASS_DEFS:
            c = SchoolClass(name=name, major=major, grade=grade, academic_year="2025/2026")
            db.add(c)
            classes.append(c)
        db.flush()

        # ---- Subjects ----
        subjects = []
        for name, code in SUBJECTS:
            s = Subject(name=name, code=code)
            db.add(s)
            subjects.append(s)
        db.flush()

        # ---- Teachers ----
        teachers = []
        for i, (username, code, full_name, specialty) in enumerate(TEACHER_DEFS):
            password = "demo123" if i == 0 else "teacher123"
            u = User(username=username, hashed_password=hash_password(password), role=RoleEnum.teacher)
            db.add(u)
            db.flush()
            t = Teacher(user_id=u.id, teacher_code=code, full_name=full_name, subject_specialty=specialty)
            db.add(t)
            teachers.append(t)
        db.flush()

        # ---- Schedules (Mon-Fri, 3 periods per class) ----
        periods = [("07:00", "08:30"), ("08:30", "10:00"), ("10:15", "11:45")]
        for c in classes:
            for day in range(5):  # Mon-Fri
                for i, (start, end) in enumerate(periods):
                    subject = subjects[(day + i) % len(subjects)]
                    teacher = teachers[(day + i) % len(teachers)]
                    db.add(Schedule(
                        class_id=c.id, subject_id=subject.id, teacher_id=teacher.id,
                        day_of_week=day, start_time=start, end_time=end, room=f"Lab {(i % 3) + 1}",
                    ))
        db.flush()

        # ---- Students (student01 is the demo login, rest are extra dummy data) ----
        students = []
        name_pool = [f"{f} {l}" for f in FIRST_NAMES for l in LAST_NAMES]
        random.shuffle(name_pool)
        name_idx = 0

        for ci, c in enumerate(classes):
            count = random.randint(7, 10)
            for si in range(count):
                is_demo = (ci == 0 and si == 0)
                username = "student01" if is_demo else f"student{len(students) + 2:03d}"
                password = "demo123" if is_demo else "student123"
                full_name = "Andi Pratama" if is_demo else name_pool[name_idx]
                name_idx += 1

                u = User(username=username, hashed_password=hash_password(password), role=RoleEnum.student)
                db.add(u)
                db.flush()

                code = f"S-{2024000 + len(students) + 1}"
                student = Student(user_id=u.id, student_code=code, full_name=full_name, class_id=c.id)
                db.add(student)
                students.append(student)
        db.flush()

        # ---- Historical attendance: last 10 school days for the demo student's class ----
        demo_student = students[0]
        demo_class_students = [s for s in students if s.class_id == demo_student.class_id]

        today = date.today()
        day_cursor = today - timedelta(days=1)
        school_days_created = 0
        while school_days_created < 10:
            if day_cursor.weekday() < 5:  # Mon-Fri only
                sched_today = [
                    sc for sc in db.query(Schedule).filter(
                        Schedule.class_id == demo_class_students[0].class_id,
                        Schedule.day_of_week == day_cursor.weekday(),
                    ).all()
                ]
                for sched in sched_today:
                    session = AttendanceSession(
                        subject_id=sched.subject_id,
                        class_id=sched.class_id,
                        teacher_id=sched.teacher_id,
                        date=day_cursor.isoformat(),
                        start_time=sched.start_time,
                        end_time=sched.end_time,
                        late_threshold_minutes=10,
                        require_gps=False,
                        nonce=generate_session_nonce(),
                    )
                    db.add(session)
                    db.flush()

                    start_dt = datetime.strptime(f"{day_cursor.isoformat()} {sched.start_time}", "%Y-%m-%d %H:%M")
                    for student in demo_class_students:
                        roll = random.random()
                        if roll < 0.78:
                            status = AttendanceStatus.present
                            checkin = start_dt + timedelta(minutes=random.randint(-5, 8))
                        elif roll < 0.90:
                            status = AttendanceStatus.late
                            checkin = start_dt + timedelta(minutes=random.randint(11, 25))
                        elif roll < 0.95:
                            status = AttendanceStatus.sick
                            checkin = start_dt
                        elif roll < 0.98:
                            status = AttendanceStatus.excused
                            checkin = start_dt
                        else:
                            status = AttendanceStatus.absent
                            checkin = start_dt

                        if status in (AttendanceStatus.absent,):
                            # still create a record so reports show absences explicitly
                            pass

                        db.add(AttendanceRecord(
                            student_id=student.id,
                            session_id=session.id,
                            status=status,
                            checked_in_at=checkin,
                        ))
                school_days_created += 1
            day_cursor -= timedelta(days=1)

        db.commit()
        print("Seed complete.")
        print("Demo accounts: student01/demo123, teacher01/demo123, admin/demo123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
