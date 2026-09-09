import { client, apiCall } from "./client";
import type { UserProfile } from "../types";

export function getProfile() {
  return apiCall<UserProfile>(client.get("/api/profile"));
}

export function updateProfile(data: { full_name?: string; email?: string }) {
  return apiCall<UserProfile>(client.put("/api/profile", data));
}

export function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("avatar", file, file.name);
  // Omit explicit Content-Type so Axios and browser calculate the correct multipart boundary
  return apiCall<UserProfile>(
    client.post("/api/profile/avatar", formData)
  );
}

export function deleteAvatar() {
  return apiCall<UserProfile>(client.delete("/api/profile/avatar"));
}

export function changePassword(old_password: string, new_password: string) {
  return apiCall<{ password_changed: boolean; message: string }>(
    client.post("/api/profile/change-password", { old_password, new_password })
  );
}

/**
 * Resolves avatar URL so it works seamlessly both with Vite proxy and with direct API base URL.
 */
export function getAvatarUrl(urlOrPath: string | null | undefined): string | undefined {
  if (!urlOrPath) return undefined;
  if (
    urlOrPath.startsWith("http://") ||
    urlOrPath.startsWith("https://") ||
    urlOrPath.startsWith("blob:") ||
    urlOrPath.startsWith("data:")
  ) {
    return urlOrPath;
  }
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const cleanPath = urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`;
  return `${apiBase.replace(/\/$/, "")}${cleanPath}`;
}
