export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : value < 10 ? 1 : 0;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Calendar date as dd/mm/yyyy. */
export function formatDriveDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Format an ISO date-only string (`yyyy-mm-dd`) as dd/mm/yyyy without timezone shift.
 */
export function formatIsoDateOnly(value?: string): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return formatDriveDate(value);
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Compact relative moment for hover:
 * Heute, 9 Uhr · Gestern 14:35 · 23/10/2026
 */
export function formatRelativeMoment(
  value?: string,
  now = new Date()
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const today = startOfLocalDay(now);
  const day = startOfLocalDay(date);
  const diffDays = Math.round(
    (today.getTime() - day.getTime()) / (24 * 60 * 60 * 1000)
  );
  const hours = date.getHours();
  const minutes = date.getMinutes();

  if (diffDays === 0) {
    if (minutes === 0) return `Heute, ${hours} Uhr`;
    return `Heute, ${hours}:${pad2(minutes)}`;
  }
  if (diffDays === 1) {
    return `Gestern ${hours}:${pad2(minutes)}`;
  }

  return formatDriveDate(value);
}
