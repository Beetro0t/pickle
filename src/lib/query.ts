import { addDays } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import type { Dataset, EventCategory, EventQuery, Locality, Occurrence, PickleballEvent, SkillLevel } from "./types";
import { TZ, toSydneyDateKey } from "./format";

export type EventWithMatch = PickleballEvent & {
  match: Occurrence | null;
  distanceKm: number | null;
  score?: number;
};

export function asCardEvent(event: PickleballEvent): EventWithMatch {
  const match = event.occurrences.find((occurrence) => occurrence.status !== "cancelled") || event.occurrences[0] || null;
  return { ...event, match, distanceKm: null };
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function sydneyStartOfDay(dateKey: string) {
  return fromZonedTime(`${dateKey}T00:00:00`, TZ);
}

function sydneyEndOfDay(dateKey: string) {
  return fromZonedTime(`${dateKey}T23:59:59`, TZ);
}

export function resolveDateRange(date?: string): { from?: Date; to?: Date; label?: string } {
  if (!date || date === "all") return {};
  const todayKey = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
  if (date === "today") return { from: sydneyStartOfDay(todayKey), to: sydneyEndOfDay(todayKey), label: "Today" };
  if (date === "tomorrow") {
    const key = formatInTimeZone(addDays(new Date(), 1), TZ, "yyyy-MM-dd");
    return { from: sydneyStartOfDay(key), to: sydneyEndOfDay(key), label: "Tomorrow" };
  }
  if (date === "weekend") {
    const dow = Number(formatInTimeZone(new Date(), TZ, "i"));
    const daysToSaturday = (6 - dow + 7) % 7;
    const saturday = formatInTimeZone(addDays(new Date(), daysToSaturday), TZ, "yyyy-MM-dd");
    const sunday = formatInTimeZone(addDays(fromZonedTime(`${saturday}T12:00:00`, TZ), 1), TZ, "yyyy-MM-dd");
    return { from: sydneyStartOfDay(saturday), to: sydneyEndOfDay(sunday), label: "This weekend" };
  }
  if (date === "week") {
    const end = formatInTimeZone(addDays(new Date(), 7), TZ, "yyyy-MM-dd");
    return { from: sydneyStartOfDay(todayKey), to: sydneyEndOfDay(end), label: "Next 7 days" };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { from: sydneyStartOfDay(date), to: sydneyEndOfDay(date), label: formatInTimeZone(new Date(fromZonedTime(`${date}T12:00:00`, TZ)), TZ, "EEE d MMM") };
  }
  return {};
}

export function duprBounds(value: string | null | undefined): { min: number; max: number } | null {
  if (!value) return null;
  const text = value.toLowerCase().replace(/[()]/g, " ");
  const range = text.match(/(\d(?:\.\d+)?)\s*(?:-|–|to)\s*(\d(?:\.\d+)?)/);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const under = text.match(/(?:under|below|<)\s*(\d(?:\.\d+)?)/);
  if (under) return { min: 0, max: Number(under[1]) };
  const upTo = text.match(/(?:up to|max(?:imum)?)\s*(\d(?:\.\d+)?)/);
  if (upTo) return { min: 0, max: Number(upTo[1]) };
  const capped = text.match(/(\d(?:\.\d+)?)\s*(?:&|and|or)?\s*(?:below|under)/);
  if (capped) return { min: 0, max: Number(capped[1]) };
  const plus = text.match(/(\d(?:\.\d+)?)\s*(?:\+|and above|and over|& above|& over|\bplus\b)/);
  if (plus) return { min: Number(plus[1]), max: Number.POSITIVE_INFINITY };
  const number = text.match(/(\d(?:\.\d+)?)/);
  if (number) return { min: Number(number[1]), max: Number(number[1]) };
  return null;
}

function sessionBucket(iso: string): "morning" | "afternoon" | "evening" {
  const hour = Number(formatInTimeZone(new Date(iso), TZ, "H"));
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function stemToken(token: string) {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && /(?:ches|shes|sses|xes|zes)$/.test(token)) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss") && !token.endsWith("us")) return token.slice(0, -1);
  return token;
}

function matchesSearch(event: PickleballEvent, q: string) {
  const haystack = event.searchText;
  const tokens = q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (!tokens.length) return true;
  // Match singular or plural forms so "tournaments" finds "tournament" listings.
  return tokens.every((t) => haystack.includes(t) || haystack.includes(stemToken(t)));
}

// A filter matches the level the session is actually pitched at. "All levels"
// is its own option rather than a match for every grade, so open play does not
// show up under Advanced (or Beginner) just because everyone is welcome.
// Tournaments and leagues are the exception: an "all levels" competition runs
// graded divisions, so it belongs under every grade filter too.
function matchesLevel(event: PickleballEvent, level: SkillLevel) {
  if (level === "dupr") return Boolean(event.duprRange);
  if (event.levels.includes(level)) return true;
  const competition = event.category === "tournament" || event.category === "league";
  return competition && event.levels.includes("all");
}

function occurrenceWeekdays(occurrence: Occurrence): string[] {
  const startKey = toSydneyDateKey(occurrence.start);
  const endKey = toSydneyDateKey(occurrence.end);
  const end = fromZonedTime(`${endKey}T12:00:00`, TZ);
  let cursor = fromZonedTime(`${startKey}T12:00:00`, TZ);
  const days: string[] = [];
  for (let i = 0; i < 14 && cursor <= end; i++) {
    days.push(formatInTimeZone(cursor, TZ, "EEEE").toLowerCase());
    cursor = addDays(cursor, 1);
  }
  return days;
}

function referenceCoords(query: EventQuery, localities: Locality[]) {
  if (typeof query.lat === "number" && typeof query.lng === "number") return { lat: query.lat, lng: query.lng, label: "Your location" };
  if (query.locality) {
    const locality = localities.find((l) => l.id === query.locality || l.name.toLowerCase() === query.locality?.toLowerCase());
    if (locality) return { lat: locality.lat, lng: locality.lng, label: locality.label };
  }
  return null;
}

export function filterEvents(dataset: Dataset, query: EventQuery): { events: EventWithMatch[]; total: number; facets: Record<string, Record<string, number>> } {
  const now = new Date();
  const reference = referenceCoords(query, dataset.localities);
  const radius = typeof query.radius === "number" ? query.radius : query.locality || (query.lat != null && query.lng != null) ? 25 : null;
  const { from, to } = resolveDateRange(query.from);
  const validLevels = new Set<SkillLevel>(["beginner", "intermediate", "advanced", "all", "dupr"]);
  const requestedLevel = query.level && validLevels.has(query.level as SkillLevel) ? (query.level as SkillLevel) : null;

  const results: EventWithMatch[] = [];
  const facets: Record<string, Record<string, number>> = { categories: {}, levels: {} };

  for (const event of dataset.events) {
    if (query.ids?.length && !query.ids.includes(event.id)) continue;
    if (query.venueId && event.venueId !== query.venueId) continue;
    if (query.organizerId && event.organizerId !== query.organizerId) continue;
    if (query.category && query.category !== "all" && event.category !== query.category) continue;
    if (query.q && !matchesSearch(event, query.q)) continue;
    if (requestedLevel && !matchesLevel(event, requestedLevel)) continue;
    if (query.dupr != null) {
      const bounds = duprBounds(event.duprRange);
      if (!bounds || query.dupr < bounds.min || query.dupr > bounds.max) continue;
    }
    if (query.indoor && query.indoor !== "all") {
      if (query.indoor === "indoor" && event.indoor !== true) continue;
      if (query.indoor === "outdoor" && event.indoor !== false) continue;
    }
    if (query.price && query.price !== "all") {
      const isFree = Boolean(event.price?.free);
      if (query.price === "free" && !isFree) continue;
      if (query.price === "paid" && isFree) continue;
    }
    if (query.membership && query.membership !== "all") {
      if (query.membership === "open" && event.membershipRequired === true) continue;
      if (query.membership === "members" && event.membershipRequired !== true) continue;
    }
    const active = event.occurrences.filter((o) => o.status !== "cancelled" && new Date(o.end) >= now);
    let candidates = active;
    if (from || to) {
      // Include sessions that are already underway or span the requested range
      // (multi-day tournaments, for example), not just ones that start in it.
      candidates = candidates.filter((o) => {
        const start = new Date(o.start);
        const end = new Date(o.end);
        return (!from || end >= from) && (!to || start <= to);
      });
    }
    if (query.day) {
      const days = query.day.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
      if (days.length) {
        candidates = candidates.filter((o) => occurrenceWeekdays(o).some((day) => days.includes(day)));
      }
    }
    if (query.session && query.session !== "all") {
      candidates = candidates.filter((o) => sessionBucket(o.start) === query.session);
    }
    if (!candidates.length) continue;
    const match = candidates[0];

    let distanceKm: number | null = null;
    if (reference && event.venue.lat != null && event.venue.lng != null) {
      distanceKm = haversineKm(reference, { lat: event.venue.lat, lng: event.venue.lng });
    }
    if (radius != null && reference) {
      if (distanceKm == null || distanceKm > radius) continue;
    }

    const enriched: EventWithMatch = { ...event, match, distanceKm };
    results.push(enriched);
    facets.categories[event.category] = (facets.categories[event.category] || 0) + 1;
    const levelKey = event.levels.includes("all") ? "all" : event.levels[0] || "all";
    facets.levels[levelKey] = (facets.levels[levelKey] || 0) + 1;
  }

  // A location narrows the results by distance; show the soonest sessions
  // first so the feed starts with what you can play next, not what is nearest.
  const sort = query.sort || (reference ? "soonest" : "relevance");
  const freshness = (event: PickleballEvent) => new Date(event.lastChecked).getTime();
  const relevance = (event: EventWithMatch) => {
    const kmScore = event.distanceKm == null ? 0.4 : Math.max(0, 1 - event.distanceKm / 45);
    const hours = (new Date(event.match?.start || event.nextStart).getTime() - Date.now()) / 3600000;
    const timeScore = hours < 0 ? 0.2 : Math.max(0, 1 - hours / (24 * 21));
    const levelScore = requestedLevel ? (event.levels.includes("all") ? 0.9 : 1) : 0.8;
    const completeness = (event.price ? 0.4 : 0) + (event.descriptionExcerpt || event.description ? 0.2 : 0) + (event.venue.lat != null ? 0.2 : 0) + (event.sourceCount > 1 ? 0.1 : 0) + (event.verified ? 0.1 : 0);
    const freshScore = freshness(event) > Date.now() - 3 * 86400000 ? 0.6 : 0.3;
    return kmScore * 0.34 + timeScore * 0.32 + levelScore * 0.12 + completeness * 0.12 + freshScore * 0.1;
  };

  if (sort === "soonest") results.sort((a, b) => new Date(a.match?.start || a.nextStart).getTime() - new Date(b.match?.start || b.nextStart).getTime());
  else if (sort === "closest") results.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999) || new Date(a.match?.start || a.nextStart).getTime() - new Date(b.match?.start || b.nextStart).getTime());
  else if (sort === "price") results.sort((a, b) => Number(b.price?.free) - Number(a.price?.free) || (a.price?.amount ?? 9999) - (b.price?.amount ?? 9999));
  else {
    for (const item of results) item.score = relevance(item);
    results.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 24;
  const total = results.length;
  const paged = query.limit === 0 ? results : results.slice((page - 1) * limit, page * limit);
  return { events: paged, total, facets };
}

