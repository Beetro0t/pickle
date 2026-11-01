const cheerio = require("cheerio");
const {
  cleanText, categoryFromText, priceObject, sydneyLocalToISO, parseAddress,
  politeFetch, nowISO, slugify,
} = require("../lib");
const { VENUES } = require("../venues");

const VENUE_ALIASES = {
  "gosford tennis/pickleball club": "gosford-tennis",
  "pcyc port macquarie": "pcyc-port-macquarie",
  "house of pickle darling harbour": "house-of-pickle-darling-harbour",
  "pcyc hawkesbury": "pcyc-hawkesbury",
  "hawkesbury pcyc": "pcyc-hawkesbury",
  "tween heads regional tennis centre": "tweed-heads-regional-tennis-centre",
  "tweed heads regional tennis centre": "tweed-heads-regional-tennis-centre",
  "sutherland basketball stadium": "sutherland-basketball-stadium",
  "shellharbour stadium": "shellharbour-stadium",
  "blacktown leisure centre, stanhope gardens": "blacktown-leisure-centre",
  "blacktown leisure centre": "blacktown-leisure-centre",
  "sneaky cat pickleball": "sneaky-cat-pickleball",
  "ballina indoor sports centre": "ballina-indoor-sports-centre",
  "iron arena": "iron-arena-taree",
  "peninsula leisure centre": "peninsula-leisure-centre",
};

function parseVenue(text) {
  const raw = cleanText(text.replace(/\s+/g, " "));
  if (!raw || /^online$/i.test(raw)) {
    return {
      id: "online",
      name: "Online",
      address: "Online",
      lat: null,
      lng: null,
      indoor: null,
      facilities: [],
      suburb: null,
      state: "NSW",
      postcode: null,
    };
  }
  const firstComma = raw.indexOf(",");
  const name = cleanText(firstComma > 0 ? raw.slice(0, firstComma) : raw);
  const address = cleanText(firstComma > 0 ? raw.slice(firstComma + 1) : raw);
  const aliasKey = name.toLowerCase().replace(/\s+/g, " ");
  const alias = VENUE_ALIASES[aliasKey];
  if (alias) {
    const known = VENUES.find((v) => v.id === alias);
    return { ...known, address: address || known.address };
  }
  const parsed = parseAddress(address);
  return {
    id: slugify(name),
    name,
    address,
    lat: null,
    lng: null,
    indoor: null,
    facilities: [],
    ...parsed,
  };
}

function parseClock(text) {
  // Sat 28 Nov 2026 07:00 - 17:00  |  Fri 30 Oct 2026 09:00 - Sun 01 Nov 2026 17:00
  const m = cleanText(text).match(
    /(?:mon|tue|wed|thu|fri|sat|sun)\s+(\d{1,2})\s+(\w{3})\s+(\d{4})\s+(\d{1,2}:\d{2})\s*[-–]\s*(?:(?:mon|tue|wed|thu|fri|sat|sun)\s+(\d{1,2})\s+(\w{3})\s+(\d{4})\s+)?(\d{1,2}:\d{2})/i
  );
  if (!m) return null;
  const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
  const startDate = `${m[3]}-${months[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
  const endDate = m[5] ? `${m[7]}-${months[m[6].toLowerCase()]}-${m[5].padStart(2, "0")}` : startDate;
  return { start: sydneyLocalToISO(startDate, m[4]), end: sydneyLocalToISO(endDate, m[8]), startLocal: `${startDate} ${m[4]}`, endLocal: `${endDate} ${m[8]}` };
}

function parseDatesFromCalendar($) {
  const link = $('a[href*="calendar.google.com/calendar/event"]').attr("href") || "";
  const m = link.match(/dates=(\d{8}T\d{6})\/(\d{8}T\d{6})/);
  if (!m) return null;
  const parse = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}`;
  const startLocal = parse(m[1]);
  const endLocal = parse(m[2]);
  return {
    start: sydneyLocalToISO(startLocal.slice(0, 10), startLocal.slice(11)),
    end: sydneyLocalToISO(endLocal.slice(0, 10), endLocal.slice(11)),
    startLocal,
    endLocal,
  };
}

