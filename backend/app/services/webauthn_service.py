"""
Minimal WebAuthn (FIDO2) implementation for platform-authenticator
(fingerprint / Face ID / device PIN) verification.

Why hand-rolled instead of a wrapper library: the wire format this module
parses (attestationObject / authenticatorData / COSE keys) is a stable,
unambiguous part of the W3C WebAuthn spec, so implementing it directly
against `cbor2` + `cryptography` avoids depending on any particular
third-party library's function signatures.

Scope / honesty about what this does and doesn't do:
  - Attestation statement verification is skipped (we request
    attestation="none", which is standard for "is this person present"
    use cases like this one — we only care about the credential's public
    key, not proving which vendor made the authenticator).
  - Sign-count is tracked but only used to detect a *decreasing* counter
    (a strong signal of a cloned authenticator); many authenticators report
    0 always, so we don't hard-fail on non-increasing counts.
  - For a production deployment handling many schools/devices, swap this
    for a maintained FIDO2 server library and add replay-store persistence
    beyond a single process (see attendance router's in-memory challenge
    store note).
"""
import base64
import hashlib
import io
import json
import os
import secrets
import time
from dataclasses import dataclass
from typing import Optional

import cbor2
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from cryptography.hazmat.primitives.asymmetric import ec, rsa, padding
from cryptography.hazmat.primitives import hashes
from cryptography.exceptions import InvalidSignature

from app.core.config import get_settings

settings = get_settings()

_biometric_token_serializer = URLSafeTimedSerializer(settings.BIOMETRIC_TOKEN_SECRET, salt="biometric-proof")

# In-memory single-use tracking for biometric proof tokens. Fine for a
# single-process demo deployment; use a shared store (e.g. Redis) if you
# run multiple backend instances behind a load balancer.
_consumed_biometric_tokens: set = set()


def issue_biometric_proof_token(student_id: int) -> str:
    return _biometric_token_serializer.dumps({"student_id": student_id, "iat": int(time.time())})


def consume_biometric_proof_token(token: str, expected_student_id: int) -> bool:
    """Returns True iff the token is valid, fresh, belongs to this student,
    and has not already been used for a previous check-in."""
    if token in _consumed_biometric_tokens:
        return False
    try:
        data = _biometric_token_serializer.loads(token, max_age=settings.BIOMETRIC_TOKEN_TTL_SECONDS)
    except (BadSignature, SignatureExpired):
        return False
    if data.get("student_id") != expected_student_id:
        return False
    _consumed_biometric_tokens.add(token)
    return True


class WebAuthnError(Exception):
    pass


# ---------------- base64url helpers ----------------
def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def b64url_decode(data: str) -> bytes:
    padding_needed = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding_needed)


def generate_challenge() -> str:
    return b64url_encode(secrets.token_bytes(32))


# ---------------- option builders (sent to the browser) ----------------
def build_registration_options(user_id: int, username: str, display_name: str, challenge: str, exclude_credential_ids: list):
    return {
        "rp": {"id": settings.BIOMETRIC_RP_ID, "name": settings.BIOMETRIC_RP_NAME},
        "user": {
            "id": b64url_encode(str(user_id).encode()),
            "name": username,
            "displayName": display_name,
        },
        "challenge": challenge,
        "pubKeyCredParams": [
            {"type": "public-key", "alg": -7},    # ES256
            {"type": "public-key", "alg": -257},  # RS256
        ],
        "timeout": 60000,
        "attestation": "none",
        "authenticatorSelection": {
            "authenticatorAttachment": "platform",
            "userVerification": "required",
            "residentKey": "discouraged",
        },
        "excludeCredentials": [{"type": "public-key", "id": cid} for cid in exclude_credential_ids],
    }


def build_authentication_options(challenge: str, allow_credential_ids: list):
    return {
        "rpId": settings.BIOMETRIC_RP_ID,
        "challenge": challenge,
        "timeout": 60000,
        "userVerification": "required",
        "allowCredentials": [{"type": "public-key", "id": cid} for cid in allow_credential_ids],
    }


# ---------------- authData parsing ----------------
@dataclass
class ParsedAuthData:
    rp_id_hash: bytes
    flags: int
    sign_count: int
    credential_id: Optional[bytes]
    credential_public_key_cbor: Optional[bytes]

    @property
    def user_present(self) -> bool:
        return bool(self.flags & 0x01)

    @property
    def user_verified(self) -> bool:
        return bool(self.flags & 0x04)

    @property
    def has_attested_credential_data(self) -> bool:
        return bool(self.flags & 0x40)


def parse_auth_data(auth_data: bytes) -> ParsedAuthData:
    if len(auth_data) < 37:
        raise WebAuthnError("authenticatorData too short.")
    rp_id_hash = auth_data[0:32]
    flags = auth_data[32]
    sign_count = int.from_bytes(auth_data[33:37], "big")

    credential_id = None
    credential_public_key_cbor = None

    if flags & 0x40:  # AT flag: attested credential data present
        # aaguid = auth_data[37:53]  # not needed for this verification
        cred_id_len = int.from_bytes(auth_data[53:55], "big")
        offset = 55
        credential_id = auth_data[offset: offset + cred_id_len]
        offset += cred_id_len
        # Decode exactly one CBOR object (the COSE key) starting at offset,
        # ignoring any trailing extension data that may follow it.
        stream = io.BytesIO(auth_data[offset:])
        decoder = cbor2.CBORDecoder(stream)
        cose_key = decoder.decode()
        consumed = stream.tell()
        credential_public_key_cbor = auth_data[offset: offset + consumed]

    return ParsedAuthData(rp_id_hash, flags, sign_count, credential_id, credential_public_key_cbor)


