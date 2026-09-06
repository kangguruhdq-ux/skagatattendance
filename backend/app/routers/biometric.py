"""
Endpoints for enrolling and verifying a student's platform biometric
(fingerprint / Face ID / device PIN) via WebAuthn.

Flow used by the frontend during a scan:
  1. POST /register/options (once, during enrollment) -> browser calls
     navigator.credentials.create() -> POST /register/verify
  2. POST /authenticate/options (every check-in) -> browser calls
     navigator.credentials.get() -> POST /authenticate/verify, which
     returns a short-lived `biometric_token` to include in /attendance/scan
"""
import time

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.database.db import get_db
from app.models.models import BiometricCredential, User
from app.services import webauthn_service as wa
from app.utils.response import ok, ApiException

router = APIRouter(prefix="/api/biometric", tags=["biometric"])

CHALLENGE_TTL_SECONDS = 120
# In-memory challenge store keyed by student_id. Single-process demo scope —
# see webauthn_service's note on scaling this to multiple instances.
_challenges: dict = {}


def _store_challenge(student_id: int, challenge: str, purpose: str):
    _challenges[(student_id, purpose)] = (challenge, time.time())


def _pop_challenge(student_id: int, purpose: str) -> str:
    entry = _challenges.pop((student_id, purpose), None)
    if not entry:
        raise ApiException(400, "NO_CHALLENGE", "No pending challenge — please try again.")
    challenge, issued_at = entry
    if time.time() - issued_at > CHALLENGE_TTL_SECONDS:
        raise ApiException(400, "CHALLENGE_EXPIRED", "This request timed out — please try again.")
    return challenge


def _get_student(user: User):
    if not user.student_profile:
        raise ApiException(400, "STUDENT_PROFILE_MISSING", "No student profile linked to this account.")
    return user.student_profile


@router.get("/status")
def biometric_status(db: Session = Depends(get_db), user: User = Depends(require_role("student"))):
    student = _get_student(user)
    creds = db.query(BiometricCredential).filter(BiometricCredential.student_id == student.id).all()
    return ok({
        "enrolled": len(creds) > 0,
        "devices": [{"id": c.id, "label": c.device_label, "created_at": c.created_at.isoformat()} for c in creds],
    })


@router.post("/register/options")
def register_options(db: Session = Depends(get_db), user: User = Depends(require_role("student"))):
    student = _get_student(user)
    challenge = wa.generate_challenge()
    _store_challenge(student.id, challenge, "register")

    existing = db.query(BiometricCredential).filter(BiometricCredential.student_id == student.id).all()
    options = wa.build_registration_options(
        user_id=user.id,
        username=user.username,
        display_name=student.full_name,
        challenge=challenge,
        exclude_credential_ids=[c.credential_id for c in existing],
    )
    return ok(options)


@router.post("/register/verify")
def register_verify(payload: dict, db: Session = Depends(get_db), user: User = Depends(require_role("student"))):
    student = _get_student(user)
    challenge = _pop_challenge(student.id, "register")

    response = payload.get("response", {})
    try:
        result = wa.verify_registration(
            client_data_json_b64=response.get("clientDataJSON", ""),
            attestation_object_b64=response.get("attestationObject", ""),
            expected_challenge=challenge,
        )
    except wa.WebAuthnError as e:
        raise ApiException(400, "BIOMETRIC_REGISTRATION_FAILED", str(e))

    if db.query(BiometricCredential).filter(BiometricCredential.credential_id == result["credential_id"]).first():
        raise ApiException(400, "CREDENTIAL_ALREADY_REGISTERED", "This device is already registered.")

    cred = BiometricCredential(
        student_id=student.id,
        credential_id=result["credential_id"],
        public_key_cose=result["public_key_cose_b64"],
        sign_count=result["sign_count"],
        device_label=payload.get("device_label") or "This device",
    )
    db.add(cred)
    db.commit()
    return ok({"enrolled": True, "credential_id": cred.credential_id})


@router.post("/authenticate/options")
def authenticate_options(db: Session = Depends(get_db), user: User = Depends(require_role("student"))):
    student = _get_student(user)
    creds = db.query(BiometricCredential).filter(BiometricCredential.student_id == student.id).all()
    if not creds:
        raise ApiException(400, "NOT_ENROLLED", "No fingerprint/Face ID registered yet. Please enroll first.")

    challenge = wa.generate_challenge()
    _store_challenge(student.id, challenge, "authenticate")
    options = wa.build_authentication_options(challenge, [c.credential_id for c in creds])
    return ok(options)


@router.post("/authenticate/verify")
def authenticate_verify(payload: dict, db: Session = Depends(get_db), user: User = Depends(require_role("student"))):
    student = _get_student(user)
    challenge = _pop_challenge(student.id, "authenticate")

    credential_id = payload.get("id")
    cred = db.query(BiometricCredential).filter(BiometricCredential.credential_id == credential_id).first()
    if not cred or cred.student_id != student.id:
        raise ApiException(400, "UNKNOWN_CREDENTIAL", "This device is not registered to your account.")

    response = payload.get("response", {})
    try:
        new_sign_count = wa.verify_authentication(
            client_data_json_b64=response.get("clientDataJSON", ""),
            authenticator_data_b64=response.get("authenticatorData", ""),
            signature_b64=response.get("signature", ""),
            expected_challenge=challenge,
            stored_public_key_cose_b64=cred.public_key_cose,
            stored_sign_count=cred.sign_count,
        )
    except wa.WebAuthnError as e:
        raise ApiException(401, "BIOMETRIC_VERIFICATION_FAILED", str(e))

    cred.sign_count = new_sign_count
    db.commit()

    proof_token = wa.issue_biometric_proof_token(student.id)
    return ok({"verified": True, "biometric_token": proof_token})
