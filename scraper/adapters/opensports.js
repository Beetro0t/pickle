const {
  cleanText, normalizeTitle, categoryFromText, levelsFromText, duprFromText,
  priceObject, weekdayInSydney, formatTimeInSydney, politeFetch, nowISO,
} = require("../lib");
const { VENUES } = require("../venues");

const GROUPS = [
  {
    sourceId: "opensports-hunter",
    alias: "hunter-pickleball-inc",
    organizerId: "hunter-pickleball",
    organizerName: "Hunter Pickleball Inc",
    organizerWebsite: "https://www.revolutionise.com.au/thehunterpickleballa",
    region: "Newcastle & Hunter",
  },
  {
    sourceId: "opensports-terrigal",
    alias: "terrigal-pickleball",
    organizerId: "terrigal-pickleball",
    organizerName: "Terrigal Pickleball",
    organizerWebsite: "https://terrigalpickleball.com.au/",
    region: "Central Coast",
  },
  {
    sourceId: "opensports-coasties",
    alias: "coasties-pickleball-club",
    organizerId: "coasties-pickleball",
    organizerName: "Coasties Pickleball Club",
    organizerWebsite: "https://www.coastiespickleball.com.au/",
    region: "Central Coast",
  },
  {
    sourceId: "opensports-lmpc",
    alias: "lmpci",
    organizerId: "lake-macquarie-pickleball",
    organizerName: "Lake Macquarie Pickleball Club",
    organizerWebsite: "https://www.lmpci.com.au/",
    region: "Lake Macquarie",
  },
  {
    sourceId: "opensports-sydney-city",
    alias: "sydney-city-pickleball",
    organizerId: "sydney-city-pickleball",
    organizerName: "Sydney City Pickleball",
    organizerWebsite: "https://cityofsydneyleisure.com.au/visit/cook-phillip-park-pool/indoor-sports-court/pickleball",
    region: "Sydney",
  },
  {
    sourceId: "opensports-pcyc-bateau",
    alias: "pcyc-bateau-bay-pickleball",
    organizerId: "pcyc-bateau-bay",
    organizerName: "PCYC Bateau Bay",
    organizerWebsite: "https://www.pcycnsw.org.au/bateau-bay/",
    region: "Central Coast",
    membershipRequired: true,
  },
];

const VENUE_ALIASES = {
  "newcastle basketball stadium": "newcastle-basketball-stadium",
  "broadmeadow basketball stadium": "newcastle-basketball-stadium",
  "hunter badminton": "hunter-badminton",
  "marks oval": "marks-oval",
  "marks oval playground": "marks-oval",
  "sports parc": "sports-parc-cooks-hill",
  "cooranbong park sports complex": "cooranbong-park",
  "dandaloo st": "kariong-courts",
  "lake haven recreation centre": "lake-haven-rec-centre",
  "guzman y gomez stadium": "terrigal-guzman-stadium",
  "cook+phillip park pool": "cook-phillip-park",
  "bateau bay pcyc": "pcyc-bateau-bay",
  pcyc: "pcyc-bateau-bay",
  "460 the entrance rd": "pcyc-bateau-bay",
  "peninsula leisure centre": "peninsula-leisure-centre",
};

function venueFor(event) {
  const place = event.place;
  if (!place) return null;
  const alias = VENUE_ALIASES[normalizeTitle(place.title)];
  if (alias) {
    const known = VENUES.find((v) => v.id === alias);
    return { ...known, lat: known.lat ?? place.latlng?.latitude, lng: known.lng ?? place.latlng?.longitude };
  }
  return {
    id: normalizeTitle(place.title).replace(/\s+/g, "-") || "unknown-venue",
    name: cleanText(place.title),
    address: cleanText(place.address || ""),
    lat: place.latlng?.latitude ?? null,
    lng: place.latlng?.longitude ?? null,
    indoor: null,
    facilities: [],
  };
}

function groupTitleKey(group, title) {
  let t = cleanText(title);
  if (group.alias === "lmpci") t = t.replace(/NB\.?\s*START TIME CHANGED/gi, "");
  return normalizeTitle(t);
}

function formatFromTitle(title) {
  const t = title.toLowerCase();
  if (/same[- ]partner/.test(t)) return "Same-partner round robin";
  if (/round robin/.test(t)) return "Round robin";
  if (/king(s)? (and|&) queen(s)?|king of the court|queen of the court/.test(t)) return "King/Queen of the court";
  if (/singles/.test(t)) return "Singles";
  if (/doubles/.test(t)) return "Doubles";
  if (/open play|social play|drop in/.test(t)) return "Open rotation";
  return null;
}

function isCancelled(event) {
  return event.statusOverride === 400 || event.status === 400 || event.isCanceled === true;
}

