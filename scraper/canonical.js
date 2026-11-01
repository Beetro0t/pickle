// Turn source listings into canonical events, then merge conservative duplicates.
const {
  slugify, shortHash, cleanText, normalizeTitle, titleTokens, jaccard,
  formatTimeInSydney, weekdayInSydney, nowISO, parseAddress,
} = require("./lib");

const CATEGORY_LABELS = {
  social: "Social play",
  casual: "Casual game",
  tournament: "Tournament",
  league: "League",
  coaching: "Coaching",
  intro: "Introductory session",
  special: "Special event",
  junior: "Junior",
  senior: "Senior",
  "court-hire": "Court hire",
  other: "Other",
};

const CATEGORY_PRIORITY = ["tournament", "league", "intro", "coaching", "special", "junior", "senior", "social", "casual", "court-hire", "other"];

function mode(values) {
  const counts = new Map();
  for (const v of values) {
    if (v == null || v === "") continue;
    const key = typeof v === "object" ? JSON.stringify(v) : String(v);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [k, c] of counts) {
    if (c > bestCount) { best = k; bestCount = c; }
  }
  return best;
}

function mostCommon(values) {
  const counts = new Map();
  for (const v of values) {
    const clean = cleanText(v);
    if (!clean) continue;
    counts.set(clean, (counts.get(clean) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0]?.[0] || null;
}

function uniqueBy(items, keyFn) {
  const seen = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) seen.set(key, item);
  }
  return [...seen.values()];
}

