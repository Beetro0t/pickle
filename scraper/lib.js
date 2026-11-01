// Shared utilities for the Pickleball Finder data pipeline.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { formatInTimeZone, fromZonedTime } = require("date-fns-tz");
const { addDays, addMinutes, parseISO } = require("date-fns");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const CACHE_DIR = path.join(__dirname, "cache");
const TZ = "Australia/Sydney";
const UA = "PickleballFinderBot/1.0 (+https://github.com/Beetro0t/pickle; respectful, one request at a time)";

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(CACHE_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowISO = () => new Date().toISOString();

function readJSON(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function shortHash(value, len = 6) {
  return crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, len);
}

function cleanText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkdown(value) {
  return cleanText(
    String(value || "")
      .replace(/\\\s*\n/g, " ")
      .replace(/[#*_>`]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\s+-\s+/g, " — ")
  );
}

function normalizeTitle(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleTokens(value) {
  const stop = new Set([
    "the", "a", "an", "and", "at", "in", "of", "for", "with", "to", "on", "by",
    "pickleball", "social", "play", "session", "sessions", "open", "all", "levels",
    "level", "coached", "coach", "am", "pm", "weekly", "club",
  ]);
  return new Set(
    normalizeTitle(value)
      .split(" ")
      .filter((t) => t.length > 1 && !stop.has(t) && !/^\d+$/.test(t))
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function parseAddress(address) {
  const clean = cleanText(address).replace(/,\s*Australia\s*$/i, "");
  if (!clean || /^online$/i.test(clean)) return { suburb: null, state: "NSW", postcode: null };
  const stateMap = { "new south wales": "NSW" };
  const direct = clean.match(/,\s*([^,]+?)\s*,?\s*(NSW|New South Wales|VIC|QLD|SA|WA|TAS|ACT|NT)\s*,?\s*(\d{4})/i);
  if (direct && cleanText(direct[1])) {
    return {
      suburb: cleanText(direct[1]),
      state: stateMap[direct[2].toLowerCase()] || direct[2].toUpperCase(),
      postcode: direct[3],
    };
  }
  // Some organisers omit the comma before the suburb, e.g.
  // "Cunningham Street Tweed Heads South, NSW, 2486". Capture what follows
  // the last street type before the state/postcode instead of guessing.
  const tail = clean.match(/^(.*?)\s*,?\s*(NSW|New South Wales|VIC|QLD|SA|WA|TAS|ACT|NT)\s*,?\s*(\d{4})\s*$/i);
  const postcodeOnly = !tail ? clean.match(/^(.*?)\s*,?\s*(\d{4})\s*$/) : null;
  const source = tail ? tail[1] : postcodeOnly ? postcodeOnly[1] : clean;
  const state = tail ? (stateMap[tail[2].toLowerCase()] || tail[2].toUpperCase()) : "NSW";
  const postcode = tail ? tail[3] : postcodeOnly ? postcodeOnly[2] : null;
  const tokens = cleanText(source).split(/[\s,]+/).filter(Boolean);
  const streetType = /^(st|street|rd|road|dr|drive|ave|avenue|hwy|highway|pde|parade|ln|lane|way|pl|place|ct|court|cres|crescent|blvd|boulevard|tce|terrace|cl|close|sq|square|circuit|cct|gr|grove|esp|esplanade|rise|walk|mews|loop)$/i;
  let lastStreetType = -1;
  tokens.forEach((token, index) => {
    if (streetType.test(token)) lastStreetType = index;
  });
  const candidate = lastStreetType >= 0 && lastStreetType < tokens.length - 1
    ? tokens.slice(lastStreetType + 1).join(" ")
    : null;
  const suburb = candidate && /[a-z]/i.test(candidate) ? candidate : null;
  return { suburb, state, postcode };
}

function timePartsInSydney(iso) {
  return formatInTimeZone(new Date(iso), TZ, "yyyy-MM-dd HH:mm");
}

function weekdayInSydney(iso) {
  const name = formatInTimeZone(new Date(iso), TZ, "EEEE");
  return name;
}

function formatTimeInSydney(iso) {
  return formatInTimeZone(new Date(iso), TZ, "h:mm a").replace(":00", "");
}

function sydneyLocalToISO(dateStr, timeStr) {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, TZ).toISOString();
}

// Generate upcoming weekly (or multi-day) occurrences starting today in Sydney.
function upcomingWeekly({ weekdays, startTime, endTime, weeks = 8, from = new Date() }) {
  const out = [];
  const todaySydney = formatInTimeZone(from, TZ, "yyyy-MM-dd");
  for (let i = 0; i < weeks * 7; i++) {
    const localDate = formatInTimeZone(addDays(fromZonedTime(`${todaySydney}T12:00:00`, TZ), i), TZ, "yyyy-MM-dd");
    const dow = Number(formatInTimeZone(fromZonedTime(`${localDate}T12:00:00`, TZ), TZ, "i")); // 1=Mon..7=Sun
    if (!weekdays.includes(dow)) continue;
    const start = sydneyLocalToISO(localDate, startTime);
    const end = sydneyLocalToISO(localDate, endTime);
    if (new Date(end) < from) continue;
    out.push({ start, end });
  }
  return out;
}

function nextOccurrencesFromWeekday({ weekday, startTime, endTime, weeks = 8, from = new Date() }) {
  // weekday is ISO 1 (Mon) .. 7 (Sun), matching formatInTimeZone(..., "i")
  return upcomingWeekly({ weekdays: [weekday], startTime, endTime, weeks, from });
}

function isUpcoming(occurrence, from = new Date()) {
  return new Date(occurrence.end || occurrence.start) >= from;
}

function categoryFromText(title, fallback = "social") {
  const t = String(title || "").toLowerCase();
  if (/\b(agm|meeting|annual general)\b/.test(t)) return "other";
  if (/\b(junior|youth|kids|children)\b/.test(t)) return "junior";
  if (/\b(senior|seniors|40\+|55\+|60\+|masters)\b/.test(t)) return "senior";
  if (/\btournaments?\b|\bchampionships?\b|\bcup\b|\bshowdown\b|\bopen\s+(?:tournament|championships?|classic|doubles|singles|mixed)/.test(t)) return "tournament";
  if (/\bfree learn to play|come (&|and) try|intro to|introduction to|learn to play|first time|101\b/.test(t)) return "intro";
  if (/\bclinic|coaching|coached|lesson|skills? (and|&) drills|fundamentals|strategy|drill|cardio|assessment\b/.test(t)) return "coaching";
  // Open play / social sessions should not be reclassified as a league just
  // because the organiser also runs a kings-and-queens rotation.
  if (/\bsocial\b|\bopen play\b|\bdrop.?in\b|\bkings? (and|&) queens?\b|\bqueen of the court\b/.test(t)) return "social";
  if (/\bleague|ladder|round robin|competition|comp\b|fixtures|season|king of the court|3ballerz/.test(t)) return "league";
  if (/\b(casual|meetup|friendly)\b/.test(t)) return "casual";
  if (/\b(charity|fundraiser|festival|special|mixer|aperol|trivia|party|social event)\b/.test(t)) return "special";
  return fallback;
}

function parseLevelWords(text) {
  const raw = String(text || "").toLowerCase();
  const noBeginners = /\bno beginners?\b|\bnot (?:for )?beginners?\b/.test(raw);
  // "No beginners" is a restriction, not a beginner-friendly signal, and
  // "advanced beginner" is still a beginner grade rather than advanced play.
  const t = raw
    .replace(/\bno beginners?\b|\bnot (?:for )?beginners?\b/g, " ")
    .replace(/\badvanced beginners?\b/g, " beginner ");
  const specific = new Set();
  if (!noBeginners && /\bbeginner|novice|new to|first time|intro/.test(t)) specific.add("beginner");
  if (/\bintermediate|improver/.test(t)) specific.add("intermediate");
  if (/\badvanced|elite|\bintermediate plus\b/.test(t)) specific.add("advanced");
  // Grade codes (L1–L4) only apply when the title does not spell the grade
  // out, so a clinic named "Intermediate L2/L3" stays intermediate.
  if (!specific.size) {
    if (/\bl1\b|\bl2\b/.test(t)) specific.add("beginner");
    if (/\bl3\b/.test(t)) specific.add("intermediate");
    if (/\bl4\b/.test(t)) specific.add("advanced");
  }
  // "No beginners" rules out a mixed-ability session, so it is an
  // intermediate-and-up session rather than "all levels".
  if (!specific.size && noBeginners) specific.add("intermediate");
  const all = /\ball (?:skill )?levels?\b|all abilities|everyone welcome/.test(raw);
  const openPlay = /\bopen play\b|\bsocial play\b|\bdrop.?in\b|\bopen rotation\b/.test(raw);
  return { specific, all, openPlay };
}

function levelsFromText(title, explicit = "", { explicitIsAuthoritative = false } = {}) {
  // The title names the grade of the session; platform tags are broad and
  // often label every session in a series (including open play) "advanced".
  // Trust the title first so open play is not lumped in with advanced play.
  // A structured source field (eg OpenSports' level picker) is different: it
  // is authoritative and may name a grade the title leaves out.
  const fromTitle = parseLevelWords(title);
  if (fromTitle.specific.size) return [...fromTitle.specific];
  const fromExplicit = parseLevelWords(explicit);
  if (explicitIsAuthoritative && fromExplicit.specific.size) return [...fromExplicit.specific];
  if (fromTitle.all || fromTitle.openPlay) return ["all"];
  if (fromExplicit.specific.size) return [...fromExplicit.specific];
  if (fromExplicit.all || fromExplicit.openPlay) return ["all"];
  return [];
}

function duprFromText(text) {
  const t = String(text || "");
  const patterns = [
    /DUPR\s*(\d(?:\.\d+)?)\s*(?:\+|and above|& above|plus)/i,
    /DUPR\s*(\d(?:\.\d+)?)\s*(?:-|–|to)\s*(\d(?:\.\d+)?)/i,
    /DUPR\s*(\d(?:\.\d+)?)\s*(?:&|and|or)?\s*(?:below|under)/i,
    /up to\s*(?:DUPR\s*)?(\d(?:\.\d+)?)/i,
    /\(?\s*(\d\.\d+)\s*(?:-|–|to)\s*(\d\.\d+)\s*DUPR/i,
    /under\s*(\d(?:\.\d+)?)\s*DUPR/i,
    /minimum\s*(\d(?:\.\d+)?)\s*DUPR/i,
    /(\d(?:\.\d+)?)\s*DUPR\s*enforced/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) return m[0].replace(/\s+/g, " ").trim();
  }
  return null;
}

function indoorFromText(text) {
  const t = String(text || "").toLowerCase();
  if (/\boutdoor\b/.test(t)) return false;
  if (/\bindoor\b/.test(t)) return true;
  return null;
}

function priceObject({ amount = null, min = null, max = null, memberAmount = null, currency = "AUD", unit = "per player", notes = "" } = {}) {
  const vals = [amount, min, max].filter((v) => typeof v === "number");
  if (!vals.length && memberAmount == null) return null;
  const low = min ?? Math.min(...vals);
  const high = max ?? Math.max(...vals);
  if (low === 0 && (high === 0 || high == null)) {
    return { amount: 0, min: 0, max: 0, memberAmount: memberAmount ?? null, currency, unit, notes: notes || "Free", free: true };
  }
  return {
    amount: low,
    min: low,
    max: high,
    memberAmount: memberAmount ?? null,
    currency,
    unit,
    notes,
    free: false,
  };
}

function makeVenue({ id, name, address, lat = null, lng = null, indoor = null, facilities = [], website = null }) {
  const parsed = parseAddress(address);
  return {
    id: id || slugify(name),
    name: cleanText(name),
    address: cleanText(address),
    suburb: parsed.suburb,
    state: parsed.state,
    postcode: parsed.postcode,
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
    indoor,
    facilities,
    website,
  };
}

function makeOrganizer({ id, name, website = null, description = null, verified = false, sourceIds = [] }) {
  return {
    id: id || slugify(name),
    name: cleanText(name),
    website,
    description,
    verified,
    sourceIds,
  };
}

function summarizeEvent(e) {
  const v = e.venueName;
  const day = e.recurrenceLabel || e.nextDateLabel;
  const level = e.levels.includes("all") ? "all levels" : e.levels.join(", ");
  const price = e.price?.free ? "Free" : e.price?.amount != null ? `$${e.price.amount.toFixed(2).replace(".00", "")}` : null;
  return cleanText(
    `${e.categoryLabel} for ${level} at ${v}${day ? `, ${day}` : ""}${price ? ` · ${price}` : ""}. Published by ${e.organizerName}; check the original listing for the latest details.`
  );
}

async function politeFetch(url, { cacheKey, method = "GET", headers = {}, timeout = 45000, retries = 2 } = {}) {
  const key = cacheKey || slugify(new URL(url).hostname + "-" + new URL(url).pathname);
  const cacheFile = path.join(CACHE_DIR, `${key}.html`);
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, {
        method,
        headers: { "User-Agent": UA, Accept: "text/html,application/json;q=0.9,*/*;q=0.8", ...headers },
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.text();
      fs.writeFileSync(cacheFile, body);
      return { body, fromCache: false, url: res.url };
    } catch (err) {
      lastError = err;
      if (attempt < retries) await sleep(1200 * (attempt + 1));
    }
  }
  if (fs.existsSync(cacheFile)) {
    return { body: fs.readFileSync(cacheFile, "utf8"), fromCache: true, url, error: lastError?.message };
  }
  throw lastError || new Error("fetch failed");
}

function mergeUniqueStrings(a = [], b = []) {
  return [...new Set([...a, ...b].filter(Boolean))];
}

module.exports = {
  ROOT, DATA_DIR, CACHE_DIR, TZ, UA,
  formatInTimeZone, fromZonedTime,
  sleep, nowISO, readJSON, writeJSON, slugify, shortHash, cleanText, stripMarkdown,
  normalizeTitle, titleTokens, jaccard, parseAddress, timePartsInSydney, weekdayInSydney,
  formatTimeInSydney, sydneyLocalToISO, upcomingWeekly, nextOccurrencesFromWeekday,
  isUpcoming, categoryFromText, levelsFromText, duprFromText, indoorFromText, priceObject,
  makeVenue, makeOrganizer, summarizeEvent, politeFetch, mergeUniqueStrings,
};
