import { client, apiCall } from "./client";

export interface LoginResult {
  access_token: string;
  token_type: string;
  role: "student" | "teacher" | "admin";
  full_name: string;
  user_id?: number;
}

export function login(username: string, password: string) {
  return apiCall<LoginResult>(client.post("/api/auth/login", { username, password }));
}

export function fetchMe() {
  return apiCall<{ id: number; username: string; role: string; full_name: string }>(
    client.get("/api/auth/me")
  );
}

export function getPublicClasses() {
  return apiCall<{ classes: { id: number; name: string; major: string | null; grade: string | null }[] }>(
    client.get("/api/auth/classes")
  );
}

export function registerStudent(payload: {
  username: string;
  password: string;
  full_name: string;
  student_code: string;
  class_id: number;
}) {
  return apiCall<{ registered: boolean; username: string; full_name: string; class_name: string }>(
    client.post("/api/auth/register-student", payload)
  );
}
