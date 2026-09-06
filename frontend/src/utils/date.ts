/**
 * Utility functions for timezone-aware date and time formatting (Asia/Jakarta / WIB).
 */

export function formatWibTime(timestamp?: string | null): string {
  if (!timestamp) return "-";
  try {
    const hasTz =
      timestamp.endsWith("Z") ||
      timestamp.includes("+") ||
      (timestamp.includes("T") && /[-+]\d{2}/.test(timestamp.split("T")[1] || ""));
    const d = new Date(hasTz ? timestamp : `${timestamp}Z`);
    if (isNaN(d.getTime())) return timestamp;

    return d.toLocaleTimeString([], {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return timestamp;
  }
}

export function formatWibTime24h(timestamp?: string | null): string {
  if (!timestamp) return "-";
  try {
    const hasTz =
      timestamp.endsWith("Z") ||
      timestamp.includes("+") ||
      (timestamp.includes("T") && /[-+]\d{2}/.test(timestamp.split("T")[1] || ""));
    const d = new Date(hasTz ? timestamp : `${timestamp}Z`);
    if (isNaN(d.getTime())) return timestamp;

    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .format(d)
      .replace(".", ":");
  } catch {
    return timestamp;
  }
}