def _load_cose_public_key(cose_bytes: bytes):
    cose = cbor2.loads(cose_bytes)
    kty = cose[1]
    alg = cose[3]

    if kty == 2:  # EC2
        crv = cose[-1]
        x = int.from_bytes(cose[-2], "big")
        y = int.from_bytes(cose[-3], "big")
        if crv != 1:  # P-256
            raise WebAuthnError("Unsupported EC curve.")
        pub = ec.EllipticCurvePublicNumbers(x, y, ec.SECP256R1()).public_key()
        return ("EC", pub)
    elif kty == 3:  # RSA
        n = int.from_bytes(cose[-1], "big")
        e = int.from_bytes(cose[-2], "big")
        pub = rsa.RSAPublicNumbers(e, n).public_key()
        return ("RSA", pub)
    else:
        raise WebAuthnError("Unsupported public key type.")


def _verify_client_data(client_data_json: bytes, expected_type: str, expected_challenge: str) -> dict:
    try:
        client_data = json.loads(client_data_json)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise WebAuthnError("Malformed clientDataJSON.")

    if client_data.get("type") != expected_type:
        raise WebAuthnError("Unexpected WebAuthn ceremony type.")
    if client_data.get("challenge") != expected_challenge:
        raise WebAuthnError("Challenge mismatch — possible replay attempt.")
    if client_data.get("origin") not in settings.biometric_origins_list:
        raise WebAuthnError("Origin not recognized.")
    return client_data


def verify_registration(
    client_data_json_b64: str,
    attestation_object_b64: str,
    expected_challenge: str,
) -> dict:
    """Returns {"credential_id": str, "public_key_cose_b64": str, "sign_count": int}"""
    client_data_json = b64url_decode(client_data_json_b64)
    _verify_client_data(client_data_json, "webauthn.create", expected_challenge)

    attestation_object = cbor2.loads(b64url_decode(attestation_object_b64))
    auth_data_bytes = attestation_object["authData"]
    parsed = parse_auth_data(auth_data_bytes)

    expected_rp_hash = hashlib.sha256(settings.BIOMETRIC_RP_ID.encode()).digest()
    if parsed.rp_id_hash != expected_rp_hash:
        raise WebAuthnError("RP ID hash mismatch.")
    if not parsed.user_present:
        raise WebAuthnError("User presence flag not set.")
    if not parsed.user_verified:
        raise WebAuthnError("Biometric/PIN verification was not performed on this device.")
    if not parsed.credential_id or not parsed.credential_public_key_cbor:
        raise WebAuthnError("No credential data in attestation.")

    # This will raise if the COSE key is malformed/unsupported.
    _load_cose_public_key(parsed.credential_public_key_cbor)

    return {
        "credential_id": b64url_encode(parsed.credential_id),
        "public_key_cose_b64": base64.b64encode(parsed.credential_public_key_cbor).decode("ascii"),
        "sign_count": parsed.sign_count,
    }


def verify_authentication(
    client_data_json_b64: str,
    authenticator_data_b64: str,
    signature_b64: str,
    expected_challenge: str,
    stored_public_key_cose_b64: str,
    stored_sign_count: int,
) -> int:
    """Returns the new sign_count to persist. Raises WebAuthnError on failure."""
    client_data_json = b64url_decode(client_data_json_b64)
    _verify_client_data(client_data_json, "webauthn.get", expected_challenge)

    auth_data_bytes = b64url_decode(authenticator_data_b64)
    parsed = parse_auth_data(auth_data_bytes)

    expected_rp_hash = hashlib.sha256(settings.BIOMETRIC_RP_ID.encode()).digest()
    if parsed.rp_id_hash != expected_rp_hash:
        raise WebAuthnError("RP ID hash mismatch.")
    if not parsed.user_present:
        raise WebAuthnError("User presence flag not set.")
    if not parsed.user_verified:
        raise WebAuthnError("Biometric/PIN verification was not performed on this device.")

    if parsed.sign_count != 0 and stored_sign_count != 0 and parsed.sign_count <= stored_sign_count:
        raise WebAuthnError("Signature counter did not increase — possible cloned authenticator.")

    cose_bytes = base64.b64decode(stored_public_key_cose_b64)
    kind, public_key = _load_cose_public_key(cose_bytes)

    signed_data = auth_data_bytes + hashlib.sha256(client_data_json).digest()
    signature = b64url_decode(signature_b64)

    try:
        if kind == "EC":
            public_key.verify(signature, signed_data, ec.ECDSA(hashes.SHA256()))
        else:
            public_key.verify(signature, signed_data, padding.PKCS1v15(), hashes.SHA256())
    except InvalidSignature:
        raise WebAuthnError("Signature verification failed.")

    return parsed.sign_count
