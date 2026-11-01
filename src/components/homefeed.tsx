"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  Clock3,
  GraduationCap,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import type { Dataset } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { queryParams } from "@/lib/browser-query";
import { filterEvents, parseEventQuery } from "@/lib/query";
import { SearchForm } from "@/components/search-form";
import { HomeFeedFilters } from "@/components/home-feed-filters";
import { activeFilterCount } from "@/components/filter-panel";
import { EventCard } from "@/components/event-card";
import { CategoryPill } from "@/components/event-badges";
import { CATEGORY_META, HERO_CATEGORIES } from "@/lib/categories";
import { distanceLabel, formatDate, formatDateTimeRange, formatPrice, formatTimeRange, levelLabel, relativeDay } from "@/lib/format";
import type { EventCategory } from "@/lib/types";



const CATEGORY_ICONS = {
  social: Users,
  tournament: Trophy,
  coaching: GraduationCap,
  league: Sparkles,
} as const;

const REGION_LINKS = [
  { label: "Central Coast", locality: "gosford", count: "0" },
  { label: "Newcastle", locality: "newcastle", count: "0" },
  { label: "Lake Macquarie", locality: "cooranbong", count: "0" },
  { label: "Sydney", locality: "sydney", count: "0" },
];

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function feedHref(params: Params, page: number) {
  const next = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (key === "page") continue;
    for (const item of Array.isArray(raw) ? raw : raw ? [raw] : []) {
      if (item) next.append(key, item);
    }
  }
  if (page > 1) next.set("page", String(page));
  const query = next.toString();
  return `/${query ? `?${query}` : ""}#feed`;
}

