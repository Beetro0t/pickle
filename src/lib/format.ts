import { formatInTimeZone } from "date-fns-tz";

export const TZ = "Australia/Sydney";

export function formatTime(iso: string) {
  return formatInTimeZone(new Date(iso), TZ, "h:mm a").replace(":00", "");
}

export function formatTimeRange(start: string, end: string) {
  const same = formatInTimeZone(new Date(start), TZ, "a") === formatInTimeZone(new Date(end), TZ, "a");
  const startLabel = formatTime(start);
  const endLabel = formatTime(end);
  return same ? `${startLabel}–${endLabel.replace(/\s?[ap]m/, "")}` : `${startLabel}–${endLabel}`;
}

export function formatDate(iso: string, pattern = "EEE d MMM") {
  return formatInTimeZone(new Date(iso), TZ, pattern);
}

export function formatDateLong(iso: string) {
  return formatInTimeZone(new Date(iso), TZ, "EEEE d MMMM yyyy");
}

export function formatDateTimeRange(start: string, end: string) {
  const sameDay = formatInTimeZone(new Date(start), TZ, "yyyy-MM-dd") === formatInTimeZone(new Date(end), TZ, "yyyy-MM-dd");
  if (sameDay) return `${formatDate(start)} · ${formatTimeRange(start, end)}`;
  return `${formatDate(start)} ${formatTime(start)} – ${formatDate(end)} ${formatTime(end)}`;
}

export function relativeDay(iso: string) {
  const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
  const tomorrow = formatInTimeZone(new Date(Date.now() + 86400000), TZ, "yyyy-MM-dd");
  const date = formatInTimeZone(new Date(iso), TZ, "yyyy-MM-dd");
  if (date === today) return "Today";
  if (date === tomorrow) return "Tomorrow";
  return null;
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso, "d MMM yyyy");
}

export function formatPrice(price: { amount?: number; min?: number; max?: number; memberAmount?: number | null; unit?: string; free?: boolean; notes?: string } | null) {
  if (!price) return "Not provided";
  if (price.free) return "Free";
  const min = price.min ?? price.amount ?? 0;
  const max = price.max ?? price.amount ?? min;
  const fmt = (n: number) => `$${Number(n).toFixed(2).replace(/\.00$/, "")}`;
  if (min === 0 && max > 0) return `Free–${fmt(max)}`;
  if (max > min) return `From ${fmt(min)}`;
  return fmt(min);
}

export function distanceLabel(km: number | null | undefined) {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function formatMonth(iso: string) {
  return formatInTimeZone(new Date(iso), TZ, "MMMM yyyy");
}

export function toSydneyDateKey(iso: string) {
  return formatInTimeZone(new Date(iso), TZ, "yyyy-MM-dd");
}

export function levelLabel(levels: string[]) {
  if (!levels.length) return "Level not published";
  if (levels.includes("all")) return "All levels";
  const order = ["beginner", "intermediate", "advanced"];
  return order.filter((l) => levels.includes(l)).join(" · ").replace(/^\w/, (c) => c.toUpperCase()) || "Level not published";
}

export function spotsLabel(spotsLeft: number | null | undefined, status?: string) {
  if (status === "cancelled") return "Not applicable";
  if (status === "full" || spotsLeft === 0) return "Full";
  if (typeof spotsLeft === "number") return `${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left`;
  return "Spots not published";
}

export function occurrenceStatusLabel(status: string) {
  switch (status) {
    case "cancelled":
      return "Cancelled";
    case "full":
      return "Full";
    case "confirmed":
      return "Confirmed";
    default:
      return "Scheduled";
  }
}
