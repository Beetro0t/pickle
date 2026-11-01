const cheerio = require("cheerio");
const {
  cleanText, categoryFromText, levelsFromText, duprFromText, priceObject,
  makeVenue, makeOrganizer, nextOccurrencesFromWeekday, upcomingWeekly, sydneyLocalToISO,
  politeFetch, nowISO,
} = require("../lib");
const { VENUES } = require("../venues");

const venueById = (id) => VENUES.find((v) => v.id === id);

function inferMeridiem(startHour, endHour, startMer, endMer) {
  if (startMer) return startMer;
  if (endMer === "am") return "am";
  if (startHour >= 12) return "pm";
  if (endMer === "pm") {
    if (endHour === 12 && startHour >= 8) return "am";
    if (startHour <= 7) return "pm";
    if (endHour > startHour && endHour <= 11) return "am";
    return "pm";
  }
  return startHour < 7 ? "pm" : "am";
}

function to24(hour, minute, mer) {
  let h = Number(hour) % 12;
  if (mer === "pm") h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute || 0).padStart(2, "0")}`;
}

function parseTimeRanges(text) {
  const raw = cleanText(text).replace(/\./g, ":").replace(/\u2013/g, "-");
  if (/no sessions/i.test(raw)) return [];
  const re = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi;
  const matches = [...raw.matchAll(re)];
  return matches.map((m, idx) => {
    const sh = Number(m[1]);
    const eh = Number(m[4]);
    const startMer = inferMeridiem(sh, eh, m[3]?.toLowerCase(), m[6]?.toLowerCase());
    let endMer = m[6]?.toLowerCase() || startMer;
    if (startMer === "am" && endMer === "pm" && eh === 12) endMer = "pm";
    const nextStart = idx + 1 < matches.length ? matches[idx + 1].index : raw.length;
    const trailing = cleanText(raw.slice((m.index || 0) + m[0].length, nextStart)).replace(/^[\s,;&-]+/, "");
    return {
      start: to24(m[1], m[2], startMer),
      end: to24(m[4], m[5], endMer),
      note: trailing,
      label: cleanText(m[0]),
    };
  });
}

function dayFromHeader(text) {
  const t = cleanText(text).toLowerCase().slice(0, 3);
  return { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 }[t] || null;
}

function parseDayTable($, table) {
  const headers = $(table).find("thead th").map((i, th) => dayFromHeader($(th).text())).get();
  if (headers.filter(Boolean).length < 5) return [];
  const rows = [];
  $(table).find("tbody tr").each((i, tr) => {
    $(tr).find("td").each((col, td) => {
      const day = headers[col];
      if (!day) return;
      const text = cleanText($(td).text());
      if (!text) return;
      for (const range of parseTimeRanges(text)) rows.push({ day, ...range });
    });
  });
  return rows;
}

async function scrapePcycBateauLeagues({ from = new Date() } = {}) {
  const startedAt = nowISO();
  const listings = [];
  let runs = [];
  try {
    const { body, fromCache } = await politeFetch("https://www.pcycnsw.org.au/bateau-bay/", { cacheKey: "pcyc-bateau-bay" });
    const $ = cheerio.load(body);
    const tables = $("table").toArray();
    const leagueTable = tables[0];
    const rows = leagueTable ? parseDayTable($, leagueTable) : [];
    const venue = venueById("pcyc-bateau-bay");
    for (const row of rows) {
      const note = row.note || "";
      const ladies = /women|ladies/i.test(note);
      const title = ladies ? "PCYC Bateau Bay Women's Pickleball League" : "PCYC Bateau Bay Pickleball League";
      const occs = nextOccurrencesFromWeekday({ weekday: row.day, startTime: row.start, endTime: row.end, weeks: 8, from });
      occs.forEach((o, idx) => {
        listings.push({
          sourceId: "pcyc-bateau-bay",
          sourceUrl: "https://www.pcycnsw.org.au/bateau-bay/",
          sourceTitle: title,
          sourceMethod: "Published timetable",
          sourceLastChecked: nowISO(),
          groupKey: `league-${ladies ? "women" : "open"}-${row.start.replace(":", "")}`,
          title,
          category: "league",
          levels: ["intermediate", "advanced"],
          duprRange: null,
          format: "League",
          indoor: venue.indoor,
          description: null,
          price: priceObject({ amount: 125, unit: "per league", notes: "$125 per league + PCYC membership (as published)" }),
          venue,
          organizer: makeOrganizer({ id: "pcyc-bateau-bay", name: "PCYC Bateau Bay", website: "https://www.pcycnsw.org.au/bateau-bay/", verified: true, sourceIds: ["pcyc-bateau-bay"] }),
          bookingUrl: "https://pickleballleagues.com/",
          officialUrl: "https://www.pcycnsw.org.au/bateau-bay/",
          membershipRequired: true,
          equipmentProvided: null,
          facilities: venue.facilities,
          region: "Central Coast",
          occurrence: {
            start: o.start, end: o.end, status: "scheduled", registrationStatus: "unknown",
            spotsLeft: null, sourceId: "pcyc-bateau-bay", sourceOccurrenceId: `${row.day}-${row.start}-${idx}`,
            note: "Published league timetable; membership required",
          },
          verified: true,
        });
      });
    }
    runs = [{ sourceId: "pcyc-bateau-bay", ok: true, status: fromCache ? "cached" : "ok", events: listings.length, fetchedAt: nowISO(), durationMs: Date.now() - new Date(startedAt).getTime() }];
    console.log(`pcyc bateau leagues: ${listings.length} occurrences`);
  } catch (err) {
    runs = [{ sourceId: "pcyc-bateau-bay", ok: false, status: "failed", events: 0, fetchedAt: nowISO(), message: err.message }];
    console.warn("pcyc bateau failed", err.message);
  }
  return { listings, runs };
}

async function scrapePcycLakeMacquarie({ from = new Date() } = {}) {
  const startedAt = nowISO();
  const listings = [];
  try {
    const { body, fromCache } = await politeFetch("https://www.pcycnsw.org.au/lake-macquarie/", { cacheKey: "pcyc-lake-macquarie" });
    const $ = cheerio.load(body);
    const tables = $("table").toArray();
    const pickleballTable = tables[0];
    const rows = pickleballTable ? parseDayTable($, pickleballTable) : [];
    const venue = venueById("pcyc-lake-macquarie");
    for (const row of rows) {
      const occs = nextOccurrencesFromWeekday({ weekday: row.day, startTime: row.start, endTime: row.end, weeks: 8, from });
      occs.forEach((o, idx) => {
        listings.push({
          sourceId: "pcyc-lake-macquarie",
          sourceUrl: "https://www.pcycnsw.org.au/lake-macquarie/",
          sourceTitle: "PCYC Lake Macquarie Pickleball",
          sourceMethod: "Published timetable",
          sourceLastChecked: nowISO(),
          groupKey: "pcyc-lake-pickleball",
          title: "PCYC Lake Macquarie Pickleball",
          category: "social",
          levels: ["all"],
          duprRange: null,
          format: "Open rotation",
          indoor: venue.indoor,
          description: null,
          price: priceObject({ amount: 12, unit: "per session" }),
          venue,
          organizer: makeOrganizer({ id: "pcyc-lake-macquarie", name: "PCYC Lake Macquarie", website: "https://www.pcycnsw.org.au/lake-macquarie/", verified: true, sourceIds: ["pcyc-lake-macquarie"] }),
          bookingUrl: "https://www.pcycnsw.org.au/lake-macquarie/",
          officialUrl: "https://www.pcycnsw.org.au/lake-macquarie/",
          membershipRequired: null,
          equipmentProvided: null,
          facilities: venue.facilities,
          region: "Lake Macquarie",
          occurrence: {
            start: o.start, end: o.end, status: "scheduled", registrationStatus: "unknown",
            spotsLeft: null, sourceId: "pcyc-lake-macquarie", sourceOccurrenceId: `${row.day}-${row.start}-${idx}`,
            note: "School holiday times vary — check with the club",
          },
          verified: true,
        });
      });
    }
    return {
      listings,
      runs: [{ sourceId: "pcyc-lake-macquarie", ok: true, status: fromCache ? "cached" : "ok", events: listings.length, fetchedAt: nowISO(), durationMs: Date.now() - new Date(startedAt).getTime() }],
    };
  } catch (err) {
    return { listings, runs: [{ sourceId: "pcyc-lake-macquarie", ok: false, status: "failed", events: 0, fetchedAt: nowISO(), message: err.message }] };
  }
}

async function scrapeWoyWoy({ from = new Date() } = {}) {
  const startedAt = nowISO();
  const listings = [];
  try {
    const { body, fromCache } = await politeFetch("https://www.revolutionise.com.au/ccpww/woy-woy-sessions", { cacheKey: "woy-woy-sessions" });
    const $ = cheerio.load(body);
    const text = cleanText($("body").text());
    const venue = venueById("peninsula-leisure-centre");
    const pattern = /(Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)):\s*"?([A-Z/ ]+)"?\s+on\s+(\d+)\s+indoor courts/gi;
    let m;
    while ((m = pattern.exec(text))) {
      const dayMap = { saturday: 6, sunday: 7, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
      const day = dayMap[m[1].toLowerCase()];
      const range = parseTimeRanges(`${m[2]} - ${m[3]}`)[0];
      if (!range) continue;
      const { start, end } = range;
      const code = cleanText(m[4]).toUpperCase().replace(/\s+/g, " ").trim();
      const codeLabel = { LI: "Lower Intermediate", INT: "Intermediate", "INT ONLY": "Intermediate (no beginners)", HI: "Higher Intermediate", ADV: "Advanced" };
      const label = code === "INT ONLY" ? codeLabel[code] : code.split("/").map((c) => codeLabel[c.trim()] || c.trim()).join(" / ");
      const levelSet = new Set();
      if (code.includes("LI")) levelSet.add("beginner");
      if (code.includes("INT")) levelSet.add("intermediate");
      if (code.includes("HI") || code.includes("ADV")) levelSet.add("advanced");
      const levels = levelSet.size ? [...levelSet] : ["all"];
      const title = `Woy Woy Social Play — ${label}`;
      const occs = nextOccurrencesFromWeekday({ weekday: day, startTime: start, endTime: end, weeks: 8, from });
      occs.forEach((o, idx) => {
        listings.push({
          sourceId: "woy-woy-pickleball",
          sourceUrl: "https://www.revolutionise.com.au/ccpww/woy-woy-sessions",
          sourceTitle: title,
          sourceMethod: "Published timetable",
          sourceLastChecked: nowISO(),
          groupKey: `woywoy-${code}-${start.replace(":", "")}`,
          title,
          category: "social",
          levels,
          duprRange: null,
          format: "Open rotation",
          indoor: true,
          description: null,
          price: null,
          venue,
          organizer: makeOrganizer({ id: "woy-woy-pickleball", name: "Woy Woy Pickleball Club", website: "https://www.revolutionise.com.au/ccpww", verified: true, sourceIds: ["woy-woy-pickleball"] }),
          bookingUrl: "https://www.revolutionise.com.au/ccpww/woy-woy-sessions",
          officialUrl: "https://www.revolutionise.com.au/ccpww/woy-woy-sessions",
          membershipRequired: true,
          equipmentProvided: null,
          facilities: venue.facilities,
          region: "Central Coast",
          occurrence: {
            start: o.start, end: o.end, status: "scheduled", registrationStatus: "unknown",
            spotsLeft: null, sourceId: "woy-woy-pickleball", sourceOccurrenceId: `${day}-${m[2]}-${idx}`,
            note: "Club members or invitation only; published timetable",
          },
          verified: true,
        });
      });
    }
    console.log(`woy woy: ${listings.length} occurrences`);
    return { listings, runs: [{ sourceId: "woy-woy-pickleball", ok: true, status: fromCache ? "cached" : "ok", events: listings.length, fetchedAt: nowISO(), durationMs: Date.now() - new Date(startedAt).getTime() }] };
  } catch (err) {
    return { listings, runs: [{ sourceId: "woy-woy-pickleball", ok: false, status: "failed", events: 0, fetchedAt: nowISO(), message: err.message }] };
  }
}

async function scrapeBarBeach({ from = new Date() } = {}) {
  const startedAt = nowISO();
  const listings = [];
  try {
    const { body, fromCache } = await politeFetch("https://www.barbeachallsports.com.au/pickleball/", { cacheKey: "bar-beach-pickleball" });
    const venue = venueById("bar-beach-all-sports");
    const sessions = [
      { title: "Bar Beach Social Pickleball", day: 1, start: "09:00", end: "11:00", price: 10, note: "Monday morning social session" },
      { title: "Bar Beach Social Pickleball", day: 1, start: "17:15", end: "18:30", price: 10, note: "Monday evening social session" },
      { title: "Bar Beach Social Pickleball", day: 2, start: "17:30", end: "19:00", price: 10, note: "Tuesday evening social session" },
      { title: "Bar Beach Social Pickleball", day: 2, start: "19:00", end: "20:30", price: 10, note: "Tuesday evening social session" },
      { title: "Bar Beach Social Pickleball", day: 5, start: "09:00", end: "11:00", price: 12, note: "Friday morning social session" },
      { title: "Bar Beach Junior Pickleball", day: 5, start: "16:00", end: "17:00", price: 10, note: "Juniors — taking expressions of interest", category: "junior" },
      { title: "Bar Beach Social Pickleball", day: 7, start: "15:30", end: "17:00", price: 12, note: "Sunday afternoon social session" },
      { title: "Bar Beach Pickleball Ladder Competition", day: 1, start: "18:30", end: "20:00", price: 15, note: "Term-based ladder competition; $150 for 10 weeks", category: "league" },
      { title: "Bar Beach Doubles Competition", day: 3, start: "18:00", end: "20:00", price: 150, note: "Intermediate to advanced doubles; $150 per 10-week comp", category: "league", priceUnit: "per competition" },
      { title: "Bar Beach Advanced Drills & Match Play", day: 3, start: "18:00", end: "20:00", price: 10, note: "Invitational advanced drills and match play", category: "coaching" },
    ];
    const pageText = cleanText(cheerio.load(body)("body").text());
    const pageOk =
      /SOCIAL SESSIONS/i.test(pageText) &&
      /COMPETITIONS/i.test(pageText) &&
      /5:15pm\s*[–-]\s*6:30pm/i.test(pageText) &&
      /\$150 per 10 wk Comp/i.test(pageText) &&
      /Advanced Drills & MATCH PLAY/i.test(pageText);
    if (!pageOk) throw new Error("Bar Beach timetable markers not found or changed");
    for (const s of sessions) {
      const occs = nextOccurrencesFromWeekday({ weekday: s.day, startTime: s.start, endTime: s.end, weeks: 8, from });
      occs.forEach((o, idx) => {
        listings.push({
          sourceId: "bar-beach",
          sourceUrl: "https://www.barbeachallsports.com.au/pickleball/",
          sourceTitle: s.title,
          sourceMethod: "Published timetable",
          sourceLastChecked: nowISO(),
          groupKey: `${s.title}-${s.start.replace(":", "")}`,
          title: s.title,
          category: s.category || "social",
          levels: s.category === "league" ? ["intermediate", "advanced"] : s.category === "coaching" ? ["advanced"] : ["all"],
          duprRange: null,
          format: s.category === "league" ? "Graded ladder" : s.category === "coaching" ? "Coached session" : "Open rotation",
          indoor: venue.indoor,
          description: null,
          price: priceObject({ amount: s.price, unit: s.priceUnit || "per session", notes: s.note }),
          venue,
          organizer: makeOrganizer({ id: "bar-beach-all-sports", name: "Bar Beach All Sports", website: "https://www.barbeachallsports.com.au/pickleball/", verified: true, sourceIds: ["bar-beach"] }),
          bookingUrl: "https://www.barbeachallsports.com.au/pickleball/",
          officialUrl: "https://www.barbeachallsports.com.au/pickleball/",
          membershipRequired: false,
          equipmentProvided: null,
          facilities: venue.facilities,
          region: "Newcastle",
          occurrence: {
            start: o.start, end: o.end, status: "scheduled", registrationStatus: "unknown",
            spotsLeft: null, sourceId: "bar-beach", sourceOccurrenceId: `${s.day}-${s.start}-${idx}`,
            note: s.note,
          },
          verified: true,
        });
      });
    }
    return { listings, runs: [{ sourceId: "bar-beach", ok: true, status: fromCache ? "cached" : "ok", events: listings.length, fetchedAt: nowISO(), durationMs: Date.now() - new Date(startedAt).getTime() }] };
  } catch (err) {
    return { listings, runs: [{ sourceId: "bar-beach", ok: false, status: "failed", events: 0, fetchedAt: nowISO(), message: err.message }] };
  }
}

async function scrapeStockton({ from = new Date() } = {}) {
  const startedAt = nowISO();
  const listings = [];
  try {
    const { body, fromCache } = await politeFetch("https://play.tennis.com.au/stocktontennisclub/CompsSocial/Pickleball", { cacheKey: "stockton-pickleball" });
    const text = cleanText(cheerio.load(body)("body").text());
    if (!/Thursday and Sunday mornings from 9am to 11am/i.test(text)) throw new Error("Stockton timetable markers not found");
    const venue = venueById("stockton-tennis");
    for (const day of [4, 7]) {
      const occs = nextOccurrencesFromWeekday({ weekday: day, startTime: "09:00", endTime: "11:00", weeks: 8, from });
      occs.forEach((o, idx) => {
        listings.push({
          sourceId: "stockton-tennis",
          sourceUrl: "https://play.tennis.com.au/stocktontennisclub/CompsSocial/Pickleball",
          sourceTitle: "Stockton Social Pickleball",
          sourceMethod: "Published timetable",
          sourceLastChecked: nowISO(),
          groupKey: "stockton-social",
          title: "Stockton Social Pickleball",
          category: "social",
          levels: ["all"],
          duprRange: null,
          format: "Open rotation",
          indoor: false,
          description: null,
          price: priceObject({ amount: 10, unit: "per session", notes: "$10 per session, or $5 if you bring your own paddle" }),
          venue,
          organizer: makeOrganizer({ id: "stockton-tennis", name: "Stockton Tennis Club", website: "https://play.tennis.com.au/stocktontennisclub", verified: true, sourceIds: ["stockton-tennis"] }),
          bookingUrl: "https://play.tennis.com.au/stocktontennisclub/CompsSocial/Pickleball",
          officialUrl: "https://play.tennis.com.au/stocktontennisclub/CompsSocial/Pickleball",
          membershipRequired: false,
          equipmentProvided: true,
          facilities: venue.facilities,
          region: "Newcastle",
          occurrence: {
            start: o.start, end: o.end, status: "scheduled", registrationStatus: "unknown",
            spotsLeft: null, sourceId: "stockton-tennis", sourceOccurrenceId: `${day}-${idx}`,
            note: "Equipment provided; bring your own paddle for the reduced rate",
          },
          verified: true,
        });
      });
    }
    return { listings, runs: [{ sourceId: "stockton-tennis", ok: true, status: fromCache ? "cached" : "ok", events: listings.length, fetchedAt: nowISO(), durationMs: Date.now() - new Date(startedAt).getTime() }] };
  } catch (err) {
    return { listings, runs: [{ sourceId: "stockton-tennis", ok: false, status: "failed", events: 0, fetchedAt: nowISO(), message: err.message }] };
  }
}

async function scrapeYwca({ from = new Date() } = {}) {
  const startedAt = nowISO();
  const listings = [];
  try {
    const { body, fromCache } = await politeFetch("https://www.ywcahunterregion.org.au/pickleball", { cacheKey: "ywca-pickleball" });
    const text = cleanText(cheerio.load(body)("body").text());
    if (!/Fridays \(term-time\) 12pm - 1pm/i.test(text)) throw new Error("YWCA timetable marker not found");
    const venue = venueById("ywca-hunter");
    const occs = nextOccurrencesFromWeekday({ weekday: 5, startTime: "12:00", endTime: "13:00", weeks: 8, from });
    occs.forEach((o, idx) => {
      listings.push({
        sourceId: "ywca-hunter",
        sourceUrl: "https://www.ywcahunterregion.org.au/pickleball",
        sourceTitle: "YWCA Friday Social Pickleball",
        sourceMethod: "Published timetable",
        sourceLastChecked: nowISO(),
        groupKey: "ywca-friday",
        title: "YWCA Friday Social Pickleball",
        category: "social",
        levels: ["all"],
        duprRange: null,
        format: "Open rotation",
        indoor: null,
        description: null,
        price: priceObject({ amount: 10, unit: "per person" }),
        venue,
        organizer: makeOrganizer({ id: "ywca-hunter", name: "YWCA Hunter Region", website: "https://www.ywcahunterregion.org.au/pickleball", verified: true, sourceIds: ["ywca-hunter"] }),
        bookingUrl: "https://www.ywcahunterregion.org.au/pickleball",
        officialUrl: "https://www.ywcahunterregion.org.au/pickleball",
        membershipRequired: false,
        equipmentProvided: true,
        facilities: venue.facilities,
        region: "Newcastle",
        occurrence: {
          start: o.start, end: o.end, status: "scheduled", registrationStatus: "unknown",
          spotsLeft: 8 - 0, sourceId: "ywca-hunter", sourceOccurrenceId: `fri-${idx}`,
          note: "Term-time only; max 8 players; published on the YWCA program page",
        },
        verified: true,
      });
    });
    return { listings, runs: [{ sourceId: "ywca-hunter", ok: true, status: fromCache ? "cached" : "ok", events: listings.length, fetchedAt: nowISO(), durationMs: Date.now() - new Date(startedAt).getTime() }] };
  } catch (err) {
    return { listings, runs: [{ sourceId: "ywca-hunter", ok: false, status: "failed", events: 0, fetchedAt: nowISO(), message: err.message }] };
  }
}

function previousHeading($, table) {
  let last = "";
  $("h1,h2,h3,h4,h5,table").each((i, el) => {
    if (el === table) return false;
    if (/^h[1-5]$/i.test(el.tagName)) last = cleanText($(el).text());
    return undefined;
  });
  return last;
}

async function scrapeVoyager({ from = new Date() } = {}) {
  const startedAt = nowISO();
  const listings = [];
  try {
    const { body, fromCache } = await politeFetch("https://www.voyagertennis.com/our-locations/gpb/", { cacheKey: "voyager-gosford" });
    const $ = cheerio.load(body);
    const venue = venueById("gosford-tennis");
    const tables = $("table").toArray();
    const configs = [
      { index: 0, category: "coaching", prefix: "Voyager Coaching" },
      { index: 1, category: "social", prefix: "Voyager Social Matchplay" },
      { index: 2, category: "social", prefix: "Voyager DUPR Matchplay" },
      { index: 3, category: "league", prefix: "Voyager League" },
    ];
    for (const cfg of configs) {
      const table = tables[cfg.index];
      if (!table) continue;
      const heading = previousHeading($, table);
      if (!/coaching|social|dupr|league/i.test(heading)) throw new Error(`Unexpected Voyager table heading: ${heading}`);
      const rows = [];
      $(table).find("tbody tr, tr").each((i, tr) => {
        const cells = $(tr).find("td").map((j, td) => cleanText($(td).text())).get();
        if (cells.length < 3) return;
        const dayMap = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };
        const day = dayMap[cells[0].toLowerCase()];
        const range = parseTimeRanges(cells[1])[0];
        if (!day || !range) return;
        const link = $(tr).find("a[href*='classhub']").attr("href") || null;
        const standard = cleanText(cells[2]);
        rows.push({ day, ...range, standard, link });
      });
      for (const row of rows) {
        const title = `${cfg.prefix} — ${row.standard || "All Levels"}`;
        const occs = nextOccurrencesFromWeekday({ weekday: row.day, startTime: row.start, endTime: row.end, weeks: 8, from });
        occs.forEach((o, idx) => {
          listings.push({
            sourceId: "voyager-gosford",
            sourceUrl: "https://www.voyagertennis.com/our-locations/gpb/",
            sourceTitle: title,
            sourceMethod: "Published timetable",
            sourceLastChecked: nowISO(),
            groupKey: `voyager-${cfg.prefix}-${row.start.replace(":", "")}-${row.standard}`.toLowerCase(),
            title,
            category: cfg.category,
            levels: levelsFromText(row.standard || "all levels"),
            duprRange: duprFromText(row.standard),
            format: cfg.category === "league" ? "League" : cfg.category === "coaching" ? "Coached session" : "Doubles matchplay",
            indoor: null,
            description: null,
            price: null,
            venue,
            organizer: makeOrganizer({ id: "voyager-gosford", name: "Voyager Pickleball Gosford", website: "https://www.voyagertennis.com/our-locations/gpb/", verified: true, sourceIds: ["voyager-gosford"] }),
            bookingUrl: row.link,
            officialUrl: "https://www.voyagertennis.com/our-locations/gpb/",
            membershipRequired: false,
            equipmentProvided: null,
            facilities: venue.facilities,
            region: "Central Coast",
            occurrence: {
              start: o.start, end: o.end, status: "scheduled", registrationStatus: "unknown",
              spotsLeft: null, sourceId: "voyager-gosford", sourceOccurrenceId: `${row.day}-${row.start}-${idx}`,
              url: row.link,
              note: "Published timetable; prices and dates are confirmed on the linked ClassHub registration page",
            },
            verified: true,
          });
        });
      }
      // The published tournament table is a dated event rather than a weekly one.
      if (cfg.index === 3) {
        const tournamentRow = tables[5] ? cleanText($(tables[5]).text()) : "";
        if (/12\s*-\s*13\s*Dec/i.test(tournamentRow) && /Pickleball Cup/i.test(tournamentRow)) {
          listings.push({
            sourceId: "voyager-gosford",
            sourceUrl: "https://www.voyagertennis.com/our-locations/gpb/",
            sourceTitle: "Pickleball Cup — Gosford",
            sourceMethod: "Published events table",
            sourceLastChecked: nowISO(),
            groupKey: "pickleball-cup-gosford-2026",
            title: "Pickleball Cup — Gosford",
            category: "tournament",
            levels: ["all"],
            duprRange: null,
            format: "Tournament",
            indoor: null,
            description: null,
            price: null,
            venue,
            organizer: makeOrganizer({ id: "voyager-gosford", name: "Voyager Pickleball Gosford", website: "https://www.voyagertennis.com/our-locations/gpb/", verified: true, sourceIds: ["voyager-gosford"] }),
            bookingUrl: "https://pickleballtournaments.com/tournaments/central-coast-pickleball-championships",
            officialUrl: "https://www.voyagertennis.com/our-locations/gpb/",
            membershipRequired: false,
            equipmentProvided: null,
            facilities: venue.facilities,
            region: "Central Coast",
            occurrence: {
              start: sydneyLocalToISO("2026-12-12", "09:00"), end: sydneyLocalToISO("2026-12-13", "17:00"),
              status: "scheduled", registrationStatus: "unknown", spotsLeft: null,
              sourceId: "voyager-gosford", sourceOccurrenceId: "pickleball-cup-2026",
              url: "https://pickleballtournaments.com/tournaments/central-coast-pickleball-championships",
              note: "Dates as published on the venue page",
            },
            verified: true,
          });
        }
      }
    }
    console.log(`voyager: ${listings.length} occurrences`);
    return { listings, runs: [{ sourceId: "voyager-gosford", ok: true, status: fromCache ? "cached" : "ok", events: listings.length, fetchedAt: nowISO(), durationMs: Date.now() - new Date(startedAt).getTime() }] };
  } catch (err) {
    return { listings, runs: [{ sourceId: "voyager-gosford", ok: false, status: "failed", events: 0, fetchedAt: nowISO(), message: err.message }] };
  }
}

module.exports = {
  scrapePcycBateauLeagues,
  scrapePcycLakeMacquarie,
  scrapeWoyWoy,
  scrapeBarBeach,
  scrapeStockton,
  scrapeYwca,
  scrapeVoyager,
  parseTimeRanges,
};
