import { client, apiCall } from "./client";
import type {
  AdminDashboard,
  StudentRow,
  TeacherRow,
  ClassRow,
  SubjectRow,
  UserRow,
  AdminSessionItem,
  ScheduleRow,
  SessionDetailResponse,
  AdminSessionCreatePayload,
  AdminSessionUpdatePayload,
  ReportRow,
  ReportSummary,
} from "../types";

export function getAdminDashboard() {
  return apiCall<AdminDashboard>(client.get("/api/admin/dashboard"));
}

export function listStudents(search = "", classId?: number) {
  return apiCall<{ students: StudentRow[] }>(
    client.get("/api/admin/students", { params: { search, class_id: classId } })
  );
}

export function createStudent(payload: {
  username: string; password: string; student_code: string; full_name: string; class_id?: number;
}) {
  return apiCall(client.post("/api/admin/students", payload));
}

export function updateStudent(id: number, payload: Partial<{ full_name: string; class_id: number; is_active: boolean }>) {
  return apiCall(client.put(`/api/admin/students/${id}`, payload));
}

export function deleteStudent(id: number) {
  return apiCall(client.delete(`/api/admin/students/${id}`));
}

export function listTeachers() {
  return apiCall<{ teachers: TeacherRow[] }>(client.get("/api/admin/teachers"));
}

export function createTeacher(payload: {
  username: string; password: string; teacher_code: string; full_name: string; subject_specialty?: string;
}) {
  return apiCall(client.post("/api/admin/teachers", payload));
}

export function deleteTeacher(id: number) {
  return apiCall(client.delete(`/api/admin/teachers/${id}`));
}

export function listUsers(params?: { role?: string; search?: string; is_active?: boolean }) {
  return apiCall<{ users: UserRow[] }>(
    client.get("/api/admin/users", { params })
  );
}

export function createUser(payload: {
  username: string;
  password: string;
  role: string;
  full_name: string;
  student_code?: string;
  class_id?: number;
  teacher_code?: string;
  subject_specialty?: string;
}) {
  return apiCall<{ id: number; username: string; role: string }>(
    client.post("/api/admin/users", payload)
  );
}

export function updateUser(
  userId: number,
  payload: Partial<{
    full_name: string;
    role: string;
    is_active: boolean;
    password?: string;
    class_id?: number;
    student_code?: string;
    teacher_code?: string;
    subject_specialty?: string;
  }>
) {
  return apiCall<{ id: number; updated: boolean }>(
    client.put(`/api/admin/users/${userId}`, payload)
  );
}

export function deleteUser(userId: number) {
  return apiCall<{ id: number; deactivated: boolean }>(
    client.delete(`/api/admin/users/${userId}`)
  );
}

export function listClasses() {
  return apiCall<{ classes: ClassRow[] }>(client.get("/api/admin/classes"));
}

export function createClass(payload: { name: string; major?: string; grade?: string; academic_year?: string }) {
  return apiCall(client.post("/api/admin/classes", payload));
}

export function updateClass(id: number, payload: { name?: string; major?: string; grade?: string; academic_year?: string }) {
  return apiCall<{ id: number; name: string }>(client.put(`/api/admin/classes/${id}`, payload));
}

export function deleteClass(id: number) {
  return apiCall<{ id: number; deleted: boolean }>(client.delete(`/api/admin/classes/${id}`));
}

export function listSubjects() {
  return apiCall<{ subjects: SubjectRow[] }>(client.get("/api/admin/subjects"));
}

export function createSubject(payload: { name: string; code?: string }) {
  return apiCall(client.post("/api/admin/subjects", payload));
}

export function updateSubject(id: number, payload: { name?: string; code?: string }) {
  return apiCall<{ id: number; name: string; code: string }>(client.put(`/api/admin/subjects/${id}`, payload));
}

export function deleteSubject(id: number) {
  return apiCall<{ id: number; deleted: boolean }>(client.delete(`/api/admin/subjects/${id}`));
}

// ---- Sessions (Monitoring) ----

export function listAllSessions(params?: {
  date?: string;
  class_id?: number;
  teacher_id?: number;
  subject_id?: number;
  status?: string;
}) {
  return apiCall<{ sessions: AdminSessionItem[] }>(
    client.get("/api/admin/sessions", { params })
  );
}

