# SKAGATA ATTENDANCE

**Smart Attendance System for School**

An educational/demo QR-based attendance system for SMKN 3 Yogyakarta, built with
React + FastAPI. Uses **dummy/fictional data only** — no real student data.

> Educational Demo • Use with authorized school data only

---

## 1. Overview

SKAGATA ATTENDANCE lets teachers create timed attendance sessions and generate a
secure QR code; students scan it to check in. All sensitive validation (time
window, duplicate prevention, token authenticity, optional GPS) happens **server
side** — the frontend never decides whether attendance is valid.

Three roles are supported: **Student**, **Teacher**, **Admin**, each with its own
dashboard and permissions.

## 2. Features

- Role-based login (JWT) for Student / Teacher / Admin
- Teacher-created attendance sessions with secure, signed, time-boxed QR tokens
- Anti-duplicate attendance (DB unique constraint + app-level check)
- Automatic Present/Late detection based on a configurable late threshold
- Optional GPS radius validation (secondary signal, not the sole gatekeeper)
- Optional fingerprint / Face ID verification via WebAuthn (per-session toggle)
- Optional photo proof captured at check-in (per-session toggle)
- Live attendance monitor (polling) while a session is open
- Student dashboard, schedule, and attendance history with charts
- Admin CRUD for students, teachers, classes, subjects, schedules
- Attendance reports with filters and CSV export
- Dark, responsive, mobile-first UI
- Demo data seed script (dummy names only)

### 2.1 Fingerprint / Face ID (WebAuthn) — how it actually works

Browsers do not let web pages read raw fingerprint sensor data — no site
should ever ask for that, since it can't be revoked if leaked. Instead this
project uses **WebAuthn**, the W3C/FIDO standard already built into every
modern phone and browser:

1. A student **enrolls once** (`/student/biometric`): the device creates a
   fresh public/private key pair inside its secure hardware, unlocked by the
   fingerprint/Face ID/PIN. Only the **public** key is sent to the server.
2. At check-in, if the teacher enabled "Require fingerprint/Face ID" for that
   session, the browser asks the OS to unlock the same key with a fresh
   fingerprint/Face ID scan and signs a server-issued random challenge.
3. The backend verifies that signature against the stored public key
   (`app/services/webauthn_service.py`). A valid signature can only have been
   produced by that specific enrolled device being unlocked biometrically —
   the fingerprint image itself never leaves the device or touches this
   system.

This is why "sidik jari" here means *biometric-gated device authentication*,
not fingerprint image capture/storage — the latter isn't possible from a
website, and wouldn't be safe to build even if it were.

### 2.2 Photo proof

When enabled for a session, the student's front camera opens right before
submitting attendance; the captured JPEG is uploaded alongside the QR/GPS
data and stored on disk (`backend/uploads/attendance_photos/`, never in the
database). Only the student who took it, the session's teacher, or an admin
can view it (`GET /api/attendance/records/{id}/photo`).

## 3. Architecture

```
React (Vite/TS/Tailwind)
        │  HTTPS / JSON
        ▼
   FastAPI (routers)
        │
        ▼
  Service Layer (attendance rules, QR signing, geo distance)
        │
        ▼
   SQLAlchemy ORM
        │
        ▼
  SQLite (dev) / PostgreSQL (prod)
```

## 4. Tech Stack

**Frontend:** React, Vite, TypeScript, Tailwind CSS, React Router, Recharts,
lucide-react, html5-qrcode (scanning), qrcode.react (display), axios

**Backend:** Python, FastAPI, SQLAlchemy, Pydantic, python-jose (JWT),
passlib/bcrypt, cbor2 + cryptography (WebAuthn signature/key parsing)

**Database:** SQLite for local dev; swap `DATABASE_URL` for PostgreSQL in
production (SQLAlchemy makes this a config change, not a code change).

## 5. Project Structure

```
skagata-attendance/
├── frontend/
│   └── src/{api,components,pages,layouts,hooks,types,context}
├── backend/
│   └── app/{core,database,models,schemas,routers,services,utils}
├── tests/
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 6. Installation — Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt --break-system-packages   # or drop the flag outside a managed env
cp .env.example .env            # then edit secrets as needed

# Seed demo data (wipes and recreates all tables)
python -m app.database.seed

# Run
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`. Check `http://localhost:8000/api/health`.

## 7. Installation — Frontend

```bash
cd frontend
cp .env.example .env    # set VITE_API_URL if backend isn't on localhost:8000
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## 8. Environment Variables

**backend/.env**

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLAlchemy connection string (SQLite by default) |
| `JWT_SECRET` | Secret for signing login tokens — change in production |
| `JWT_ALGORITHM` | Default `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Login session length |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `SCHOOL_LATITUDE` / `SCHOOL_LONGITUDE` | Placeholder demo coordinates — **not a real school location** |
| `MAX_ATTENDANCE_RADIUS_METERS` | GPS validation radius |
| `QR_TOKEN_SECRET` | Secret for signing QR attendance tokens — change in production |
| `BIOMETRIC_RP_ID` | Bare domain the frontend runs on (WebAuthn "Relying Party" — e.g. `localhost` or `skagata.netlify.app`) |
| `BIOMETRIC_ORIGINS` | Comma-separated full origins the frontend is served from |
| `BIOMETRIC_TOKEN_SECRET` / `BIOMETRIC_TOKEN_TTL_SECONDS` | Secret + lifetime for the short-lived proof token issued after a successful fingerprint/Face ID check |
| `UPLOAD_DIR` / `MAX_PHOTO_SIZE_MB` | Where proof photos are stored and the max upload size |

