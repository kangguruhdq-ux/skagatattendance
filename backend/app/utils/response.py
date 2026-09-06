"""
Helpers to keep every API response in the shape:
  { "success": bool, "data": {...} | null, "error": {code, message} | null }
Stack traces are never exposed to the client.
"""
from fastapi import HTTPException


class ApiException(HTTPException):
    """Raise this anywhere in routers/services for a controlled, JSON-shaped error."""

    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(status_code=status_code, detail={"code": code, "message": message})


def ok(data=None):
    return {"success": True, "data": data, "error": None}
