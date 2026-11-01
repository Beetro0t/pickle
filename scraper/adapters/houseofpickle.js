const {
  cleanText, stripMarkdown, categoryFromText, levelsFromText, duprFromText, priceObject,
  weekdayInSydney, formatInTimeZone, readJSON, nowISO,
} = require("../lib");
const { VENUES } = require("../venues");

function categoryFor(item) {
  const type = `${item.customType || ""} ${item.subtype || ""}`.toLowerCase();
  const name = item.name || "";
  if (/learn to play|intro/i.test(name)) return "intro";
  if (/tournament|showdown/i.test(type)) return "tournament";
  if (/clinic|coach/i.test(type)) return "coaching";
  if (/special/i.test(type)) return "special";
  if (/private event/i.test(type)) return "other";
  return "social";
}

async function scrapeHouseOfPickle() {
  const startedAt = nowISO();
  const listings = [];
  const cache = readJSON(`${__dirname}/../cache/podplay.json`);
  if (!cache || !Array.isArray(cache.items)) {
    return { listings, runs: [{ sourceId: "house-of-pickle", ok: false, status: "failed", events: 0, fetchedAt: nowISO(), message: "Public calendar cache missing" }] };
  }
  const venue = VENUES.find((v) => v.id === "house-of-pickle-tuggerah");
  const now = new Date();
  let skippedPrivate = 0;
  for (const item of cache.items) {
    if (!["EVENT", "CLASS"].includes(item.type)) continue;
    if (item.isCanceled || item.status !== "PUBLISHED") continue;
    if (item.visibility && item.visibility !== "LISTED") continue;
    if (/private event/i.test(item.customType || "")) { skippedPrivate++; continue; }
    if (!item.startTime || !item.endTime) continue;
    if (new Date(item.endTime) < now) continue;
    const detail = cache.details?.[item.id] || {};
    const admission = detail.admission || item.admission;
    const rate = detail.admissionRate || {};
    const total = detail.totalTeams ?? null;
    const sold = detail.signups?._total ?? null;
    const spotsLeft = total != null && sold != null ? Math.max(0, total - sold) : null;
    const full = spotsLeft === 0;
    const closed = admission === "CLOSED";
    const tags = detail.tags || item.tags || [];
    const levels = levelsFromText(item.name, tags.join(" "));
    const category = categoryFor(item);
    const price = rate.regular != null
      ? priceObject({ amount: rate.regular, memberAmount: rate.member ?? null, unit: "per player" })
      : null;
    const weekday = weekdayInSydney(item.startTime);
    const time = formatInTimeZone(new Date(item.startTime), "Australia/Sydney", "HH:mm");
    const sourceUrl = "https://houseofpickle.podplay.app/community/events?location=tuggerah";
    const bookingUrl = `https://houseofpickle.podplay.app/community/events/${item.id}`;
    listings.push({
      sourceId: "house-of-pickle",
      sourceUrl: sourceUrl,
      sourceTitle: item.name,
      sourceMethod: "Public community calendar API",
      sourceLastChecked: cache.fetchedAt || nowISO(),
      sourceCached: true,
      groupKey: cleanText(item.name).toLowerCase(),
      title: cleanText(item.name),
      category,
      levels,
      duprRange: duprFromText(`${item.name} ${tags.join(" ")}`),
      format: /open play|mixer/i.test(item.name) ? "Open rotation" : /clinic|coach/i.test(item.name) ? "Coached session" : category === "tournament" ? "Tournament" : "Social session",
      indoor: venue.indoor,
      description: null,
      descriptionExcerpt: detail.description ? stripMarkdown(detail.description).slice(0, 700) : null,
      price,
      venue,
      organizer: {
        id: "house-of-pickle",
        name: "House of Pickle",
        website: "https://houseofpickle.com.au/locations/tuggerah/",
        verified: true,
        sourceIds: ["house-of-pickle"],
      },
      bookingUrl: bookingUrl,
      officialUrl: bookingUrl,
      membershipRequired: false,
      equipmentProvided: /paddle/i.test(detail.description || "") ? true : null,
      facilities: venue.facilities,
      region: "Central Coast",
      occurrence: {
        start: item.startTime,
        end: item.endTime,
        status: full ? "full" : "scheduled",
        registrationStatus: full ? "full" : closed ? "closed" : "open",
        spotsLeft,
        sourceId: "house-of-pickle",
        sourceOccurrenceId: item.id,
        url: bookingUrl,
        note: full ? "Session is full on the venue's calendar" : closed ? "Online sign-up has closed" : null,
      },
      verified: true,
      featured: false,
    });
  }
  console.log(`house of pickle: ${listings.length} sessions (${skippedPrivate} private events skipped)`);
  return {
    listings,
    runs: [{
      sourceId: "house-of-pickle",
      ok: true,
      status: "cached",
      events: listings.length,
      fetchedAt: cache.fetchedAt || nowISO(),
      durationMs: Date.now() - new Date(startedAt).getTime(),
      message: skippedPrivate ? `${skippedPrivate} private events excluded` : null,
    }],
  };
}

module.exports = { scrapeHouseOfPickle };
