import { client, apiCall } from "./client";
import type { AdminDashboard, StudentRow, TeacherRow, ClassRow, SubjectRow } from "../types";

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

export function listClasses() {
  return apiCall<{ classes: ClassRow[] }>(client.get("/api/admin/classes"));
}

export function createClass(payload: { name: string; major?: string; grade?: string; academic_year?: string }) {
  return apiCall(client.post("/api/admin/classes", payload));
}

export function listSubjects() {
  return apiCall<{ subjects: SubjectRow[] }>(client.get("/api/admin/subjects"));
}

export function createSubject(payload: { name: string; code?: string }) {
  return apiCall(client.post("/api/admin/subjects", payload));
}

export function getReportsJson(params: { start_date: string; end_date: string; class_id?: number; status?: string }) {
  return apiCall<{ rows: any[]; count: number }>(
    client.get("/api/admin/reports", { params: { ...params, format: "json" } })
  );
}

export function downloadReportCsv(params: { start_date: string; end_date: string; class_id?: number; status?: string }) {
  const token = localStorage.getItem("skagata_token");
  const search = new URLSearchParams({
    start_date: params.start_date,
    end_date: params.end_date,
    format: "csv",
    ...(params.class_id ? { class_id: String(params.class_id) } : {}),
    ...(params.status ? { status: params.status } : {}),
  });
  const base = (import.meta.env.VITE_API_URL || "http://localhost:8000") as string;
  const url = `${base}/api/admin/reports?${search.toString()}`;
  // Simple approach for a demo project: open with auth via fetch + blob download.
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => res.blob())
    .then((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "attendance_report.csv";
      link.click();
    });
}
