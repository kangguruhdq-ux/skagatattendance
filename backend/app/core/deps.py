from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database.db import get_db
from app.models.models import User
from app.utils.response import ApiException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    if not token:
        raise ApiException(401, "NOT_AUTHENTICATED", "Authentication required.")
    try:
        payload = decode_access_token(token)
    except ValueError:
        raise ApiException(401, "INVALID_TOKEN", "Invalid or expired token.")

    user = db.query(User).filter(User.username == payload.get("sub")).first()
    if not user or not user.is_active:
        raise ApiException(401, "INVALID_TOKEN", "Invalid or expired token.")
    return user


def require_role(*roles: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise ApiException(403, "FORBIDDEN", "You do not have permission to access this resource.")
        return user
    return checker