**frontend/.env**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |

## 9. Demo Accounts

| Role | Username | Password |
|---|---|---|
| Student | `student01` | `demo123` |
| Teacher | `teacher01` | `demo123` |
| Admin | `admin` | `demo123` |

**Do not use these credentials in a real deployment.**

## 10. Database

Tables are created automatically on backend startup (`Base.metadata.create_all`).
For a real production rollout, replace this with proper Alembic migrations.

Key models: `User`, `Student`, `Teacher`, `SchoolClass`, `Subject`, `Schedule`,
`AttendanceSession`, `AttendanceRecord` (unique constraint on
`student_id + attendance_session_id` prevents duplicate check-ins).

## 11. API Summary

```
POST   /api/auth/login
GET    /api/auth/me

GET    /api/student/dashboard
GET    /api/student/schedule
GET    /api/student/attendance

POST   /api/attendance/session
GET    /api/attendance/session/{id}
GET    /api/attendance/session/{id}/qr
GET    /api/attendance/session/{id}/records
POST   /api/attendance/scan
PUT    /api/attendance/records/{id}/status

GET    /api/teacher/dashboard
GET    /api/teacher/sessions

GET    /api/admin/dashboard
GET|POST|PUT|DELETE /api/admin/students[/{id}]
GET|POST|DELETE      /api/admin/teachers[/{id}]
GET|POST             /api/admin/classes
GET|POST             /api/admin/subjects
GET|POST             /api/admin/schedules
GET                  /api/admin/reports  (?format=csv for export)

GET    /api/health
```

Every response follows:
```json
{ "success": true, "data": { ... }, "error": null }
```
or
```json
{ "success": false, "data": null, "error": { "code": "...", "message": "..." } }
```

## 12. Testing

```bash
pip install pytest --break-system-packages
cd skagata-attendance
pytest tests -v
```

Covers: login (success/failure), role-based authorization, session creation,
QR expiry against an already-ended session, and duplicate-attendance
rejection.

## 13. Deployment — Railway (backend)

1. Push this repo to GitHub.
2. Create a new Railway project → **Deploy from GitHub repo**, pick `backend/`
   as the root (or use the provided `Dockerfile`).
3. Set environment variables in Railway's dashboard (`JWT_SECRET`,
   `QR_TOKEN_SECRET`, `DATABASE_URL`, `CORS_ORIGINS`, etc.) — for production,
   attach a Railway PostgreSQL plugin and point `DATABASE_URL` at it.
4. Railway provides `$PORT` automatically; the Dockerfile already runs
   `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`.
5. Deploy, then confirm `https://<your-app>.up.railway.app/api/health` returns
   `{"success": true, ...}`.
6. Run the seed script once via Railway's shell/console if you want demo data
   in the deployed database.

## 14. Deployment — Netlify (frontend)

1. Push to GitHub, then in Netlify: **Add new site → Import from Git**.
2. Build command: `npm run build`, publish directory: `dist` (already set in
   `netlify.toml`).
3. Set `VITE_API_URL` in Netlify's environment variables to your Railway
   backend URL — never hardcode it in source.
4. `netlify.toml` includes a catch-all redirect to `index.html` so React
   Router routes don't 404 on refresh.

## 15. Security Notes

- Passwords are hashed with bcrypt; plaintext passwords are never stored.
- JWT auth with role-based route guards on every protected endpoint.
- QR attendance tokens are HMAC-signed, carry a per-session random nonce,
  and expire at the session's actual end time — not a fixed/guessable ID.
- Every scan re-validates live against the database (session status, class
  match, duplicate check) rather than trusting the token payload alone.
- Basic rate limiting on the scan endpoint.
- CORS is restricted to configured origins.
- No stack traces are ever returned to the client.

## 16. Privacy

- All names, IDs, and coordinates in this repo are fictional/demo data.
- GPS coordinates are only used at the moment of scanning (for optional
  radius validation) and are stored alongside the resulting attendance
  record for audit purposes — no continuous location tracking occurs.
- Students only see their own data; teachers see their own sessions/classes;
  only admins see cross-class data.

## 17. Limitations

- SQLite is fine for a demo/single-instance deployment; use PostgreSQL for
  concurrent production use.
- Live monitoring uses polling (every ~4s), not WebSockets, to keep the stack
  simple — swap in WebSockets/SSE if you need lower latency at scale.
- No email/SMS notifications, password reset flow, or multi-school tenancy —
  out of scope for this educational build.
- GPS accuracy from mobile browsers varies; treat it as a secondary signal.

---

Footer: **Educational Demo • Use with authorized school data only**
