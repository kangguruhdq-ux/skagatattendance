"""
Saves a check-in "proof photo" to local disk (never into the DB).
Kept intentionally simple for a school/demo deployment — for a multi-server
production setup, point this at object storage (S3-compatible) instead.
"""
import os
import uuid

from fastapi import UploadFile

from app.core.config import get_settings
from app.utils.response import ApiException

settings = get_settings()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
EXT_BY_TYPE = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def _upload_root() -> str:
    root = os.path.join(os.path.dirname(os.path.dirname(__file__)), settings.UPLOAD_DIR)
    os.makedirs(root, exist_ok=True)
    return root


async def save_attendance_photo(file: UploadFile, session_id: int, student_id: int) -> str:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise ApiException(400, "INVALID_PHOTO_TYPE", "Photo must be a JPEG, PNG, or WEBP image.")

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.MAX_PHOTO_SIZE_MB:
        raise ApiException(400, "PHOTO_TOO_LARGE", f"Photo must be under {settings.MAX_PHOTO_SIZE_MB}MB.")
    if size_mb == 0:
        raise ApiException(400, "EMPTY_PHOTO", "Uploaded photo is empty.")

    ext = EXT_BY_TYPE[file.content_type]
    filename = f"s{session_id}_st{student_id}_{uuid.uuid4().hex}{ext}"
    full_path = os.path.join(_upload_root(), filename)

    with open(full_path, "wb") as f:
        f.write(contents)

    # Stored relative to UPLOAD_DIR so it survives moving the app root.
    return filename


def resolve_photo_path(filename: str) -> str:
    return os.path.join(_upload_root(), filename)
