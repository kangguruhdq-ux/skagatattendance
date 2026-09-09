import { client, apiCall } from "./client";
import type { NotificationItem } from "../types";

export function getNotifications() {
  return apiCall<{ notifications: NotificationItem[]; unread_count: number }>(
    client.get("/api/notifications")
  );
}

export function markNotificationRead(id: number) {
  return apiCall<{ id: number; is_read: boolean }>(
    client.post(`/api/notifications/${id}/read`)
  );
}

export function markAllNotificationsRead() {
  return apiCall<{ marked_all_read: boolean }>(
    client.post("/api/notifications/read-all")
  );
}

export function deleteNotification(id: number) {
  return apiCall<{ id: number; deleted: boolean }>(
    client.delete(`/api/notifications/${id}`)
  );
}

export function deleteAllNotifications() {
  return apiCall<{ deleted_count: number; all_deleted: boolean }>(
    client.delete("/api/notifications/all")
  );
}

