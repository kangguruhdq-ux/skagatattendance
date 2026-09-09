import { client, apiCall } from "./client";
import type { SchoolLocationConfig, SystemStatusData, ActivityLogRow } from "../types";

export interface SettingsResponse {
  settings: Record<string, string>;
  school_location: SchoolLocationConfig;
}

export function getSystemSettings() {
  return apiCall<SettingsResponse>(client.get("/api/admin/settings"));
}

export function updateSystemSettings(settings: Record<string, any>) {
  return apiCall<SettingsResponse>(client.put("/api/admin/settings", { settings }));
}

export function getActivityLogs(params?: { action?: string; search?: string; limit?: number }) {
  return apiCall<{ logs: ActivityLogRow[] }>(
    client.get("/api/admin/activity-logs", { params })
  );
}

export function getSystemStatus() {
  return apiCall<SystemStatusData>(client.get("/api/admin/system-status"));
}
