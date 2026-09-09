"""
Master test suite for SKAGATA Attendance upgrade.
Validates:
1. System Settings & Geofence (SMKN 3 Yogyakarta)
2. Support Ticket Conversation & Role Ownership Security
3. Attendance Correction Lifecycle
4. Announcements & Notification Dispatch
5. Profile & Settings
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_access_token
from app.database.db import SessionLocal
from app.models.models import User, Student, Teacher, RoleEnum

client = TestClient(app)


def test_school_location_settings():
    # Admin token
    db = SessionLocal()
    admin_user = db.query(User).filter(User.role == RoleEnum.admin).first()
    db.close()
    assert admin_user is not None

    token = create_access_token(subject=admin_user.username, role="admin")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/settings", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    loc = data["data"]["school_location"]
    assert loc["latitude"] == -7.7775
    assert loc["longitude"] == 110.3659
    assert loc["enabled"] is True


def test_support_ticket_lifecycle_and_security():
    db = SessionLocal()
    students = db.query(User).filter(User.role == RoleEnum.student, User.is_active == True).all()
    assert len(students) >= 2, "Need at least 2 students for security check"
    st1, st2 = students[0], students[1]
    admin = db.query(User).filter(User.role == RoleEnum.admin).first()
    db.close()

    token_st1 = create_access_token(subject=st1.username, role="student")
    token_st2 = create_access_token(subject=st2.username, role="student")
    token_admin = create_access_token(subject=admin.username, role="admin")

    h_st1 = {"Authorization": f"Bearer {token_st1}"}
    h_st2 = {"Authorization": f"Bearer {token_st2}"}
    h_admin = {"Authorization": f"Bearer {token_admin}"}

    # 1. Student 1 creates a ticket
    res = client.post(
        "/api/support/tickets",
        headers=h_st1,
        data={
            "subject": "Kendala GPS Lapangan",
            "category": "GPS",
            "priority": "HIGH",
            "description": "GPS tidak mendeteksi lokasi di area bengkel mesin.",
        },
    )
    assert res.status_code == 200
    ticket = res.json()["data"]
    ticket_id = ticket["id"]
    assert ticket["status"] == "OPEN"
    assert ticket["priority"] == "HIGH"
    assert ticket["user_id"] == st1.id
    assert len(ticket["messages"]) == 1

    # 2. Security Check: Student 2 MUST NOT be able to view Student 1's ticket
    res_sec = client.get(f"/api/support/tickets/{ticket_id}", headers=h_st2)
    assert res_sec.status_code in (403, 404), "Unauthorized user must not view ticket"

    # 3. Admin views ticket
    res_adm = client.get(f"/api/support/tickets/{ticket_id}", headers=h_admin)
    assert res_adm.status_code == 200

    # 4. Admin replies to ticket
    res_rep = client.post(
        f"/api/support/tickets/{ticket_id}/messages",
        headers=h_admin,
        data={"message": "Halo, pastikan GPS berakurasi tinggi aktif dan coba restart browser."},
    )
    assert res_rep.status_code == 200
    updated_ticket = res_rep.json()["data"]
    assert len(updated_ticket["messages"]) == 2
    assert updated_ticket["status"] == "IN_PROGRESS"

    # 5. Student 1 receives notification and replies
    res_notif = client.get("/api/notifications", headers=h_st1)
    assert res_notif.status_code == 200
    assert len(res_notif.json()["data"]["notifications"]) > 0

    res_user_rep = client.post(
        f"/api/support/tickets/{ticket_id}/messages",
        headers=h_st1,
        data={"message": "Baik pak, setelah restart sudah normal. Terima kasih!"},
    )
    assert res_user_rep.status_code == 200

    # 6. Admin resolves and closes ticket
    res_res = client.patch(
        f"/api/support/tickets/{ticket_id}/status",
        headers=h_admin,
        data={"status": "RESOLVED"},
    )
    assert res_res.status_code == 200
    assert res_res.json()["data"]["status"] == "RESOLVED"

    # 7. Admin soft delete and restore
    res_del = client.delete(f"/api/support/tickets/{ticket_id}", headers=h_admin)
    assert res_del.status_code == 200

    # Normal list should not show it
    res_list = client.get("/api/support/tickets", headers=h_st1)
    ticket_ids = [t["id"] for t in res_list.json()["data"]["tickets"]]
    assert ticket_id not in ticket_ids

    # Restore ticket
    res_restore = client.post(f"/api/support/tickets/{ticket_id}/restore", headers=h_admin)
    assert res_restore.status_code == 200


def test_attendance_corrections_flow():
    db = SessionLocal()
    st = db.query(User).filter(User.role == RoleEnum.student).first()
    admin = db.query(User).filter(User.role == RoleEnum.admin).first()
    db.close()

    token_st = create_access_token(subject=st.username, role="student")
    token_admin = create_access_token(subject=admin.username, role="admin")

    h_st = {"Authorization": f"Bearer {token_st}"}
    h_admin = {"Authorization": f"Bearer {token_admin}"}

    # Submit correction
    res = client.post(
        "/api/corrections",
        headers=h_st,
        data={
            "date": "2026-09-08",
            "target_status": "present",
            "reason": "Kamera error saat sesi berlangsung",
            "explanation": "Sudah hadir di kelas tapi kamera web browser crash saat scan.",
        },
    )
    assert res.status_code == 200
    corr = res.json()["data"]
    corr_id = corr["id"]
    assert corr["status"] == "PENDING"

    # Admin reviews and approves
    res_rev = client.post(
        f"/api/corrections/{corr_id}/review",
        headers=h_admin,
        data={
            "decision": "APPROVED",
            "review_notes": "Telah diverifikasi hadir di ruang kelas oleh guru.",
        },
    )
    assert res_rev.status_code == 200
    assert res_rev.json()["data"]["status"] == "APPROVED"


def test_system_status_and_activity_logs():
    db = SessionLocal()
    admin = db.query(User).filter(User.role == RoleEnum.admin).first()
    db.close()

    token_admin = create_access_token(subject=admin.username, role="admin")
    h_admin = {"Authorization": f"Bearer {token_admin}"}

    res = client.get("/api/admin/system-status", headers=h_admin)
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "operational"

    res_logs = client.get("/api/admin/activity-logs", headers=h_admin)
    assert res_logs.status_code == 200
    assert len(res_logs.json()["data"]["logs"]) > 0


def test_teacher_students_and_analytics():
    db = SessionLocal()
    teacher_user = db.query(User).filter(User.role == RoleEnum.teacher).first()
    db.close()
    assert teacher_user is not None

    token_teacher = create_access_token(subject=teacher_user.username, role="teacher")
    h_teacher = {"Authorization": f"Bearer {token_teacher}"}

    # Test teacher students roster
    res_students = client.get("/api/teacher/students", headers=h_teacher)
    assert res_students.status_code == 200
    assert "students" in res_students.json()["data"]

    # Test teacher analytics
    res_analytics = client.get("/api/teacher/analytics", headers=h_teacher)
    assert res_analytics.status_code == 200
    analytics_data = res_analytics.json()["data"]
    assert "attendance_rate" in analytics_data
    assert "class_breakdown" in analytics_data


def test_announcements_and_profile():
    db = SessionLocal()
    admin = db.query(User).filter(User.role == RoleEnum.admin).first()
    st = db.query(User).filter(User.role == RoleEnum.student).first()
    db.close()

    token_admin = create_access_token(subject=admin.username, role="admin")
    token_st = create_access_token(subject=st.username, role="student")
    h_admin = {"Authorization": f"Bearer {token_admin}"}
    h_st = {"Authorization": f"Bearer {token_st}"}

    # Admin creates announcement
    res_create = client.post(
        "/api/announcements",
        headers=h_admin,
        data={
            "title": "Ujian Akhir Semester Gasal",
            "content": "Pelaksanaan ujian dimulai hari Senin pukul 07.30 WIB di ruang kelas masing-masing.",
            "category": "Ujian",
            "target_role": "ALL",
        },
    )
    assert res_create.status_code == 200
    ann_id = res_create.json()["data"]["id"]

    # Student reads announcements
    res_read = client.get("/api/announcements", headers=h_st)
    assert res_read.status_code == 200
    ids = [a["id"] for a in res_read.json()["data"]["announcements"]]
    assert ann_id in ids

    # Profile test
    res_prof = client.get("/api/profile", headers=h_st)
    assert res_prof.status_code == 200
    prof = res_prof.json()["data"]
    assert prof["role"] == "student"
    assert "student_info" in prof


if __name__ == "__main__":
    print("Running tests...")
    test_school_location_settings()
    print("[OK] School location settings OK")
    test_support_ticket_lifecycle_and_security()
    print("[OK] Support ticket lifecycle & security OK")
    test_attendance_corrections_flow()
    print("[OK] Attendance corrections flow OK")
    test_system_status_and_activity_logs()
    print("[OK] System status & activity logs OK")
    test_teacher_students_and_analytics()
    print("[OK] Teacher students roster & analytics OK")
    test_announcements_and_profile()
    print("[OK] Announcements & profile OK")
    print("ALL MASTER BACKEND TESTS PASSED!")