export function createSession(payload: AdminSessionCreatePayload) {
  return apiCall<{ id: number; created: boolean }>(
    client.post("/api/admin/sessions", payload)
  );
}

export function getSessionDetail(sessionId: number) {
  return apiCall<SessionDetailResponse>(
    client.get(`/api/admin/sessions/${sessionId}`)
  );
}

export function updateSession(sessionId: number, payload: AdminSessionUpdatePayload) {
  return apiCall<{ id: number; updated: boolean }>(
    client.put(`/api/admin/sessions/${sessionId}`, payload)
  );
}

export function deleteSession(sessionId: number) {
  return apiCall<{ id: number; deleted: boolean }>(
    client.delete(`/api/admin/sessions/${sessionId}`)
  );
}

// ---- Reports ----

export function getReportsJson(params: {
  start_date: string;
  end_date: string;
  class_id?: number;
  student_id?: number;
  teacher_id?: number;
  subject_id?: number;
  session_id?: number;
  status?: string;
}) {
  return apiCall<{ rows: ReportRow[]; count: number; summary: ReportSummary }>(
    client.get("/api/admin/reports", { params: { ...params, format: "json" } })
  );
}

export function updateAttendanceRecord(
  recordId: number,
  payload: { status: string; check_in_time?: string; override_reason?: string }
) {
  return apiCall<{ id: number; updated: boolean; status: string; manual_override: boolean }>(
    client.put(`/api/admin/attendance-records/${recordId}`, payload)
  );
}

export function deleteAttendanceRecordAdmin(recordId: number) {
  return apiCall<{ id: number; deleted: boolean }>(
    client.delete(`/api/admin/attendance-records/${recordId}`)
  );
}

export function downloadReportCsv(params: {
  start_date: string;
  end_date: string;
  class_id?: number;
  student_id?: number;
  teacher_id?: number;
  subject_id?: number;
  session_id?: number;
  status?: string;
}) {
  const token = localStorage.getItem("skagata_token");
  const search = new URLSearchParams({
    start_date: params.start_date,
    end_date: params.end_date,
    format: "csv",
    ...(params.class_id ? { class_id: String(params.class_id) } : {}),
    ...(params.student_id ? { student_id: String(params.student_id) } : {}),
    ...(params.teacher_id ? { teacher_id: String(params.teacher_id) } : {}),
    ...(params.subject_id ? { subject_id: String(params.subject_id) } : {}),
    ...(params.session_id ? { session_id: String(params.session_id) } : {}),
    ...(params.status ? { status: params.status } : {}),
  });
  const base = (import.meta.env.VITE_API_URL || "http://localhost:8000") as string;
  const url = `${base}/api/admin/reports?${search.toString()}`;
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => res.blob())
    .then((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `attendance_report_${params.start_date}_to_${params.end_date}.csv`;
      link.click();
    });
}

// ---- Teachers (update) ----

export function updateTeacher(id: number, payload: { full_name?: string; subject_specialty?: string; is_active?: boolean }) {
  return apiCall<{ id: number; updated: boolean }>(client.put(`/api/admin/teachers/${id}`, payload));
}

// ---- Schedules ----

export function listSchedules(params?: { class_id?: number; teacher_id?: number; day_of_week?: number }) {
  return apiCall<{ schedules: ScheduleRow[] }>(client.get("/api/admin/schedules", { params }));
}

export function createSchedule(payload: {
  class_id: number;
  subject_id: number;
  teacher_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
}) {
  return apiCall<{ id: number; created: boolean }>(client.post("/api/admin/schedules", payload));
}

export function updateSchedule(
  id: number,
  payload: {
    class_id?: number;
    subject_id?: number;
    teacher_id?: number;
    day_of_week?: number;
    start_time?: string;
    end_time?: string;
    room?: string;
  }
) {
  return apiCall<{ id: number; updated: boolean }>(client.put(`/api/admin/schedules/${id}`, payload));
}

export function deleteSchedule(id: number) {
  return apiCall<{ id: number; deleted: boolean }>(client.delete(`/api/admin/schedules/${id}`));
}
