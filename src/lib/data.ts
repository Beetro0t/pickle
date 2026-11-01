import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Dataset, PickleballEvent, Source, Venue, Organizer, Locality, Submission } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

let cached: Dataset | null = null;

export function getDataset(): Dataset {
  if (cached) return cached;
  cached = readJson<Dataset>("events.json", {
    generatedAt: new Date().toISOString(),
    timezone: "Australia/Sydney",
    region: "New South Wales",
    events: [],
    venues: [],
    organizers: [],
    sources: [],
    categories: [],
    localities: [],
    stats: {
      events: 0,
      occurrences: 0,
      venues: 0,
      organizers: 0,
      sources: 0,
      rawListings: 0,
      staleSources: 0,
      thisWeek: 0,
      free: 0,
      withCoordinates: 0,
      weeklyRecurring: 0,
      byCategory: {},
      byRegion: {},
    },
    dataQuality: {},
  });
  return cached;
}

export function getEventById(id: string): PickleballEvent | null {
  return getDataset().events.find((e) => e.id === id) ?? null;
}

export function getVenues(): Venue[] {
  return getDataset().venues;
}

export function getVenueById(id: string): Venue | null {
  return getDataset().venues.find((v) => v.id === id) ?? null;
}

export function getOrganizers(): Organizer[] {
  return getDataset().organizers;
}

export function getOrganizerById(id: string): Organizer | null {
  return getDataset().organizers.find((o) => o.id === id) ?? null;
}

export function getSources(): Source[] {
  return getDataset().sources;
}

export function getLocalities(): Locality[] {
  return getDataset().localities;
}

export function getScrapeReport(): {
  generatedAt?: string;
  durationSeconds?: number;
  counts?: Record<string, number>;
  sourceRuns?: { sourceId: string; ok: boolean; status: string; events: number; fetchedAt: string; message?: string | null }[];
  failures?: { sourceId: string; message?: string | null; at: string }[];
  dataQuality?: Record<string, number>;
  notes?: string[];
} {
  return readJson("scrape-report.json", {});
}

export function getMergeReview(): unknown[] {
  return readJson<unknown[]>("merge-review.json", []);
}

export function getSubmissions(): Submission[] {
  return readJson<Submission[]>("submissions.json", []);
}
