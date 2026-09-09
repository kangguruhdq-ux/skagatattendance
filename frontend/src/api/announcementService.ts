import { client, apiCall } from "./client";
import type { Announcement } from "../types";

export function listAnnouncements() {
  return apiCall<{ announcements: Announcement[] }>(client.get("/api/announcements"));
}

export function createAnnouncement(
  title: string,
  content: string,
  category = "Info",
  targetRole = "ALL"
) {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("content", content);
  formData.append("category", category);
  formData.append("target_role", targetRole);
  return apiCall<Announcement>(client.post("/api/announcements", formData));
}

export function updateAnnouncement(
  id: number,
  data: {
    title?: string;
    content?: string;
    category?: string;
    target_role?: string;
    is_active?: boolean;
  }
) {
  const formData = new FormData();
  if (data.title !== undefined) formData.append("title", data.title);
  if (data.content !== undefined) formData.append("content", data.content);
  if (data.category !== undefined) formData.append("category", data.category);
  if (data.target_role !== undefined) formData.append("target_role", data.target_role);
  if (data.is_active !== undefined) formData.append("is_active", String(data.is_active));
  return apiCall<Announcement>(client.put(`/api/announcements/${id}`, formData));
}

export function deleteAnnouncement(id: number) {
  return apiCall<{ id: number; deleted: boolean }>(
    client.delete(`/api/announcements/${id}`)
  );
}
