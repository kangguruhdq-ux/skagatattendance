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

    # School location (demo/placeholder values — override in real deployment)
    SCHOOL_LATITUDE: float = -7.797068
    SCHOOL_LONGITUDE: float = 110.370529
    MAX_ATTENDANCE_RADIUS_METERS: float = 150

    # QR session token signing
    QR_TOKEN_SECRET: str = "dev-qr-secret-change-me"

    # WebAuthn (fingerprint/Face ID) biometric verification
    # RP_ID must be the bare domain the frontend is served from (no scheme/port),
    # e.g. "localhost" for local dev, "skagata-attendance.netlify.app" in production.
    BIOMETRIC_RP_ID: str = "localhost"
    BIOMETRIC_RP_NAME: str = "SKAGATA ATTENDANCE"
    # Full origin(s) the browser will report in clientDataJSON — comma separated.
    BIOMETRIC_ORIGINS: str = "http://localhost:5173,http://localhost:4173"
    # Short-lived token proving a biometric check just passed, consumed by /scan.
    BIOMETRIC_TOKEN_SECRET: str = "dev-biometric-secret-change-me"
    BIOMETRIC_TOKEN_TTL_SECONDS: int = 90

    # Photo proof upload
    UPLOAD_DIR: str = "uploads/attendance_photos"
    MAX_PHOTO_SIZE_MB: float = 4.0

    ENVIRONMENT: str = "development"

    @property
    def biometric_origins_list(self) -> List[str]:
        return [o.strip() for o in self.BIOMETRIC_ORIGINS.split(",") if o.strip()]

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
