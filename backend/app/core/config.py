"""
Central application configuration.
Reads from environment variables (.env in local dev).
"""
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "sqlite:///./skagata.db"

    # Auth
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:4173"

    # School location — SMKN 3 Yogyakarta
    SCHOOL_LATITUDE: float = -7.777500
    SCHOOL_LONGITUDE: float = 110.365900
    MAX_ATTENDANCE_RADIUS_METERS: float = 150.0

    # QR session token signing
    QR_TOKEN_SECRET: str = "dev-qr-secret-change-me"

    # WebAuthn (fingerprint/Face ID) biometric verification
    BIOMETRIC_RP_ID: str = "localhost"
    BIOMETRIC_RP_NAME: str = "SKAGATA ATTENDANCE"
    BIOMETRIC_ORIGINS: str = "http://localhost:5173,http://localhost:4173"
    BIOMETRIC_TOKEN_SECRET: str = "dev-biometric-secret-change-me"
    BIOMETRIC_TOKEN_TTL_SECONDS: int = 90

    # File uploads
    UPLOAD_DIR: str = "uploads/attendance_photos"
    UPLOAD_AVATARS_DIR: str = "uploads/avatars"
    UPLOAD_ATTACHMENTS_DIR: str = "uploads/attachments"
    MAX_PHOTO_SIZE_MB: float = 4.0
    MAX_ATTACHMENT_SIZE_MB: float = 5.0

    ENVIRONMENT: str = "development"

    @property
    def biometric_origins_list(self) -> List[str]:
        origins = [o.strip().rstrip("/") for o in self.BIOMETRIC_ORIGINS.split(",") if o.strip()]
        defaults = ["http://localhost:5173", "http://localhost:4173", "http://127.0.0.1:5173", "http://127.0.0.1:4173"]
        for d in defaults:
            if d not in origins:
                origins.append(d)
        return origins

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [o.strip().rstrip("/") for o in self.CORS_ORIGINS.split(",") if o.strip()]
        defaults = ["http://localhost:5173", "http://localhost:4173", "http://127.0.0.1:5173", "http://127.0.0.1:4173"]
        for d in defaults:
            if d not in origins:
                origins.append(d)
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
