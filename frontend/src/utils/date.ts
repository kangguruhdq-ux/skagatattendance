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

/**
 * Formats a timestamp into Indonesian date and WIB time:
 * e.g. "09 Sep 2026, 14:35 WIB"
 */
export function formatWibDateTime(timestamp?: string | null): string {
  if (!timestamp) return "-";
  try {
    const hasTz =
      timestamp.endsWith("Z") ||
      timestamp.includes("+") ||
      (timestamp.includes("T") && /[-+]\d{2}/.test(timestamp.split("T")[1] || ""));
    const d = new Date(hasTz ? timestamp : `${timestamp}Z`);
    if (isNaN(d.getTime())) return timestamp;

    const datePart = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);

    const timePart = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .format(d)
      .replace(".", ":");

    return `${datePart}, ${timePart} WIB`;
  } catch {
    return timestamp;
  }
}

/**
 * Formats a timestamp into time only with WIB suffix:
 * e.g. "14:35 WIB"
 */
export function formatWibTimeWithSuffix(timestamp?: string | null): string {
  if (!timestamp) return "-";
  try {
    const hasTz =
      timestamp.endsWith("Z") ||
      timestamp.includes("+") ||
      (timestamp.includes("T") && /[-+]\d{2}/.test(timestamp.split("T")[1] || ""));
    const d = new Date(hasTz ? timestamp : `${timestamp}Z`);
    if (isNaN(d.getTime())) return timestamp;

    const timePart = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .format(d)
      .replace(".", ":");

    return `${timePart} WIB`;
  } catch {
    return timestamp;
  }
}
