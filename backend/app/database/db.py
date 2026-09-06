from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import get_settings

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema():
    """
    Safely ensures newly added columns exist in the database without
    dropping or recreating tables, preserving all existing attendance data.
    """
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            # attendance_records
            res = conn.exec_driver_sql("PRAGMA table_info(attendance_records);")
            existing_cols = {row[1] for row in res.fetchall()}
            if "photo_status" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE attendance_records ADD COLUMN photo_status VARCHAR(16) DEFAULT 'none';")
            if "photo_reviewed_by" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE attendance_records ADD COLUMN photo_reviewed_by INTEGER REFERENCES teachers(id);")
            if "photo_reviewed_at" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE attendance_records ADD COLUMN photo_reviewed_at DATETIME;")
            if "photo_rejection_reason" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE attendance_records ADD COLUMN photo_rejection_reason TEXT;")
            if "is_deleted" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE attendance_records ADD COLUMN is_deleted BOOLEAN DEFAULT 0;")

            # attendance_sessions
            res_sess = conn.exec_driver_sql("PRAGMA table_info(attendance_sessions);")
            existing_sess_cols = {row[1] for row in res_sess.fetchall()}
            if "room" not in existing_sess_cols:
                conn.exec_driver_sql("ALTER TABLE attendance_sessions ADD COLUMN room VARCHAR(32);")
            if "schedule_id" not in existing_sess_cols:
                conn.exec_driver_sql("ALTER TABLE attendance_sessions ADD COLUMN schedule_id INTEGER REFERENCES schedules(id);")
            if "is_deleted" not in existing_sess_cols:
                conn.exec_driver_sql("ALTER TABLE attendance_sessions ADD COLUMN is_deleted BOOLEAN DEFAULT 0;")

            # schedules
            res_sched = conn.exec_driver_sql("PRAGMA table_info(schedules);")
            existing_sched_cols = {row[1] for row in res_sched.fetchall()}
            if "is_active" not in existing_sched_cols:
                conn.exec_driver_sql("ALTER TABLE schedules ADD COLUMN is_active BOOLEAN DEFAULT 1;")
            if "created_at" not in existing_sched_cols:
                conn.exec_driver_sql("ALTER TABLE schedules ADD COLUMN created_at DATETIME;")
            if "updated_at" not in existing_sched_cols:
                conn.exec_driver_sql("ALTER TABLE schedules ADD COLUMN updated_at DATETIME;")

            # subjects
            res_subj = conn.exec_driver_sql("PRAGMA table_info(subjects);")
            existing_subj_cols = {row[1] for row in res_subj.fetchall()}
            if "is_active" not in existing_subj_cols:
                conn.exec_driver_sql("ALTER TABLE subjects ADD COLUMN is_active BOOLEAN DEFAULT 1;")

            conn.commit()
        except Exception:
            pass

