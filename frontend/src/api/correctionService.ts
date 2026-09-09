import { client, apiCall } from "./client";
import type { AttendanceCorrection } from "../types";

export function submitCorrection(formData: FormData) {
  return apiCall<AttendanceCorrection>(
    client.post("/api/corrections", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  );
}

export function getMyCorrections() {
  return apiCall<{ corrections: AttendanceCorrection[] }>(
    client.get("/api/corrections/my")
  );
}

export function getTeacherCorrections() {
  return apiCall<{ corrections: AttendanceCorrection[] }>(
    client.get("/api/corrections/teacher")
  );
}

export function getAdminCorrections(status?: string) {
  return apiCall<{ corrections: AttendanceCorrection[] }>(
    client.get("/api/corrections/admin", { params: status ? { status } : {} })
  );
}

export function reviewCorrection(
  id: number,
  decision: "APPROVED" | "REJECTED",
  review_notes?: string
) {
  const formData = new FormData();
  formData.append("decision", decision);
  if (review_notes) {
    formData.append("review_notes", review_notes);
  }
  return apiCall<AttendanceCorrection>(
    client.post(`/api/corrections/${id}/review`, formData)
  );
}
