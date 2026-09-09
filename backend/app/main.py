import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.database.db import Base, engine, ensure_schema
from app.routers import (
    auth, student, teacher, admin, attendance, biometric,
    support, corrections, announcements, notifications, profile,
)

settings = get_settings()

# Create tables and ensure latest columns exist safely
ensure_schema()

app = FastAPI(title="SKAGATA ATTENDANCE API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail and "message" in detail:
        error = detail
    else:
        error = {"code": "HTTP_ERROR", "message": str(detail)}
    return JSONResponse(status_code=exc.status_code, content={"success": False, "data": None, "error": error})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "data": None,
            "error": {"code": "VALIDATION_ERROR", "message": "Invalid request data."},
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Never leak stack traces to the client.
    return JSONResponse(
        status_code=500,
        content={"success": False, "data": None, "error": {"code": "INTERNAL_ERROR", "message": "Something went wrong."}},
    )


@app.get("/api/health")
def health():
    return {"success": True, "data": {"status": "ok"}, "error": None}


# Static uploads mount
uploads_root = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_root, exist_ok=True)
os.makedirs(os.path.join(uploads_root, "avatars"), exist_ok=True)
os.makedirs(os.path.join(uploads_root, "attachments"), exist_ok=True)
os.makedirs(os.path.join(uploads_root, "attendance_photos"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_root), name="uploads")

app.include_router(auth.router)
app.include_router(student.router)
app.include_router(teacher.router)
app.include_router(admin.router)
app.include_router(attendance.router)
app.include_router(biometric.router)
app.include_router(support.router)
app.include_router(corrections.router)
app.include_router(announcements.router)
app.include_router(notifications.router)
app.include_router(profile.router)