function priceFromTickets(tickets = []) {
  const valid = tickets.filter((t) => typeof t.price === "number");
  if (!valid.length) return null;
  const amounts = valid.map((t) => t.price);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  return priceObject({
    min,
    max,
    unit: "per player",
    notes: min !== max ? "Price varies by ticket type" : "",
  });
}

async function fetchGroup(group) {
  const api = `https://osapi.opensports.ca/groups/layouts/tabs/listOne?groupAliasID=${group.alias}&key=events&optionalFields%5B%5D=attendees&optionalFields%5B%5D=going&optionalFields%5B%5D=waitlisted&optionalFields%5B%5D=userOrders&optionalFields%5B%5D=waitlistUser&optionalFields%5B%5D=waitlist&limit=500`;
  const { body, fromCache, error } = await politeFetch(api, { cacheKey: `opensports-${group.alias}`, headers: { Accept: "application/json" } });
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(`OpenSports returned non-JSON for ${group.alias}`);
  }
  const events = data?.result?.data;
  if (!Array.isArray(events)) throw new Error(`OpenSports returned no event list for ${group.alias}`);
  return { events, fromCache, error };
}

async function scrapeOpenSports({ from = new Date() } = {}) {
  const listings = [];
  const runs = [];
  for (const group of GROUPS) {
    const startedAt = nowISO();
    try {
      const { events, fromCache, error } = await fetchGroup(group);
      let kept = 0;
      for (const e of events) {
        if (!e.isPublic || e.isSecret) continue;
        if (e.data?.sportName && e.data.sportName !== "Pickleball") continue;
        if (/trivia|agm|christmas party|dinner/i.test(e.title)) continue;
        if (!e.start || !e.end) continue;
        if (new Date(e.end) < new Date(from.getTime() - 3 * 60 * 60 * 1000)) continue;
        const venue = venueFor(e);
        if (!venue) continue;
        const tickets = e.ticketsSummary || [];
        const total = tickets.reduce((sum, t) => sum + (t.quantityTotal || 0), 0) || null;
        const sold = e.registeredAttendees ?? tickets.reduce((sum, t) => sum + (t.quantitySold || 0), 0);
        const spotsLeft = total != null ? Math.max(0, total - sold) : null;
        const full = total != null && sold >= total;
        const cancelled = isCancelled(e);
        const levelTitle = e.data?.level?.title || "";
        const levels = levelsFromText(e.title, levelTitle, { explicitIsAuthoritative: true });
        const category = categoryFromText(e.title, "social");
        const titleKey = groupTitleKey(group, e.title);
        const weekday = weekdayInSydney(e.start);
        const timeLabel = formatTimeInSydney(e.start);
        const groupKey = titleKey;

        listings.push({
          sourceId: group.sourceId,
          sourceUrl: `https://opensports.net/${group.alias}/tab/events`,
          sourceTitle: cleanText(e.title),
          sourceMethod: "Public event API",
          sourceLastChecked: nowISO(),
          sourceCached: fromCache,
          sourceError: error || null,
          groupKey,
          title: cleanText(e.title),
          category,
          levels,
          duprRange: duprFromText(`${e.title} ${levelTitle}`),
          format: formatFromTitle(e.title),
          indoor: venue.indoor,
          description: null,
          price: priceFromTickets(tickets),
          priceUnit: "per player",
          venue,
          organizer: {
            id: group.organizerId,
            name: group.organizerName,
            website: group.organizerWebsite,
            verified: true,
            sourceIds: [group.sourceId],
          },
          bookingUrl: null,
          officialUrl: `https://opensports.net/${group.alias}/tab/events`,
          membershipRequired: group.membershipRequired ?? null,
          equipmentProvided: null,
          facilities: venue.facilities || [],
          region: group.region,
          occurrence: {
            start: e.start,
            end: e.end,
            status: cancelled ? "cancelled" : full ? "full" : "scheduled",
            registrationStatus: cancelled ? "closed" : full ? "full" : "open",
            spotsLeft,
            sourceId: group.sourceId,
            sourceOccurrenceId: String(e.id),
            url: `https://opensports.net/posts/${e.aliasID}`,
            note: full ? "Session is full on the organiser's booking page" : null,
            timeLabel,
          },
          verified: true,
          featured: false,
        });
        kept++;
      }
      runs.push({ sourceId: group.sourceId, ok: true, status: fromCache ? "cached" : "ok", events: kept, fetchedAt: nowISO(), durationMs: Date.now() - new Date(startedAt).getTime(), cacheUsed: fromCache, message: error || null });
      console.log(`opensports ${group.alias}: ${kept}/${events.length} sessions`);
    } catch (err) {
      runs.push({ sourceId: group.sourceId, ok: false, status: "failed", events: 0, fetchedAt: nowISO(), message: err.message });
      console.warn(`opensports ${group.alias} failed: ${err.message}`);
    }
  }
  return { listings, runs };
}

module.exports = { scrapeOpenSports };
