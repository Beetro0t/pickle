// Build the Pickleball Finder dataset from approved public sources.
// Run: node scraper/build.js
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { writeJSON, readJSON, nowISO, cleanText } = require("./lib");
const { SOURCES } = require("./sources");
const { VENUES } = require("./venues");
const { LOCALITIES } = require("./localities");
const { scrapeOpenSports } = require("./adapters/opensports");
const { scrapeNsw } = require("./adapters/nsw");
const { scrapeDink } = require("./adapters/dink");
const { scrapePickleballerz } = require("./adapters/pickleballerz");
const { scrapeHouseOfPickle } = require("./adapters/houseofpickle");
const { checkCityOfSydney, checkHunterTimetable } = require("./adapters/reference");
const {
  scrapePcycBateauLeagues, scrapePcycLakeMacquarie, scrapeWoyWoy,
  scrapeBarBeach, scrapeStockton, scrapeYwca, scrapeVoyager,
} = require("./adapters/static");
const { canonicalize, dedupeEvents, attachVenueAndOrganizerStats, CATEGORY_LABELS } = require("./canonical");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");

function ensurePodplayCache() {
  const cachePath = path.join(__dirname, "cache", "podplay.json");
  if (process.env.SKIP_PODPLAY === "1") return;
  let needs = true;
  try {
    const stat = fs.statSync(cachePath);
    needs = Date.now() - stat.mtimeMs > 12 * 60 * 60 * 1000;
  } catch {}
  if (!needs) return;
  try {
    console.log("refreshing PodPlay public calendar...");
    execFileSync(process.execPath, [path.join(__dirname, "podplay-fetch.js")], { stdio: "inherit", timeout: 5 * 60 * 1000 });
  } catch (err) {
    console.warn("PodPlay refresh failed, using cached data:", err.message);
  }
}

async function run(name, fn) {
  const started = Date.now();
  try {
    const result = await fn();
    console.log(`${name}: ${result.listings.length} listings`);
    return result;
  } catch (err) {
    console.error(`${name} failed: ${err.message}`);
    return { listings: [], runs: [{ sourceId: name, ok: false, status: "failed", events: 0, fetchedAt: nowISO(), message: err.message }], error: err };
  }
}