export function parseEventQuery(params: Record<string, string | string[] | undefined>): EventQuery {
  const pick = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const pickAll = (key: string): string | undefined => {
    const value = params[key];
    if (Array.isArray(value)) return value.filter(Boolean).join(",") || undefined;
    return value;
  };
  const num = (key: string) => {
    const raw = pick(key);
    if (raw == null || raw === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    q: pick("q"),
    locality: pick("locality") || pick("area"),
    lat: num("lat"),
    lng: num("lng"),
    radius: num("radius"),
    from: pick("date") || pick("from"),
    to: pick("to"),
    category: (pick("category") as EventCategory) || undefined,
    level: (pick("level") as SkillLevel) || undefined,
    dupr: num("dupr"),
    day: pickAll("day"),
    session: (pick("session") as EventQuery["session"]) || undefined,
    indoor: (pick("indoor") as EventQuery["indoor"]) || undefined,
    price: (pick("price") as EventQuery["price"]) || undefined,
    membership: (pick("membership") as EventQuery["membership"]) || undefined,
    sort: (pick("sort") as EventQuery["sort"]) || undefined,
    page: num("page"),
    limit: num("limit"),
    ids: pick("ids") ? pick("ids")!.split(",").filter(Boolean) : undefined,
    venueId: pick("venueId"),
    organizerId: pick("organizerId"),
  };
}

export function sydneyTodayKey() {
  return formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
}

export { toSydneyDateKey };