export function HomeFeed({ dataset }: { dataset: Dataset }) {
  const params = queryParams(useSearchParams());
  const query = parseEventQuery(params);
  const filtered = filterEvents(dataset, { ...query, limit: 0 });
  const filterCount = activeFilterCount(params);
  const now = new Date();
  const spotlight =
    filtered.events
      .filter((e) => new Date(e.nextStart) < new Date(now.getTime() + 14 * 86400000))
      .sort((a, b) => new Date(a.nextStart).getTime() - new Date(b.nextStart).getTime())[0] ||
    filtered.events[0] ||
    null;

  const feedPages = Math.max(1, Math.ceil(filtered.total / 12));
  const feedPage = Math.min(Math.max(1, query.page || 1), feedPages);
  const feed = filterEvents(dataset, { ...query, page: feedPage, limit: 12 });
  const firstResult = feed.total === 0 ? 0 : (feedPage - 1) * 12 + 1;
  const lastResult = Math.min(feedPage * 12, feed.total);
  const listingsWithSpots = filtered.events.filter((event) => typeof (event.match?.spotsLeft ?? event.nextSpotsLeft) === "number");
  const openSpots = listingsWithSpots.reduce((sum, event) => sum + Math.max(0, event.match?.spotsLeft ?? event.nextSpotsLeft ?? 0), 0);
  const weekend = filterEvents(dataset, { ...query, page: 1, from: "weekend", sort: "soonest", limit: 3 });
  const counts = dataset.stats.byCategory || {};
  const totalSessions = dataset.stats.occurrences;
  const spotlightOcc = spotlight?.match || spotlight?.occurrences[0];
  const spotlightMultiDay = spotlightOcc
    ? formatDate(spotlightOcc.start, "yyyy-MM-dd") !== formatDate(spotlightOcc.end, "yyyy-MM-dd")
    : false;

  return (
    <>
      <section className="page-shell pt-4 md:pt-6">
        <div className="relative overflow-hidden rounded-[28px] bg-pine text-white md:rounded-[34px]">
          <div className="court-lines absolute inset-0 opacity-80" aria-hidden />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-lime/20" aria-hidden />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full border border-lime/10" aria-hidden />

          <div className="relative grid gap-8 px-5 py-8 md:px-9 md:py-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-start lg:px-12 lg:py-12">
            <div>
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-lime">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                {dataset.stats.events} event series · {dataset.stats.venues} venues · NSW
              </div>

              <h1 className="mt-4 max-w-[720px] font-display text-[2.65rem] font-extrabold leading-[0.94] tracking-[-0.035em] text-balance sm:text-5xl lg:text-[4rem]">
                Find your next <span className="relative inline-block text-lime">game<span className="absolute -bottom-1 left-0 h-2 w-full -rotate-1 rounded-full bg-coral/80" aria-hidden /></span>.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">
                Social sessions, tournaments, leagues and coaching — collected from the people who actually run them.
                See the details, then book with the organiser.
              </p>

              <div className="mt-6 max-w-2xl">
                <SearchForm
                  localities={dataset.localities}
                  targetPath="/"
                  anchor="feed"
                  initialQ={first(params.q)}
                  initialLocality={first(params.locality)}
                  initialDate={["today", "tomorrow", "weekend", "week"].includes(first(params.date)) ? first(params.date) : "all"}
                  keepParams={params}
                />
              </div>

              <details open={filterCount > 0} className="group mt-3 max-w-2xl">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:border-lime/60 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-lime" /> Choose what shows up
                  </span>
                  <span className="flex items-center gap-2">
                    {filterCount > 0 ? (
                      <span className="pill bg-lime text-pine">{filterCount} active</span>
                    ) : (
                      <span className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-white/45 sm:inline">
                        Skill · DUPR · type · day
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-white/60 transition group-open:rotate-180" />
                  </span>
                </summary>
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 shadow-card">
                  <HomeFeedFilters params={params} localities={dataset.localities} total={filtered.total} />
                </div>
              </details>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Quick look</span>
                {[
                  ["Today", "today"],
                  ["Tomorrow", "tomorrow"],
                  ["This weekend", "weekend"],
                  ["Next 7 days", "week"],
                ].map(([label, date]) => (
                  <Link
                    key={date}
                    href={`/?date=${date}#feed`}
                    className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-white/85 transition hover:border-lime hover:text-lime"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {spotlight && spotlightOcc && (
              <div className="relative mx-auto w-full max-w-[420px] lg:mx-0 lg:ml-auto lg:mt-2">
                <div className="absolute -left-4 top-8 hidden h-24 w-24 rounded-full bg-lime/20 blur-2xl md:block" aria-hidden />
                <div className="relative rotate-[-1.5deg] rounded-[26px] border border-white/15 bg-white p-5 text-ink shadow-[0_30px_60px_-25px_rgba(0,0,0,0.45)] md:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <CategoryPill category={spotlight.category} />
                    <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-ink-soft">
                      <Sparkles className="h-3 w-3" /> Next up
                    </span>
                  </div>
                  <p className="mt-4 font-display text-[1.65rem] font-extrabold leading-[1.05] tracking-tight">{spotlight.title}</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="flex items-center gap-2 font-semibold">
                      <CalendarDays className="h-4 w-4 text-moss" />
                      {relativeDay(spotlightOcc.start) ? `${relativeDay(spotlightOcc.start)} · ` : ""}
                      {spotlightMultiDay
                        ? formatDateTimeRange(spotlightOcc.start, spotlightOcc.end)
                        : `${formatDate(spotlightOcc.start)} · ${formatTimeRange(spotlightOcc.start, spotlightOcc.end)}`}
                    </p>
                    <p className="flex items-center gap-2 text-ink-soft">
                      <MapPin className="h-4 w-4 text-moss" />
                      {spotlight.venue.name} · {spotlight.venue.suburb}
                    </p>
                    <p className="flex items-center gap-2 text-ink-soft">
                      <Users className="h-4 w-4 text-moss" />
                      {levelLabel(spotlight.levels)} · {formatPrice(spotlight.price)}
                    </p>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                    <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-bold text-ink-soft">
                      {spotlight.verified ? <BadgeCheck className="h-3.5 w-3.5 text-moss" /> : <Clock3 className="h-3.5 w-3.5" />}
                      {spotlight.verified ? "From the organiser" : "Public listing"}
                    </span>
                    <Link href={`/events/${spotlight.id}`} className="inline-flex items-center gap-1.5 text-sm font-extrabold text-moss">
                      View & book <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="mt-4 flex rotate-[1deg] items-center justify-between gap-3 rounded-2xl border border-lime/30 bg-[#173f30] px-4 py-3 text-xs">
                  <span className="font-bold text-lime">{totalSessions.toLocaleString()} dated sessions</span>
                  <span className="text-white/55">from {dataset.sources.filter((source) => source.eventCount > 0).length} public sources</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="page-shell mt-6">
        <div id="feed" className="flex scroll-mt-24 flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">The feed</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
              {filterCount > 0 ? "Sessions that match you" : "Everything worth playing"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              {filterCount > 0
                ? `${filtered.total} ${filtered.total === 1 ? "listing matches" : "listings match"} your filters. Keep refining above, search by keyword, or clear everything to see the full feed.`
                : "The full NSW feed, collected from organiser timetables. Search for something specific or simply narrow the filters above — either way, the feed stays right here."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="pill border border-line bg-white text-ink">
              {filtered.total} {filtered.total === 1 ? "listing" : "listings"}
            </span>
            {listingsWithSpots.length > 0 ? (
              <span
                className="pill bg-lime text-pine"
                title={`Across the next session of the ${listingsWithSpots.length} listings that publish live availability`}
              >
                {openSpots.toLocaleString()} spots open
              </span>
            ) : null}
            <span className="text-ink-soft">Showing {firstResult}–{lastResult}</span>
          </div>
        </div>

        {feed.events.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {feed.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="mt-6"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Empty listing tiles">{[1, 2, 3].map((id) => <div key={id} className="card min-h-56 p-6"><div className="h-5 w-24 rounded-full bg-line/50" /><div className="mt-8 h-6 w-3/4 rounded bg-line/50" /><div className="mt-3 h-4 w-1/2 rounded bg-line/30" /><p className="mt-8 text-xs text-ink-soft">Awaiting scraped listings</p></div>)}</div><div className="card mt-4 p-8 text-center">
            <p className="font-display text-2xl font-extrabold">{dataset.generatedAt ? "No sessions match this feed." : "Ready for the first scrape."}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
              {dataset.generatedAt ? "Try a wider distance, a different day, or clear the DUPR and skill filters." : "No listings have been collected yet. Use Refresh listings above to run the scraper. Sessions will appear after it finishes."}
            </p>
            <Link href="/#feed" className="btn btn-primary mt-4">
              Clear filters
            </Link>
          </div></div>
        )}

        {feed.events.length ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <BadgeCheck className="h-3.5 w-3.5 text-moss" /> {dataset.stats.sources} approved public sources · refreshed{" "}
              {dataset.generatedAt ? formatDate(dataset.generatedAt, "d MMM") : "awaiting first scrape"}
            </span>
            <span className="max-w-2xl leading-relaxed">
              Spot counts come from organiser booking systems. “Check availability” means the source doesn&apos;t publish numbers — confirm
              before you travel.
            </span>
          </div>
        ) : null}

        {feedPages > 1 ? (
          <nav className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3" aria-label="Feed pages">
            {feedPage > 1 ? (
              <Link href={feedHref(params, feedPage - 1)} className="btn btn-ghost">
                <ArrowRight className="h-4 w-4 rotate-180" /> Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs font-bold text-ink-soft">Page {feedPage} of {feedPages}</span>
            {feedPage < feedPages ? (
              <Link href={feedHref(params, feedPage + 1)} className="btn btn-ghost">
                Next <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>

      <section className="page-shell mt-12 md:mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Find your kind of game</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">Pick a way to play</h2>
          </div>
          <Link href="/#feed" className="inline-flex items-center gap-1.5 text-sm font-bold text-moss hover:underline">
            Browse everything <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HERO_CATEGORIES.map((category) => {
            const meta = CATEGORY_META[category];
            const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] ?? Users;
            const count = counts[category] || 0;
            return (
              <Link
                key={category}
                href={`/?category=${category}#feed`}
                className="card card-hover group flex flex-col justify-between p-5"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: meta.color, color: meta.text }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-ink-soft transition group-hover:text-moss" />
                </div>
                <div className="mt-8">
                  <p className="font-display text-xl font-bold">{meta.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">{meta.description}</p>
                  <p className="mt-3 text-xs font-bold text-moss">{count} series</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {weekend.events.length > 0 && (
        <section className="page-shell mt-14 md:mt-20">
          <div className="overflow-hidden rounded-[28px] border border-line bg-white">
            <div className="grid gap-8 p-5 md:p-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="relative overflow-hidden rounded-[22px] bg-lime p-6 text-ink md:p-8">
                <div className="court-lines absolute inset-0 opacity-30" aria-hidden />
                <div className="relative">
                  <span className="pill bg-pine text-lime">This weekend</span>
                  <h2 className="mt-5 max-w-sm font-display text-4xl font-extrabold leading-[0.98] tracking-tight">
                    Saturday sorted. Sunday too.
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-pine/75">
                    {weekend.total} sessions across the weekend, from casual social play to graded competitions.
                  </p>
                  <Link href="/?date=weekend#feed" className="btn btn-primary mt-6">
                    Plan the weekend <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="absolute -bottom-10 -right-6 h-36 w-36 rounded-full border-[18px] border-pine/10" aria-hidden />
              </div>
              <div className="grid gap-3">
                {weekend.events.map((event) => (
                  <EventCard key={event.id} event={event} compact />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="page-shell mt-14 md:mt-20">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {REGION_LINKS.map((region) => (
            <Link
              key={region.locality}
              href={`/?locality=${region.locality}&radius=25#feed`}
              className="group flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-4 transition hover:border-moss"
            >
              <span>
                <span className="block text-sm font-extrabold">{region.label}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">Explore local sessions</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-ink-soft transition group-hover:text-moss" />
            </Link>
          ))}
        </div>
      </section>

      <section className="page-shell mt-14 md:mt-20">
        <div className="grid gap-8 rounded-[28px] bg-pine p-6 text-white md:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime">No mystery listings</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight md:text-4xl">You can see where every session comes from.</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
              We show the organiser, the original listing and when it was last checked. If a weekly timetable hasn't been
              individually confirmed, we say so.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: BadgeCheck, title: "Organiser published", text: "Collected from a club, venue or association page." },
              { icon: Clock3, title: "Freshly checked", text: "Every listing carries a last-checked timestamp." },
              { icon: ArrowUpRight, title: "Book at the source", text: "We send you to the original booking page." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <item.icon className="h-5 w-5 text-lime" />
                <p className="mt-3 text-sm font-bold">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/55">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell mt-14 md:mt-20">
        <div className="flex flex-col items-start justify-between gap-5 rounded-[28px] border border-line bg-[#F0EBDD] p-6 md:flex-row md:items-center md:p-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Run a session?</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Put it on the map.</h2>
            <p className="mt-2 max-w-xl text-sm text-ink-soft">
              Add a missing game, correct a detail or send us your public calendar. Automated collection can't see
              everything — organiser submissions fill the gaps.
            </p>
          </div>
          <Link href="/submit" className="btn btn-primary shrink-0">
            Submit an event <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
