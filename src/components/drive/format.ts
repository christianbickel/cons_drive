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

export function formatDriveDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Compact relative moment for hover:
 * Heute, 9 Uhr · Gestern 14:35 · 23.10. · 16.8.2024
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

  const dayNum = date.getDate();
  const monthNum = date.getMonth() + 1;
  if (date.getFullYear() === now.getFullYear()) {
    return `${dayNum}.${monthNum}.`;
  }
  return `${dayNum}.${monthNum}.${date.getFullYear()}`;
}
