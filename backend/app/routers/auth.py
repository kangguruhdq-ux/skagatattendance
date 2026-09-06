from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import verify_password, hash_password, create_access_token
from app.database.db import get_db
from app.models.models import User, Student, SchoolClass, RoleEnum
from app.schemas.schemas import LoginRequest
from app.utils.response import ok, ApiException

router = APIRouter(prefix="/api/auth", tags=["auth"])


class StudentRegisterRequest(BaseModel):
    username: str
    password: str
    full_name: str
    student_code: str
    class_id: int


def _profile_name(user: User) -> str:
    if user.student_profile:
        return user.student_profile.full_name
    if user.teacher_profile:
        return user.teacher_profile.full_name
    return user.username.title()


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise ApiException(401, "INVALID_CREDENTIALS", "Invalid username or password.")
    if not user.is_active:
        raise ApiException(403, "ACCOUNT_DISABLED", "This account has been disabled.")

    token = create_access_token(subject=user.username, role=user.role.value)
    return ok({
        "access_token": token,
        "token_type": "bearer",
        "role": user.role.value,
        "full_name": _profile_name(user),
    })


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return ok({
        "id": user.id,
        "username": user.username,
        "role": user.role.value,
        "full_name": _profile_name(user),
    })


@router.get("/classes")
def get_public_classes(db: Session = Depends(get_db)):
    """Public list of school classes for student registration dropdown."""
    classes = db.query(SchoolClass).order_by(SchoolClass.name).all()
    return ok({
        "classes": [
            {
                "id": c.id,
                "name": c.name,
                "major": c.major,
                "grade": c.grade,
            }
            for c in classes
        ]
    })


@router.post("/register-student")
def register_student(payload: StudentRegisterRequest, db: Session = Depends(get_db)):
    """
    Self-service student registration.
    Strictly restricted to creating accounts with student role only.
    Teachers and Admins cannot register through this endpoint.
    """
    clean_username = payload.username.strip().lower()
    clean_student_code = payload.student_code.strip().upper()
    clean_full_name = payload.full_name.strip()

    if len(clean_username) < 3:
        raise ApiException(400, "INVALID_USERNAME", "Username minimal 3 karakter.")
    if len(payload.password) < 6:
        raise ApiException(400, "INVALID_PASSWORD", "Password minimal 6 karakter.")
    if not clean_full_name:
        raise ApiException(400, "INVALID_NAME", "Nama lengkap wajib diisi.")
    if not clean_student_code:
        raise ApiException(400, "INVALID_STUDENT_CODE", "NIS / Nomor Induk Siswa wajib diisi.")

    # Check username uniqueness
    if db.query(User).filter(User.username == clean_username).first():
        raise ApiException(400, "USERNAME_TAKEN", "Username sudah digunakan. Silakan pilih username lain.")

    # Check student code uniqueness
    if db.query(Student).filter(Student.student_code == clean_student_code).first():
        raise ApiException(400, "STUDENT_CODE_TAKEN", "NIS sudah terdaftar pada akun siswa lain.")

    # Check class existence
    school_class = db.query(SchoolClass).get(payload.class_id)
    if not school_class:
        raise ApiException(404, "CLASS_NOT_FOUND", "Kelas yang dipilih tidak ditemukan.")

    # Create User with strictly student role
    new_user = User(
        username=clean_username,
        hashed_password=hash_password(payload.password),
        role=RoleEnum.student,
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    new_student = Student(
        user_id=new_user.id,
        student_code=clean_student_code,
        full_name=clean_full_name,
        class_id=school_class.id,
        is_active=True,
    )
    db.add(new_student)
    db.commit()

    return ok({
        "registered": True,
        "username": new_user.username,
        "full_name": new_student.full_name,
        "class_name": school_class.name,
    })
