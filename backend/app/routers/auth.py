from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import verify_password, create_access_token
from app.database.db import get_db
from app.models.models import User
from app.schemas.schemas import LoginRequest
from app.utils.response import ok, ApiException

router = APIRouter(prefix="/api/auth", tags=["auth"])


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
