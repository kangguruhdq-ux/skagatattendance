import { client, apiCall } from "./client";

export interface LoginResult {
  access_token: string;
  token_type: string;
  role: "student" | "teacher" | "admin";
  full_name: string;
}

export function login(username: string, password: string) {
  return apiCall<LoginResult>(client.post("/api/auth/login", { username, password }));
}

export function fetchMe() {
  return apiCall<{ id: number; username: string; role: string; full_name: string }>(
    client.get("/api/auth/me")
  );
}
