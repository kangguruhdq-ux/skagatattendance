import { client, apiCall } from "./client";
import type { StudentDashboard, AttendanceHistoryItem, ScheduleItem, ActiveSessionItem } from "../types";

export function getStudentDashboard() {
  return apiCall<StudentDashboard>(client.get("/api/student/dashboard"));
}

export function getStudentActiveSessions() {
  return apiCall<{ sessions: ActiveSessionItem[] }>(client.get("/api/student/active-sessions"));
}

export function getStudentSchedule() {
  return apiCall<{ schedule: ScheduleItem[] }>(client.get("/api/student/schedule"));
}

export function getStudentAttendanceHistory() {
  return apiCall<{ records: AttendanceHistoryItem[] }>(client.get("/api/student/attendance"));
}

export interface ScanPayload {
  token: string;
  latitude?: number;
  longitude?: number;
  biometricToken?: string;
  photoBlob?: Blob;
}

export interface PhotoAttendancePayload {
  sessionId: number;
  photoBlob: Blob;
  latitude?: number;
  longitude?: number;
  biometricToken?: string;
}

export interface AttendanceResult {
  id: number;
  student_name: string;
  subject_name: string | null;
  class_name?: string | null;
  checked_in_at: string;
  status: string;
  location_verified: boolean | null;
  distance_meters?: number | null;
  biometric_verified: boolean;
  has_photo: boolean;
}

export function getScanRequirements(token: string) {
  return apiCall<{
    require_gps: boolean;
    require_photo: boolean;
    require_biometric: boolean;
    status: string;
    subject_name: string;
  }>(client.get("/api/attendance/scan-requirements", { params: { token } }));
}

export function scanAttendance(payload: ScanPayload) {
  const form = new FormData();
  form.append("token", payload.token);
  if (payload.latitude !== undefined) form.append("latitude", String(payload.latitude));
  if (payload.longitude !== undefined) form.append("longitude", String(payload.longitude));
  if (payload.biometricToken) form.append("biometric_token", payload.biometricToken);
  if (payload.photoBlob) form.append("photo", payload.photoBlob, "attendance.jpg");

  return apiCall<AttendanceResult>(
    client.post("/api/attendance/scan", form, { headers: { "Content-Type": "multipart/form-data" } })
  );
}

export function photoAttendance(payload: PhotoAttendancePayload) {
  const form = new FormData();
  form.append("session_id", String(payload.sessionId));
  form.append("photo", payload.photoBlob, "attendance.jpg");
  if (payload.latitude !== undefined) form.append("latitude", String(payload.latitude));
  if (payload.longitude !== undefined) form.append("longitude", String(payload.longitude));
  if (payload.biometricToken) form.append("biometric_token", payload.biometricToken);

  return apiCall<AttendanceResult>(
    client.post("/api/attendance/photo-checkin", form, { headers: { "Content-Type": "multipart/form-data" } })
  );
}

