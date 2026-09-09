import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user
from app.core.security import hash_password, verify_password
from app.database.db import get_db
from app.models.models import User
from app.services import activity_service
from app.utils.response import ApiException, ok

router = APIRouter(prefix="/api/profile", tags=["profile"])
settings = get_settings()

ALLOWED_AVATAR_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/x-png",
    "image/webp",
    "image/gif",
    "application/octet-stream",
}
ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
EXT_BY_TYPE = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/png": ".png",
    "image/x-png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def _avatar_dir() -> str:
    path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), settings.UPLOAD_AVATARS_DIR
    )
    os.makedirs(path, exist_ok=True)
    return path


class ChangePasswordPayload(BaseModel):
    old_password: str
    new_password: str


class UpdateProfilePayload(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None


def _profile_out(user: User) -> dict:
    full_name = user.username.title()
    student_info = None
    teacher_info = None

    if user.student_profile:
        s = user.student_profile
        full_name = s.full_name
        student_info = {
            "student_id": s.id,
            "student_code": s.student_code,
            "class_id": s.class_id,
            "class_name": s.school_class.name if s.school_class else None,
            "major": s.school_class.major if s.school_class else None,
            "grade": s.school_class.grade if s.school_class else None,
        }
    elif user.teacher_profile:
        t = user.teacher_profile
        full_name = t.full_name
        teacher_info = {
            "teacher_id": t.id,
            "teacher_code": t.teacher_code,
            "subject_specialty": t.subject_specialty,
        }

    return {
        "id": user.id,
        "username": user.username,
        "role": user.role.value,
        "full_name": full_name,
        "email": user.email,
        "avatar_path": user.avatar_path,
        "avatar_url": f"/api/profile/avatar/{user.id}" if user.avatar_path else None,
        "student_info": student_info,
        "teacher_info": teacher_info,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.get("")
def get_profile(user: User = Depends(get_current_user)):
    return ok(_profile_out(user))


@router.get("/avatar")
def get_my_avatar(user: User = Depends(get_current_user)):
    if not user.avatar_path:
        raise ApiException(404, "NO_AVATAR", "Pengguna belum memiliki foto profil.")
    full_path = os.path.join(_avatar_dir(), user.avatar_path)
    if not os.path.exists(full_path):
        raise ApiException(404, "AVATAR_NOT_FOUND", "Berkas foto profil tidak ditemukan.")
    ext = os.path.splitext(user.avatar_path)[1].lower()
    media_type = "image/png" if ext == ".png" else "image/webp" if ext == ".webp" else "image/jpeg"
    return FileResponse(
        full_path,
        media_type=media_type,
        headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache"},
    )


@router.get("/avatar/{user_id}")
def get_user_avatar_by_id(user_id: int, db: Session = Depends(get_db)):
    u = db.query(User).get(user_id)
    if not u or not u.avatar_path:
        raise ApiException(404, "NO_AVATAR", "Foto profil tidak ditemukan.")
    full_path = os.path.join(_avatar_dir(), u.avatar_path)
    if not os.path.exists(full_path):
        raise ApiException(404, "AVATAR_NOT_FOUND", "Berkas foto profil tidak ditemukan.")
    ext = os.path.splitext(u.avatar_path)[1].lower()
    media_type = "image/png" if ext == ".png" else "image/webp" if ext == ".webp" else "image/jpeg"
    return FileResponse(
        full_path,
        media_type=media_type,
        headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache"},
    )


@router.put("")
def update_profile(
    payload: UpdateProfilePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.email is not None:
        user.email = payload.email.strip() if payload.email.strip() else None

    if payload.full_name is not None and payload.full_name.strip():
        clean_name = payload.full_name.strip()
        if user.student_profile:
            user.student_profile.full_name = clean_name
        elif user.teacher_profile:
            user.teacher_profile.full_name = clean_name

    db.commit()
    db.refresh(user)

    activity_service.log_activity(
        db,
        action="PROFILE_UPDATE",
        description=f"User {user.username} memperbarui profil",
        user_id=user.id,
    )

    return ok(_profile_out(user))


@router.post("/avatar")
async def upload_avatar(
    avatar: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Determine extension and validate type
    ext = os.path.splitext(avatar.filename or "")[1].lower()
    content_type = (avatar.content_type or "").lower()

    is_valid_type = (
        content_type in ALLOWED_AVATAR_TYPES
        or ext in ALLOWED_AVATAR_EXTENSIONS
    )
    if not is_valid_type:
        raise ApiException(400, "INVALID_IMAGE_TYPE", "Foto profil harus berupa berkas gambar JPG, PNG, WEBP, atau GIF.")

    contents = await avatar.read()
    if len(contents) == 0:
        raise ApiException(400, "EMPTY_FILE", "Berkas gambar kosong.")

    size_mb = len(contents) / (1024 * 1024)
    if size_mb > 5.0:
        raise ApiException(400, "IMAGE_TOO_LARGE", "Ukuran foto profil maksimal 5MB.")

    # Remove old avatar if exists
    if user.avatar_path:
        old_file = os.path.join(_avatar_dir(), user.avatar_path)
        if os.path.exists(old_file):
            try:
                os.remove(old_file)
            except Exception:
                pass

    chosen_ext = ext if ext in {".jpg", ".jpeg", ".png", ".webp", ".gif"} else EXT_BY_TYPE.get(content_type, ".jpg")
    if chosen_ext == ".jpeg":
        chosen_ext = ".jpg"

    filename = f"avatar_u{user.id}_{uuid.uuid4().hex[:8]}{chosen_ext}"
    full_path = os.path.join(_avatar_dir(), filename)
    with open(full_path, "wb") as f:
        f.write(contents)

    user.avatar_path = filename
    db.commit()
    db.refresh(user)

    activity_service.log_activity(
        db,
        action="AVATAR_UPLOAD",
        description=f"User {user.username} mengunggah foto profil baru",
        user_id=user.id,
    )

    return ok(_profile_out(user))


@router.delete("/avatar")
def delete_avatar(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.avatar_path:
        old_file = os.path.join(_avatar_dir(), user.avatar_path)
        if os.path.exists(old_file):
            try:
                os.remove(old_file)
            except Exception:
                pass
        user.avatar_path = None
        db.commit()
        db.refresh(user)

    activity_service.log_activity(
        db,
        action="AVATAR_DELETE",
        description=f"User {user.username} menghapus foto profil",
        user_id=user.id,
    )

    return ok(_profile_out(user))


@router.post("/change-password")
def change_password(
    payload: ChangePasswordPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(payload.old_password, user.hashed_password):
        raise ApiException(400, "WRONG_OLD_PASSWORD", "Kata sandi lama tidak sesuai.")

    if len(payload.new_password) < 6:
        raise ApiException(400, "PASSWORD_TOO_SHORT", "Kata sandi baru minimal 6 karakter.")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()

    activity_service.log_activity(
        db,
        action="PASSWORD_CHANGE",
        description=f"User {user.username} mengganti kata sandi",
        user_id=user.id,
    )

    return ok({"password_changed": True, "message": "Kata sandi berhasil diubah."})
