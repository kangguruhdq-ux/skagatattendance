import { client, apiCall } from "./client";
import type {
  TeacherDashboard,
  SessionOut,
  AttendanceRecordOut,
  SubjectRow,
  TeacherProfile,
} from "../types";

// ============================================================
// TEACHER DASHBOARD
// ============================================================

export function getTeacherDashboard() {
  return apiCall<TeacherDashboard>(
    client.get("/api/teacher/dashboard")
  );
}

// ============================================================
// TEACHER SESSIONS
// ============================================================

export function getMySessions() {
  return apiCall<{ sessions: any[] }>(
    client.get("/api/teacher/sessions")
  );
}

// ============================================================
// TEACHER SUBJECTS
// ============================================================

export function getSubjects() {
  return apiCall<{ subjects: SubjectRow[] }>(
    client.get("/api/teacher/subjects")
  );
}

// ============================================================
// TEACHER CLASSES
// ============================================================

export function getClasses() {
  return apiCall<{ classes: any[] }>(
    client.get("/api/teacher/classes")
  );
}

// ============================================================
// CREATE ATTENDANCE SESSION
// ============================================================

export interface CreateSessionPayload {
  subject_id: number;
  class_id: number;
  date: string;
  start_time: string;
  end_time: string;
  late_threshold_minutes: number;
  require_gps: boolean;
  require_photo: boolean;
  require_biometric: boolean;
}

export function createSession(
  payload: CreateSessionPayload
) {
  return apiCall<SessionOut>(
    client.post("/api/attendance/session", payload)
  );
}

// ============================================================
// SESSION QR
// ============================================================

export function getSessionQr(sessionId: number) {
  return apiCall<{
    session_id: number;
    token: string;
    expires_at: string;
  }>(
    client.get(
      `/api/attendance/session/${sessionId}/qr`
    )
  );
}

// ============================================================
// SESSION ATTENDANCE RECORDS
// ============================================================

export function getSessionRecords(sessionId: number) {
  return apiCall<{
    session: SessionOut;
    records: AttendanceRecordOut[];
  }>(
    client.get(
      `/api/attendance/session/${sessionId}/records`
    )
  );
}

// ============================================================
// UPDATE ATTENDANCE RECORD STATUS
// ============================================================

export function updateRecordStatus(
  recordId: number,
  status: string,
  reason: string
) {
  return apiCall(
    client.put(
      `/api/attendance/records/${recordId}/status`,
      {
        status,
        reason,
      }
    )
  );
}

// ============================================================
// ATTENDANCE PHOTO
// ============================================================

/**
 * Fetches a check-in proof photo as an authenticated blob URL.
 *
 * <img src=""> cannot directly send an Authorization header,
 * therefore the photo is fetched manually and converted
 * into a temporary browser URL.
 */
export async function fetchRecordPhotoUrl(
  recordId: number
): Promise<string> {
  const res = await client.get(
    `/api/attendance/records/${recordId}/photo`,
    {
      responseType: "blob",
    }
  );

  return URL.createObjectURL(res.data);
}

// ============================================================
// REVIEW ATTENDANCE PHOTO (APPROVE / REJECT)
// ============================================================

export function reviewPhoto(
  recordId: number,
  status: "approved" | "rejected",
  reason?: string
) {
  return apiCall<{
    id: number;
    photo_status: string;
    photo_reviewed_by: number;
    photo_reviewed_at: string | null;
    photo_rejection_reason: string | null;
  }>(
    client.post(`/api/teacher/records/${recordId}/review-photo`, {
      status,
      reason,
    })
  );
}

// ============================================================
// UPDATE & CANCEL TEACHER SESSION
// ============================================================

export function updateTeacherSession(
  sessionId: number,
  payload: { end_time?: string; late_threshold_minutes?: number }
) {
  return apiCall<{
    id: number;
    start_time: string;
    end_time: string;
    late_threshold_minutes: number;
  }>(
    client.put(`/api/teacher/sessions/${sessionId}`, payload)
  );
}

export function cancelTeacherSession(sessionId: number) {
  return apiCall<{ id: number; deleted: boolean }>(
    client.delete(`/api/teacher/sessions/${sessionId}`)
  );
}

export const deleteTeacherSession = cancelTeacherSession;

// ============================================================
// TEACHER PROFILE
// ============================================================

export function getTeacherProfile() {
  return apiCall<TeacherProfile>(
    client.get("/api/teacher/profile")
  );
}

export function updateTeacherProfile(payload: {
  full_name?: string;
  subject_specialty?: string;
}) {
  return apiCall<{
    id: number;
    teacher_code: string;
    full_name: string;
    subject_specialty: string | null;
  }>(
    client.put("/api/teacher/profile", payload)
  );
}

export function getTeacherSchedule() {
  return apiCall<{
    schedules: {
      id: number;
      class_id: number;
      class_name: string;
      subject_id: number;
      subject_name: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      room: string;
    }[];
  }>(client.get("/api/teacher/schedule"));
}

export interface TeacherStudentItem {
  id: number;
  student_code: string;
  full_name: string;
  class_id: number | null;
  class_name: string | null;
  total_attended: number;
  present_count: number;
  late_count: number;
  attendance_rate: number;
}

export function getTeacherStudents(params?: { class_id?: number; search?: string }) {
  return apiCall<{ students: TeacherStudentItem[] }>(
    client.get("/api/teacher/students", { params })
  );
}

export interface TeacherAnalyticsData {
  total_sessions: number;
  total_records: number;
  present_count: number;
  late_count: number;
  excused_count: number;
  sick_count: number;
  absent_count: number;
  attendance_rate: number;
  pending_photos: number;
  class_breakdown: {
    class_id: number;
    class_name: string;
    sessions_count: number;
    attendance_rate: number;
  }[];
}

export function getTeacherAnalytics() {
  return apiCall<TeacherAnalyticsData>(client.get("/api/teacher/analytics"));
}