async function scrapeNsw({ from = new Date() } = {}) {
  const startedAt = nowISO();
  const listings = [];
  const runs = [];
  try {
    const listRes = await politeFetch("https://www.pickleballnsw.org/events", { cacheKey: "pickleballnsw-events" });
    const $ = cheerio.load(listRes.body);
    const detailUrls = [...new Set(
      $('a[href*="/events/"]')
        .map((i, el) => $(el).attr("href"))
        .get()
        .filter((h) => /\/events\/\d+$/.test(h))
    )];
    console.log(`pickleballnsw: ${detailUrls.length} event detail pages`);

    for (const href of detailUrls) {
      const url = href.startsWith("http") ? href : `https://www.pickleballnsw.org${href}`;
      const id = url.match(/\/events\/(\d+)/)?.[1];
      try {
        const { body } = await politeFetch(url, { cacheKey: `nsw-event-${id}` });
        const d = cheerio.load(body);
        const title = cleanText(d("h1").first().text()) || `Pickleball NSW event ${id}`;
        const clockText = d(".fa-clock").first().parent().text();
        const dates = parseDatesFromCalendar(d) || parseClock(clockText);
        if (!dates || new Date(dates.end) < new Date(from.getTime() - 12 * 60 * 60 * 1000)) continue;
        const venueText = d(".fa-map-marker").first().parent().text();
        const venue = parseVenue(venueText);
        const infoHeader = d("h1").filter((i, el) => cleanText(d(el).text()) === "Event information").first();
        const info = infoHeader.length ? infoHeader.parent().next() : null;
        const descriptionRaw = info ? cleanText(info.text()) : "";
        const description = descriptionRaw.replace(/^Details to (come|be confirmed)\s*/i, "").slice(0, 700);
        const links = info ? info.find("a[href]").map((i, el) => ({ text: cleanText(d(el).text()), url: d(el).attr("href") })).get() : [];
        const registrationLink = links.find((l) =>
          /register|entry|enter|nominate|more information/i.test(l.text) ||
          /pickleballtournaments\.com|lobtrix\.com|sportsfix|revolutionise/i.test(l.url)
        );
        const fee = descriptionRaw.match(/(?:registration fee|entry fee|cost)\s*:?\s*\$(\d+(?:\.\d{2})?)/i);
        const isAgm = /\bagm\b|annual general meeting/i.test(title);
        const category = isAgm ? "other" : "tournament";
        listings.push({
          sourceId: "pickleball-nsw",
          sourceUrl: url,
          sourceTitle: title,
          sourceMethod: "Published event page",
          sourceLastChecked: nowISO(),
          sourceCached: listRes.fromCache,
          groupKey: `nsw-${id}`,
          title,
          category,
          levels: ["all"],
          duprRange: null,
          format: /mixed doubles/i.test(descriptionRaw) ? "Singles, gender doubles & mixed doubles" : null,
          indoor: venue.indoor,
          description: null,
          descriptionExcerpt: description || null,
          price: fee ? priceObject({ amount: Number(fee[1]), unit: "per player", notes: "Registration fee as published" }) : null,
          priceUnit: "per player",
          venue,
          organizer: {
            id: "pickleball-nsw",
            name: "Pickleball Association of NSW",
            website: "https://www.pickleballnsw.org/",
            verified: true,
            sourceIds: ["pickleball-nsw"],
          },
          bookingUrl: registrationLink?.url || null,
          officialUrl: url,
          membershipRequired: null,
          equipmentProvided: null,
          facilities: venue.facilities || [],
          region: "NSW",
          occurrence: {
            start: dates.start,
            end: dates.end,
            status: "scheduled",
            registrationStatus: "unknown",
            spotsLeft: null,
            sourceId: "pickleball-nsw",
            sourceOccurrenceId: id,
            url,
            note: registrationLink ? "Registration handled by the organiser" : null,
          },
          verified: true,
          featured: false,
          tournamentTier: /tier\s*\d/i.test(descriptionRaw) ? descriptionRaw.match(/tier\s*\d/i)?.[0] : null,
          sanctioned: /sanctioned/i.test(descriptionRaw) ? true : null,
        });
      } catch (err) {
        console.warn("nsw detail failed", url, err.message);
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    runs.push({ sourceId: "pickleball-nsw", ok: true, status: listRes.fromCache ? "cached" : "ok", events: listings.length, fetchedAt: nowISO(), durationMs: Date.now() - new Date(startedAt).getTime(), message: listRes.error || null });
  } catch (err) {
    runs.push({ sourceId: "pickleball-nsw", ok: false, status: "failed", events: 0, fetchedAt: nowISO(), message: err.message });
    console.warn("pickleballnsw failed", err.message);
  }
  return { listings, runs };
}

module.exports = { scrapeNsw };
