const cheerio = require("cheerio");
const { cleanText, politeFetch, nowISO } = require("../lib");

async function checkCityOfSydney() {
  const startedAt = nowISO();
  try {
    const { body, fromCache } = await politeFetch(
      "https://cityofsydneyleisure.com.au/visit/cook-phillip-park-pool/indoor-sports-court/pickleball",
      { cacheKey: "city-of-sydney-pickleball" }
    );
    const text = cleanText(cheerio.load(body)("body").text());
    const ok = /Monday:.*8:30am to 11am/i.test(text) && /Cook \+ Phillip Park/i.test(text);
    if (!ok) throw new Error("Published timetable markers not found");
    return {
      listings: [],
      runs: [{
        sourceId: "city-of-sydney-leisure",
        ok: true,
        status: fromCache ? "cached" : "ok",
        events: 0,
        fetchedAt: nowISO(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
        message: "Weekly schedule verified; dated sessions come from the linked OpenSports calendar.",
      }],
    };
  } catch (err) {
    return { listings: [], runs: [{ sourceId: "city-of-sydney-leisure", ok: false, status: "failed", events: 0, fetchedAt: nowISO(), message: err.message }] };
  }
}

async function checkHunterTimetable() {
  const startedAt = nowISO();
  try {
    const { body, fromCache } = await politeFetch(
      "https://www.revolutionise.com.au/thehunterpickleballa/where-to-play-our-venues",
      { cacheKey: "hunter-venues" }
    );
    const text = cleanText(cheerio.load(body)("body").text());
    const ok = /Venues & Sessions/i.test(text) && /Broadmeadow \(Basketball Stadium\)/i.test(text);
    if (!ok) throw new Error("Hunter timetable markers not found");
    return {
      listings: [],
      runs: [{
        sourceId: "hunter-pickleball",
        ok: true,
        status: fromCache ? "cached" : "ok",
        events: 0,
        fetchedAt: nowISO(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
        message: "Venue timetable verified; dated sessions come from the linked OpenSports calendar.",
      }],
    };
  } catch (err) {
    return { listings: [], runs: [{ sourceId: "hunter-pickleball", ok: false, status: "failed", events: 0, fetchedAt: nowISO(), message: err.message }] };
  }
}

module.exports = { checkCityOfSydney, checkHunterTimetable };
