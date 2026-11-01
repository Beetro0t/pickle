const cheerio = require("cheerio");
const {
  cleanText, priceObject, sydneyLocalToISO, formatInTimeZone, politeFetch, nowISO,
} = require("../lib");
const { VENUES } = require("../venues");

const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

function parseVariantDate(name) {
  const m = cleanText(name).match(/(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+(\d{4}))?/i);
  if (!m) return null;
  const time = cleanText(name).match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!time) return null;
  const to24 = (h, min, mer) => {
    let hh = Number(h) % 12;
    if (mer.toLowerCase() === "pm") hh += 12;
    return `${String(hh).padStart(2, "0")}:${String(min || 0).padStart(2, "0")}`;
  };
  const startTime = to24(time[1], time[2], time[3]);
  const endTime = to24(time[4], time[5], time[6]);
  const month = MONTHS[m[2].toLowerCase()];
  const today = formatInTimeZone(new Date(), "Australia/Sydney", "yyyy-MM-dd");
  let year = m[3] ? Number(m[3]) : Number(today.slice(0, 4));
  const candidate = `${year}-${String(month).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  if (!m[3] && candidate < today) year += 1;
  const date = `${year}-${String(month).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  return { start: sydneyLocalToISO(date, startTime), end: sydneyLocalToISO(date, endTime), date, startTime, endTime };
}

async function scrapeDink({ from = new Date() } = {}) {
  const startedAt = nowISO();
  const listings = [];
  try {
    const url = "https://www.thedinksociety.com.au/products/pickleball-social-sessions-sunday-afternoons";
    const { body, fromCache } = await politeFetch(url, { cacheKey: "dink-society" });
    const $ = cheerio.load(body);
    let group = null;
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const data = JSON.parse($(el).text());
        if (data["@type"] === "ProductGroup" && Array.isArray(data.hasVariant)) group = data;
      } catch {}
    });
    if (!group) throw new Error("Dink Society ProductGroup structured data not found");
    const venue = VENUES.find((v) => v.id === "peninsula-leisure-centre");
    for (const variant of group.hasVariant) {
      const dates = parseVariantDate(variant.name);
      if (!dates) continue;
      if (new Date(dates.end) < from) continue;
      const offer = variant.offers || {};
      const price = offer.price != null ? priceObject({ amount: Number(offer.price), unit: "per player" }) : null;
      const inStock = !offer.availability || /InStock/i.test(offer.availability);
      listings.push({
        sourceId: "dink-society",
        sourceUrl: url,
        sourceTitle: "Dink Society Sunday Social",
        sourceMethod: "Structured product data (JSON-LD)",
        sourceLastChecked: nowISO(),
        groupKey: "sunday-social",
        title: "Sunday Social Pickleball",
        category: "social",
        levels: ["beginner"],
        duprRange: null,
        format: "Open rotation",
        indoor: true,
        description: null,
        descriptionExcerpt: "Beginner-friendly social play at Peninsula Leisure Centre. Balls and nets provided; bring a paddle or borrow one. Limited to 16 players per session.",
        price,
        venue,
        organizer: {
          id: "dink-society",
          name: "The Dink Society",
          website: "https://www.thedinksociety.com.au/",
          verified: true,
          sourceIds: ["dink-society"],
        },
        bookingUrl: variant.offers?.url || url,
        officialUrl: url,
        membershipRequired: false,
        equipmentProvided: true,
        facilities: ["Indoor courts", "Balls and nets provided", "Paddles available"],
        region: "Central Coast",
        occurrence: {
          start: dates.start,
          end: dates.end,
          status: inStock ? "scheduled" : "full",
          registrationStatus: inStock ? "open" : "full",
          spotsLeft: null,
          sourceId: "dink-society",
          sourceOccurrenceId: variant.offers?.["@id"] || variant["@id"] || dates.date,
          url: variant.offers?.url || url,
          note: "Choose this date on the organiser's booking page",
        },
        verified: true,
        featured: false,
      });
    }
    console.log(`dink society: ${listings.length} dated sessions`);
    return { listings, runs: [{ sourceId: "dink-society", ok: true, status: fromCache ? "cached" : "ok", events: listings.length, fetchedAt: nowISO(), durationMs: Date.now() - new Date(startedAt).getTime() }] };
  } catch (err) {
    return { listings, runs: [{ sourceId: "dink-society", ok: false, status: "failed", events: 0, fetchedAt: nowISO(), message: err.message }] };
  }
}

module.exports = { scrapeDink };
