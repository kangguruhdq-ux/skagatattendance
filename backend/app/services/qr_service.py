"""
Secure attendance-session token generation & verification.

Design goals (per spec):
  - token is NOT just `student_id` or a raw session id
  - random, signed, has an expiration, hard to guess/forge
  - the frontend/QR image never carries anything the backend blindly trusts;
    every scan is re-validated server-side against the DB session state

Token payload:
  { "session_id": int, "nonce": str (per-session random, stored in DB),
    "iat": unix_ts, "exp": unix_ts }

Signed with itsdangerous.URLSafeSerializer (HMAC), so tampering invalidates
the signature immediately. Expiry is enforced independently against the
`exp` field so a session's QR is only ever valid until the *session's own*
end time (not a fixed TTL), and re-checked against live DB session state
(status not_started/active/expired) on every scan.
"""
import secrets
import time
from typing import Optional

from itsdangerous import URLSafeSerializer, BadSignature

from app.core.config import get_settings

settings = get_settings()
_serializer = URLSafeSerializer(settings.QR_TOKEN_SECRET, salt="attendance-qr")


def generate_session_nonce() -> str:
    return secrets.token_urlsafe(24)


def issue_qr_token(session_id: int, nonce: str, expires_at_ts: int) -> str:
    payload = {
        "session_id": session_id,
        "nonce": nonce,
        "iat": int(time.time()),
        "exp": expires_at_ts,
    }
    return _serializer.dumps(payload)


def verify_qr_token(token: str) -> Optional[dict]:
    """Returns the decoded payload if signature is valid, else None.
    Expiry (exp vs now) must still be checked by the caller against the
    live session state, since QR expiry is tied to session end time."""
    try:
        payload = _serializer.loads(token)
    except BadSignature:
        return None
    if not isinstance(payload, dict) or "session_id" not in payload or "nonce" not in payload:
        return None
    return payload
