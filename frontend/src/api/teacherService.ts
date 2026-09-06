import { client, apiCall } from "./client";
import type {
  TeacherDashboard,
  SessionOut,
  AttendanceRecordOut,
  SubjectRow,
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