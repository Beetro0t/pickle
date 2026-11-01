const cheerio = require("cheerio");
const {
  cleanText, priceObject, duprFromText, levelsFromText, sydneyLocalToISO,
  formatInTimeZone, weekdayInSydney, politeFetch, nowISO,
} = require("../lib");
const { VENUES } = require("../venues");

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function parseSessionDate(text) {
  const m = cleanText(text).match(/(?:mon|tue|wed|thu|fri|sat|sun),?\s+(\w{3})\s+(\d{1,2})\s+(\d{1,2}:\d{2})\s*(AM|PM)\s*[-–]\s*(\d{1,2}:\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  const today = formatInTimeZone(new Date(), "Australia/Sydney", "yyyy-MM-dd");
  let year = Number(today.slice(0, 4));
  const month = MONTHS[m[1].toLowerCase()];
  let date = `${year}-${String(month).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
  if (date < today) {
    year += 1;
    date = `${year}-${String(month).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
  }
  const to24 = (time, mer) => {
    const [h, min] = time.split(":").map(Number);
    let hh = h % 12;
    if (mer.toLowerCase() === "pm") hh += 12;
    return `${String(hh).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  };
  return {
    start: sydneyLocalToISO(date, to24(m[3], m[4])),
    end: sydneyLocalToISO(date, to24(m[5], m[6])),
    date,
  };
}

function categoryFor(category, name = "") {
  const c = String(category || "").toLowerCase();
  const n = String(name || "").toLowerCase();
  // The program title is more specific than the booking-platform category.
  if (/\bsocial play\b|\bopen play\b|\bsocial pickleball\b/.test(n)) return "social";
  if (/\b(learn to play|intro|introduction|101)\b/.test(n)) return "intro";
  if (/\bclinic|coaching|coached|fundamentals|skills?\b/.test(n)) return "coaching";
  if (c.includes("free learn")) return "intro";
  if (c.includes("clinic")) return "coaching";
  if (c.includes("competitive")) return "league";
  if (c.includes("tournament")) return "tournament";
  return "social";
}

async function scrapePickleballerz({ from = new Date() } = {}) {
  const startedAt = nowISO();
  const listings = [];
  const warnings = [];
  try {
    const listUrl = "https://book.pickleballerz.com.au/api/public/clinics?facility_id=1232&search=";
    const { body, fromCache } = await politeFetch(listUrl, { cacheKey: "pickleballerz-clinics", headers: { Accept: "application/json" } });
    const parsed = JSON.parse(body);
    const clinics = parsed.clinics || [];
    const venue = VENUES.find((v) => v.id === "pickleballerz-cardiff");
    let fetched = 0;
    for (const clinic of clinics) {
      if (!clinic.url) continue;
      const pageUrl = new URL(clinic.url, "https://book.pickleballerz.com.au").toString();
      try {
        const pageRes = await politeFetch(pageUrl, { cacheKey: `pickleballerz-${clinic.id}` });
        const $ = cheerio.load(pageRes.body);
        const items = $(".pbc_fk_item").toArray();
        const sessions = items.map((el) => {
          const text = cleanText($(el).text());
          const dates = parseSessionDate(text);
          if (!dates) return null;
          const status = /filled|full/i.test(text) ? "full" : /waitlist/i.test(text) ? "waitlist" : /cancel/i.test(text) ? "cancelled" : "open";
          return {
            ...dates,
            status,
            sourceOccurrenceId: $(el).find("[data-id]").first().attr("data-id") || `${clinic.id}-${dates.date}`,
          };
        }).filter(Boolean).filter((s) => new Date(s.end) >= from);
        if (!sessions.length) continue;
        const pricingText = `${$(".description").first().text()} ${cleanText($("body").text())}`;
        const memberMatch = pricingText.match(/\bMember\s*\$?([\d.]+)/i);
        const nonMemberMatch = pricingText.match(/Non[- ]?member\s*\$?([\d.]+)/i);
        const description = cleanText($(".program-description").first().text()).slice(0, 600);
        const category = categoryFor(clinic.category, clinic.name);
        const name = cleanText(clinic.name);
        const levels = levelsFromText(name);
        const dupr = duprFromText(name);
        const unit = /competitive|tournament/i.test(clinic.category) ? "per event" : "per session";
        for (const s of sessions) {
          listings.push({
            sourceId: "pickleballerz",
            sourceUrl: pageUrl,
            sourceTitle: name,
            sourceMethod: "Public program page",
            sourceLastChecked: nowISO(),
            sourceCached: pageRes.fromCache,
            groupKey: `pbz-${clinic.id}`,
            title: name,
            category,
            levels,
            duprRange: dupr,
            format: category === "league" ? "Competition" : category === "tournament" ? "Tournament" : category === "coaching" || category === "intro" ? "Coached session" : "Open rotation",
            indoor: venue.indoor,
            description: null,
            descriptionExcerpt: description || null,
            price: nonMemberMatch || memberMatch
              ? priceObject({
                  amount: nonMemberMatch ? Number(nonMemberMatch[1]) : Number(memberMatch[1]),
                  memberAmount: memberMatch ? Number(memberMatch[1]) : null,
                  unit,
                  notes: "Member and non-member prices as published",
                })
              : null,
            venue,
            organizer: {
              id: "pickleballerz",
              name: "Pickleballerz",
              website: "https://book.pickleballerz.com.au/f/PickleballerzAU",
              verified: true,
              sourceIds: ["pickleballerz"],
            },
            bookingUrl: pageUrl,
            officialUrl: pageUrl,
            membershipRequired: false,
            equipmentProvided: null,
            facilities: venue.facilities,
            region: "Newcastle & Lake Macquarie",
            occurrence: {
              start: s.start,
              end: s.end,
              status: s.status === "full" ? "full" : s.status === "cancelled" ? "cancelled" : "scheduled",
              registrationStatus: s.status === "full" ? "full" : s.status === "waitlist" ? "waitlist" : "open",
              spotsLeft: null,
              sourceId: "pickleballerz",
              sourceOccurrenceId: s.sourceOccurrenceId,
              url: pageUrl,
              note: s.status === "full" ? "Session is full on the organiser's page" : null,
            },
            verified: true,
          });
        }
        fetched++;
      } catch (err) {
        warnings.push(`${clinic.name}: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 220));
    }
    console.log(`pickleballerz: ${listings.length} sessions from ${fetched}/${clinics.length} programs`);
    return {
      listings,
      runs: [{
        sourceId: "pickleballerz",
        ok: true,
        status: fromCache ? "cached" : "ok",
        events: listings.length,
        fetchedAt: nowISO(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
        message: warnings.length ? `${warnings.length} program pages had no readable sessions` : null,
      }],
    };
  } catch (err) {
    return { listings, runs: [{ sourceId: "pickleballerz", ok: false, status: "failed", events: 0, fetchedAt: nowISO(), message: err.message }] };
  }
}

module.exports = { scrapePickleballerz };