function categoryFor(listings) {
  const counts = new Map();
  for (const l of listings) counts.set(l.category, (counts.get(l.category) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || CATEGORY_PRIORITY.indexOf(a[0]) - CATEGORY_PRIORITY.indexOf(b[0]))[0][0];
}

function combinePrice(listings) {
  const prices = listings.map((l) => l.price).filter(Boolean);
  if (!prices.length) return null;
  const unit = mode(prices.map((p) => p.unit)) || "per player";
  const mins = prices.map((p) => p.min ?? p.amount).filter((n) => typeof n === "number");
  const maxs = prices.map((p) => p.max ?? p.amount).filter((n) => typeof n === "number");
  const members = prices.map((p) => p.memberAmount).filter((n) => typeof n === "number");
  const min = Math.min(...mins);
  const max = Math.max(...maxs);
  const notes = [...new Set(prices.map((p) => p.notes).filter(Boolean))].join("; ");
  return {
    amount: min,
    min,
    max,
    memberAmount: members.length ? Math.min(...members) : null,
    currency: "AUD",
    unit,
    notes: max > min ? [notes, /price varies/i.test(notes) ? "" : "Price varies by date or ticket type"].filter(Boolean).join("; ") : notes,
    free: min === 0 && max === 0,
  };
}

function combineOccurrences(listings) {
  const byStart = new Map();
  for (const l of listings) {
    const o = l.occurrence;
    if (!o?.start) continue;
    const key = new Date(o.start).toISOString();
    const candidate = {
      id: "",
      start: o.start,
      end: o.end,
      status: o.status || "scheduled",
      registrationStatus: o.registrationStatus || "unknown",
      spotsLeft: typeof o.spotsLeft === "number" ? o.spotsLeft : null,
      sourceId: o.sourceId || l.sourceId,
      sourceOccurrenceId: o.sourceOccurrenceId || null,
      url: o.url || l.bookingUrl || null,
      note: o.note || null,
    };
    const existing = byStart.get(key);
    if (!existing) byStart.set(key, candidate);
    else {
      // Cancellation is the strongest signal; otherwise keep an open booking link.
      const statusRank = { cancelled: 4, full: 3, scheduled: 2, confirmed: 1 };
      if ((statusRank[candidate.status] || 0) > (statusRank[existing.status] || 0)) {
        existing.status = candidate.status;
        existing.registrationStatus = candidate.registrationStatus;
      }
      existing.spotsLeft = existing.spotsLeft ?? candidate.spotsLeft;
      existing.url = existing.url || candidate.url;
      existing.note = existing.note || candidate.note;
    }
  }
  return [...byStart.values()]
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .map((o) => ({ ...o, id: `${new Date(o.start).toISOString().slice(0, 16).replace(/[-:T]/g, "")}` }));
}

function combineSources(listings) {
  return uniqueBy(
    listings.map((l) => ({
      sourceId: l.sourceId,
      url: l.sourceUrl,
      title: l.sourceTitle,
      method: l.sourceMethod,
      lastChecked: l.sourceLastChecked || nowISO(),
    })),
    (s) => `${s.sourceId}|${s.url}`
  ).sort((a, b) => new Date(b.lastChecked) - new Date(a.lastChecked));
}

function recurrenceLabel(occurrences) {
  const future = occurrences.filter((o) => o.status !== "cancelled");
  if (future.length < 2) return null;
  const byWeekday = new Map();
  const allTimes = new Set();
  for (const o of future) {
    const day = weekdayInSydney(o.start);
    const time = formatTimeInSydney(o.start);
    const end = formatTimeInSydney(o.end);
    if (!byWeekday.has(day)) byWeekday.set(day, new Map());
    byWeekday.get(day).set(`${time}|${end}`, `${time}–${end}`);
    allTimes.add(`${time}|${end}`);
  }
  if (byWeekday.size === 1) {
    const [day, times] = [...byWeekday.entries()][0];
    if (times.size === 1) return `Every ${day}, ${[...times.values()][0]}`;
    return `Every ${day}, ${times.size} sessions`;
  }
  const days = [...byWeekday.keys()];
  const short = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
  if (days.length <= 4 && allTimes.size === 1) {
    const firstLabel = [...byWeekday.values()][0].values().next().value;
    return `${days.map((d) => short[d]).join(", ")} · ${firstLabel}`;
  }
  if (days.length <= 4) {
    return `${days.map((d) => short[d]).join(", ")} · ${allTimes.size} times`;
  }
  return "Multiple days each week";
}

function buildSummary(event) {
  const cat = CATEGORY_LABELS[event.category] || "Session";
  const level = event.levels.includes("all") ? "all levels" : event.levels.join(" / ");
  const when = event.recurrenceLabel ? ` ${event.recurrenceLabel}.` : "";
  const fmt = (n) => `$${Number(n).toFixed(2).replace(/\.00$/, "")}`;
  const prices = event.price
    ? event.price.free
      ? " Free."
      : event.price.min === 0 && event.price.max > 0
        ? ` Free–${fmt(event.price.max)} ${event.price.unit}.`
        : event.price.max > event.price.min
          ? ` From ${fmt(event.price.min)} ${event.price.unit}.`
          : ` ${fmt(event.price.min)} ${event.price.unit}.`
    : "";
  const dupr = event.duprRange ? ` (${event.duprRange})` : "";
  return cleanText(`${cat}${level ? ` for ${level}` : ""}${dupr} at ${event.venue.name}.${when}${prices}`);
}

function canonicalize(listings, from = new Date()) {
  const groups = new Map();
  for (const l of listings) {
    if (!l.occurrence || !l.venue || !l.organizer) continue;
    const key = `${l.organizer.id}|${l.venue.id}|${l.groupKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  }

  const events = [];
  for (const [key, group] of groups) {
    const title = mostCommon(group.map((l) => l.title)) || cleanText(group[0].title);
    const category = categoryFor(group);
    const rawVenue = group[0].venue;
    const parsedAddress = parseAddress(rawVenue.address || "");
    const venue = {
      ...rawVenue,
      suburb: rawVenue.suburb ?? parsedAddress.suburb,
      state: rawVenue.state ?? parsedAddress.state,
      postcode: rawVenue.postcode ?? parsedAddress.postcode,
    };
    const organizer = group[0].organizer;
    const occurrences = combineOccurrences(group);
    const future = occurrences.filter((o) => new Date(o.end) >= new Date(from.getTime() - 3 * 60 * 60 * 1000));
    if (!future.length) continue;
    const sources = combineSources(group);
    const price = combinePrice(group);
    const levels = [...new Set(group.flatMap((l) => l.levels || []))];
    const duprRange = mostCommon(group.map((l) => l.duprRange).filter(Boolean));
    const format = mostCommon(group.map((l) => l.format).filter(Boolean));
    const descriptionExcerpt = group
      .map((l) => l.descriptionExcerpt)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)[0] || null;
    const description = group
      .map((l) => l.description)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)[0] || null;
    const bookingUrl = future.find((o) => o.url)?.url || group.find((l) => l.bookingUrl)?.bookingUrl || null;
    const officialUrl = group.find((l) => l.officialUrl)?.officialUrl || sources[0]?.url || bookingUrl;
    const facilities = [...new Set(group.flatMap((l) => l.facilities || []))];
    const statuses = future.map((o) => o.status);
    const cancelled = statuses.every((s) => s === "cancelled") ? "cancelled" : "scheduled";
    const next = future.find((o) => o.status !== "cancelled") || future[0];
    const lastChecked = sources.map((s) => s.lastChecked).sort().at(-1) || nowISO();
    const idBase = `${slugify(title)}-${slugify(venue.suburb || venue.name)}`;
    const id = `${idBase}-${shortHash(key, 5)}`.slice(0, 100);
    const event = {
      id,
      slug: id,
      title,
      category,
      categoryLabel: CATEGORY_LABELS[category] || "Event",
      summary: "",
      description,
      descriptionExcerpt,
      levels,
      duprRange,
      format,
      indoor: venue.indoor ?? group.find((l) => l.indoor != null)?.indoor ?? null,
      ageGroup: /junior|youth|kids|children/i.test(title) ? "Junior" : /\b(40\+|55\+|60\+|senior|masters)\b/i.test(title) ? "Seniors" : null,
      gender: /women|ladies/i.test(title) ? "Women" : /men's|mens/i.test(title) ? "Men" : /mixed/i.test(title) ? "Mixed" : null,
      price,
      venueId: venue.id,
      venue,
      organizerId: organizer.id,
      organizer,
      occurrences: future,
      sources,
      bookingUrl,
      officialUrl,
      membershipRequired: group.some((l) => l.membershipRequired === true) ? true : group.every((l) => l.membershipRequired === false) ? false : null,
      equipmentProvided: group.some((l) => l.equipmentProvided === true) ? true : group.every((l) => l.equipmentProvided === false) ? false : null,
      facilities,
      region: group[0].region || null,
      recurrenceLabel: recurrenceLabel(future),
      status: cancelled,
      nextStart: next.start,
      nextEnd: next.end,
      nextStatus: next.status,
      nextRegistrationStatus: next.registrationStatus,
      nextSpotsLeft: next.spotsLeft,
      tournamentTier: group.find((l) => l.tournamentTier)?.tournamentTier || null,
      sanctioned: group.find((l) => l.sanctioned != null)?.sanctioned ?? null,
      verified: group.every((l) => l.verified !== false),
      lastChecked,
      sourceCount: sources.length,
      occurrenceCount: future.length,
      featured: false,
      mergedFrom: [],
      searchText: normalizeTitle([title, venue.name, venue.suburb, organizer.name, format, duprRange].filter(Boolean).join(" ")),
    };
    event.summary = buildSummary(event);
    events.push(event);
  }
  return events;
}

function timeOverlap(a, b) {
  const startA = new Date(a.start).getTime();
  const endA = new Date(a.end || a.start).getTime();
  const startB = new Date(b.start).getTime();
  const endB = new Date(b.end || b.start).getTime();
  // Back-to-back sessions are distinct; only true overlap counts.
  return startA < endB && startB < endA;
}

function eventsOverlap(a, b) {
  for (const oa of a.occurrences) {
    for (const ob of b.occurrences) {
      if (timeOverlap(oa, ob)) return true;
    }
  }
  return false;
}

function isSpecificUrl(url) {
  if (!url) return false;
  return /\/posts\/|\/community\/events\/|\/events\/\d+|\/programs\/|\/products\/|[?&]variant=/.test(url);
}

function sameVenue(a, b) {
  if (a.venueId === b.venueId) return true;
  if (a.venue.lat != null && b.venue.lat != null) {
    const dLat = (a.venue.lat - b.venue.lat) * 111;
    const dLng = (a.venue.lng - b.venue.lng) * 95;
    return Math.sqrt(dLat * dLat + dLng * dLng) < 0.0025;
  }
  return normalizeTitle(a.venue.address) === normalizeTitle(b.venue.address);
}

function mergePair(a, b) {
  const primary = a.occurrences.length >= b.occurrences.length ? a : b;
  const secondary = primary === a ? b : a;
  const occurrences = combineOccurrences([
    ...primary.occurrences.map((o) => ({ occurrence: o, sourceId: o.sourceId })),
    ...secondary.occurrences.map((o) => ({ occurrence: o, sourceId: o.sourceId })),
  ]);
  const sources = uniqueBy([...primary.sources, ...secondary.sources], (s) => `${s.sourceId}|${s.url}`);
  const price = combinePrice([
    ...(primary.price ? [{ price: primary.price }] : []),
    ...(secondary.price ? [{ price: secondary.price }] : []),
  ]);
  const merged = {
    ...primary,
    title: primary.title.length >= secondary.title.length ? primary.title : secondary.title,
    occurrences,
    occurrenceCount: occurrences.filter((o) => o.status !== "cancelled").length,
    sources,
    sourceCount: sources.length,
    descriptionExcerpt: [primary.descriptionExcerpt, secondary.descriptionExcerpt].filter(Boolean).sort((x, y) => y.length - x.length)[0] || null,
    description: [primary.description, secondary.description].filter(Boolean).sort((x, y) => y.length - x.length)[0] || null,
    price: price || primary.price || secondary.price,
    levels: [...new Set([...primary.levels, ...secondary.levels])],
    facilities: [...new Set([...primary.facilities, ...secondary.facilities])],
    bookingUrl: primary.bookingUrl || secondary.bookingUrl,
    officialUrl: primary.officialUrl || secondary.officialUrl,
    membershipRequired: primary.membershipRequired ?? secondary.membershipRequired,
    equipmentProvided: primary.equipmentProvided ?? secondary.equipmentProvided,
    verified: primary.verified && secondary.verified,
    lastChecked: [primary.lastChecked, secondary.lastChecked].sort().at(-1),
    mergedFrom: [...new Set([...(primary.mergedFrom || []), ...(secondary.mergedFrom || []), secondary.id])],
  };
  merged.recurrenceLabel = recurrenceLabel(occurrences);
  merged.summary = buildSummary(merged);
  merged.nextStart = merged.occurrences.find((o) => o.status !== "cancelled")?.start || merged.occurrences[0]?.start;
  merged.nextEnd = merged.occurrences.find((o) => o.status !== "cancelled")?.end || merged.occurrences[0]?.end;
  const next = merged.occurrences.find((o) => o.status !== "cancelled") || merged.occurrences[0];
  merged.nextStatus = next?.status;
  merged.nextRegistrationStatus = next?.registrationStatus;
  return merged;
}

function dedupeEvents(events) {
  const mergedIds = new Set();
  const review = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < events.length; i++) {
      if (mergedIds.has(events[i].id)) continue;
      for (let j = i + 1; j < events.length; j++) {
        if (mergedIds.has(events[j].id)) continue;
        const a = events[i];
        const b = events[j];
        if (!sameVenue(a, b) || !eventsOverlap(a, b)) continue;
        const sim = jaccard(titleTokens(a.title), titleTokens(b.title));
        const sameUrl = a.bookingUrl && b.bookingUrl && a.bookingUrl === b.bookingUrl && isSpecificUrl(a.bookingUrl);
        const sharedSource = a.sources.some((sa) => b.sources.some((sb) => sa.sourceId === sb.sourceId));
        // Same-source sessions are easily confused (e.g. two level streams at
        // the same time), so only merge them on a very strong title match.
        const threshold = sharedSource ? 0.86 : 0.62;
        if (sim >= threshold || sameUrl) {
          const merged = mergePair(a, b);
          events[i] = merged;
          mergedIds.add(events[j].id);
          changed = true;
        } else if (sim >= (sharedSource ? 0.6 : 0.42)) {
          review.push({
            a: { id: a.id, title: a.title, venue: a.venue.name, dates: a.occurrences.slice(0, 3).map((o) => o.start) },
            b: { id: b.id, title: b.title, venue: b.venue.name, dates: b.occurrences.slice(0, 3).map((o) => o.start) },
            similarity: Number(sim.toFixed(2)),
            reason: "Same venue and overlapping dates, but titles differ",
          });
        }
      }
    }
  }
  const uniqueReview = review.filter((item, index, all) => {
    const key = [item.a.id, item.b.id].sort().join("|");
    return all.findIndex((candidate) => [candidate.a.id, candidate.b.id].sort().join("|") === key) === index;
  });
  return { events: events.filter((e) => !mergedIds.has(e.id)), review: uniqueReview };
}

function attachVenueAndOrganizerStats(events) {
  const venues = new Map();
  const organizers = new Map();
  for (const e of events) {
    const v = venues.get(e.venueId) || { ...e.venue, eventIds: [], nextEventAt: null, eventCount: 0 };
    v.eventCount++;
    v.eventIds.push(e.id);
    if (!v.nextEventAt || e.nextStart < v.nextEventAt) v.nextEventAt = e.nextStart;
    venues.set(e.venueId, v);
    const o = organizers.get(e.organizerId) || { ...e.organizer, eventIds: [], nextEventAt: null, eventCount: 0 };
    o.eventCount++;
    o.eventIds.push(e.id);
    if (!o.nextEventAt || e.nextStart < o.nextEventAt) o.nextEventAt = e.nextStart;
    organizers.set(e.organizerId, o);
  }
  return { venues: [...venues.values()].sort((a, b) => a.name.localeCompare(b.name)), organizers: [...organizers.values()].sort((a, b) => a.name.localeCompare(b.name)) };
}

module.exports = { canonicalize, dedupeEvents, attachVenueAndOrganizerStats, CATEGORY_LABELS };