async function main() {
  const startedAt = Date.now();
  ensurePodplayCache();
  const allListings = [];
  const allRuns = [];
  const collect = (result) => {
    allListings.push(...(result.listings || []));
    allRuns.push(...(result.runs || []));
  };

  collect(await run("opensports", () => scrapeOpenSports({ from: new Date() })));
  collect(await run("pickleball-nsw", () => scrapeNsw({ from: new Date() })));
  collect(await run("pcyc-bateau-bay", () => scrapePcycBateauLeagues({ from: new Date() })));
  collect(await run("pcyc-lake-macquarie", () => scrapePcycLakeMacquarie({ from: new Date() })));
  collect(await run("woy-woy-pickleball", () => scrapeWoyWoy({ from: new Date() })));
  collect(await run("bar-beach", () => scrapeBarBeach({ from: new Date() })));
  collect(await run("stockton-tennis", () => scrapeStockton({ from: new Date() })));
  collect(await run("ywca-hunter", () => scrapeYwca({ from: new Date() })));
  collect(await run("voyager-gosford", () => scrapeVoyager({ from: new Date() })));
  collect(await run("dink-society", () => scrapeDink({ from: new Date() })));
  collect(await run("pickleballerz", () => scrapePickleballerz({ from: new Date() })));
  collect(await run("house-of-pickle", () => scrapeHouseOfPickle()));

  // These pages are verified as part of the build, but their dated sessions are
  // already collected through the linked booking calendars above.
  const [cityCheck, hunterCheck] = await Promise.all([checkCityOfSydney(), checkHunterTimetable()]);
  allRuns.push(...cityCheck.runs, ...hunterCheck.runs);

  const rawCount = allListings.length;
  let events = canonicalize(allListings, new Date());
  const deduped = dedupeEvents(events);
  events = deduped.events;

  const { venues, organizers } = attachVenueAndOrganizerStats(events);

  // Ensure every curated venue has a record even when it has no current events.
  for (const v of VENUES) {
    if (!venues.find((x) => x.id === v.id)) {
      venues.push({ ...v, eventCount: 0, eventIds: [], nextEventAt: null });
    }
  }
  venues.sort((a, b) => a.name.localeCompare(b.name));
  venues.forEach((v) => {
    v.hasCoordinates = v.lat != null && v.lng != null;
    v.upcomingEvents = v.eventCount;
  });
  organizers.sort((a, b) => b.eventCount - a.eventCount || a.name.localeCompare(b.name));

  // Merge run health with the source registry.
  const previousReport = readJSON(path.join(DATA, "scrape-report.json"), {});
  const previousRuns = new Map();
  for (const r of previousReport.sourceRuns || []) previousRuns.set(r.sourceId, r);
  const runMap = new Map();
  for (const r of allRuns) {
    const existing = runMap.get(r.sourceId);
    if (!existing) runMap.set(r.sourceId, { ...r });
    else {
      existing.events += r.events || 0;
      existing.ok = existing.ok && r.ok;
      existing.status = r.ok ? existing.status : "failed";
      if (!existing.lastSuccess && r.ok) existing.lastSuccess = r.fetchedAt;
      existing.messages = [...(existing.messages || []), r.message].filter(Boolean);
    }
  }

  const eventSourceIds = new Set(events.flatMap((e) => e.sources.map((s) => s.sourceId)));
  const sourceEventCounts = new Map();
  for (const e of events) for (const s of e.sources) sourceEventCounts.set(s.sourceId, (sourceEventCounts.get(s.sourceId) || 0) + 1);

  const sources = SOURCES.map((s) => {
    const run = runMap.get(s.id);
    const prev = previousRuns.get(s.id);
    const ok = run ? run.ok : null;
    const consecutiveFailures = run ? (run.ok ? 0 : (prev?.consecutiveFailures || 0) + 1) : (prev?.consecutiveFailures || 0);
    return {
      ...s,
      lastRun: run?.fetchedAt || prev?.lastRun || null,
      lastSuccess: run?.ok ? run.fetchedAt : prev?.lastSuccess || null,
      eventCount: sourceEventCounts.get(s.id) || 0,
      recordCount: run?.events || 0,
      consecutiveFailures,
      health: run ? (run.ok ? (run.status === "cached" ? "cached" : "ok") : "failed") : (s.status === "active" ? "reviewed" : s.status),
      message: run?.message || run?.messages?.join("; ") || null,
    };
  });

  const items = events;
  const counts = {
    events: events.length,
    occurrences: events.reduce((sum, e) => sum + e.occurrences.length, 0),
    venues: venues.filter((v) => v.eventCount > 0).length,
    organizers: organizers.filter((o) => o.eventCount > 0).length,
    sources: sources.filter((s) => s.status === "active").length,
    rawListings: rawCount,
    staleSources: sources.filter((s) => s.health === "failed").length,
  };
  const byCategory = {};
  for (const e of events) byCategory[e.category] = (byCategory[e.category] || 0) + 1;
  const byRegion = {};
  for (const e of events) if (e.region) byRegion[e.region] = (byRegion[e.region] || 0) + 1;
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400000);
  counts.thisWeek = events.filter((e) => e.nextStart && new Date(e.nextStart) <= in7).length;
  counts.free = events.filter((e) => e.price?.free).length;
  counts.withCoordinates = events.filter((e) => e.venue.lat != null && e.venue.lng != null).length;
  counts.weeklyRecurring = events.filter((e) => e.recurrenceLabel).length;

  const dataQuality = {
    missingCoordinates: events.filter((e) => e.venue.lat == null || e.venue.lng == null).map((e) => ({ id: e.id, title: e.title, venue: e.venue.name })),
    missingPrice: events.filter((e) => !e.price).map((e) => ({ id: e.id, title: e.title, category: e.category })),
    missingBookingUrl: events.filter((e) => !e.bookingUrl).map((e) => ({ id: e.id, title: e.title })),
    staleListings: events.filter((e) => (now - new Date(e.lastChecked)) > 21 * 86400000).map((e) => ({ id: e.id, title: e.title, lastChecked: e.lastChecked })),
    cancelledOccurrences: events.reduce((sum, e) => sum + e.occurrences.filter((o) => o.status === "cancelled").length, 0),
    duplicateReview: deduped.review,
  };

  const dataset = {
    generatedAt: nowISO(),
    timezone: "Australia/Sydney",
    region: "New South Wales",
    events,
    venues,
    organizers,
    sources,
    categories: Object.entries(CATEGORY_LABELS).map(([id, label]) => ({ id, label, count: byCategory[id] || 0 })),
    localities: LOCALITIES,
    stats: { ...counts, byCategory, byRegion },
    dataQuality: {
      missingCoordinates: dataQuality.missingCoordinates.length,
      missingPrice: dataQuality.missingPrice.length,
      missingBookingUrl: dataQuality.missingBookingUrl.length,
      staleListings: dataQuality.staleListings.length,
      cancelledOccurrences: dataQuality.cancelledOccurrences,
      duplicateReview: dataQuality.duplicateReview.length,
    },
  };

  const report = {
    generatedAt: dataset.generatedAt,
    durationSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
    counts,
    byCategory,
    byRegion,
    sourceRuns: allRuns,
    sources,
    dataQuality,
    failures: allRuns.filter((r) => !r.ok).map((r) => ({ sourceId: r.sourceId, message: r.message, at: r.fetchedAt })),
    notes: [
      "Only public, organiser-published event metadata is stored.",
      "Attendance names and private group content are never collected.",
      "Sessions from published timetables are labelled as scheduled, not confirmed.",
    ],
  };

  writeJSON(path.join(DATA, "events.json"), dataset);
  writeJSON(path.join(DATA, "sources.json"), sources);
  writeJSON(path.join(DATA, "scrape-report.json"), report);
  writeJSON(path.join(DATA, "merge-review.json"), deduped.review);
  writeJSON(path.join(DATA, "localities.json"), LOCALITIES);

  // A small, audit-friendly snapshot of what this build used (no full HTML).
  const snapshot = {
    generatedAt: dataset.generatedAt,
    listings: allListings.map((l) => ({
      sourceId: l.sourceId,
      sourceUrl: l.sourceUrl,
      title: l.title,
      venue: l.venue?.name,
      start: l.occurrence?.start,
      end: l.occurrence?.end,
      price: l.price?.amount ?? null,
      status: l.occurrence?.status,
    })),
  };
  writeJSON(path.join(DATA, "source-snapshot.json"), snapshot);

  console.log(`\nBuilt ${events.length} events / ${counts.occurrences} occurrences from ${rawCount} listings.`);
  console.log(`Venues: ${counts.venues}; organizers: ${counts.organizers}; categories:`, byCategory);
  console.log("Data quality:", dataset.dataQuality);
  if (report.failures.length) console.log("Failures:", report.failures);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
