import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Plus, Sparkles } from "lucide-react";
import { getDataset } from "@/lib/data";
import { formatDate, formatTimeRange } from "@/lib/format";
import { categoryMeta } from "@/lib/categories";
import type { EventCategory } from "@/lib/types";
import { pluralize } from "@/lib/utils";



export const metadata: Metadata = {
  title: "Pickleball venues in NSW",
  description:
    "Browse pickleball venues across New South Wales, including indoor and outdoor courts, facilities and upcoming sessions.",
};

export default function VenuesPage() {
  const dataset = getDataset();
  const nextEventByVenue = new Map<string, { start: string; end: string; title: string; category: EventCategory }>();
  for (const event of dataset.events) {
    const current = nextEventByVenue.get(event.venueId);
    if (!current || event.nextStart < current.start) {
      nextEventByVenue.set(event.venueId, { start: event.nextStart, end: event.nextEnd, title: event.title, category: event.category });
    }
  }
  const venues = [...dataset.venues].sort((a, b) => (b.eventCount || 0) - (a.eventCount || 0) || a.name.localeCompare(b.name));
  const withEvents = venues.filter((venue) => (venue.eventCount || 0) > 0);

  return (
    <>
      <section className="page-shell py-8 md:py-12">
        <div className="grid gap-6 rounded-[28px] bg-pine p-6 text-cream md:p-9 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime">Places to play</p>
            <h1 className="mt-2 max-w-2xl font-display text-4xl font-extrabold leading-[0.98] tracking-tight md:text-5xl">
              Courts, clubs and community venues.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream/70">
              {pluralize(withEvents.length, "venue")} with an upcoming listing, plus the wider directory. Indoor, outdoor
              and everything in between — each venue links to the sessions we have found there.
            </p>
          </div>
          <Link href="/submit" className="btn btn-lime w-fit">
            <Plus className="h-4 w-4" /> Add a venue
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-ink-soft">
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-moss" /> {dataset.stats.venues} venues in the directory</span>
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-moss" /> {dataset.stats.occurrences} dated sessions</span>
          <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-moss" /> Coordinates stored once per venue</span>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {venues.map((venue) => {
            const next = nextEventByVenue.get(venue.id);
            const meta = next ? categoryMeta(next.category) : null;
            return (
              <Link
                key={venue.id}
                href={`/venues/${venue.id}`}
                className="card card-hover group flex flex-col p-5 md:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-extrabold"
                      style={meta ? { background: meta.color, color: meta.text } : { background: "#ECE9DE", color: "#4A4A3C" }}
                    >
                      {venue.name.slice(0, 1)}
                    </span>
                    <div>
                      <h2 className="font-display text-xl font-extrabold leading-tight group-hover:text-moss">{venue.name}</h2>
                      <p className="mt-1 text-xs text-ink-soft">{[venue.suburb, venue.state].filter(Boolean).join(", ") || "New South Wales"}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-soft transition group-hover:text-moss" />
                </div>

                <p className="mt-4 line-clamp-1 text-xs text-ink-soft">{venue.address || "Address not provided"}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {venue.indoor === true ? <span className="pill border border-line bg-white text-ink-soft">Indoor</span> : null}
                  {venue.indoor === false ? <span className="pill border border-line bg-white text-ink-soft">Outdoor</span> : null}
                  {venue.facilities.slice(0, 2).map((facility) => (
                    <span key={facility} className="pill border border-line bg-cream text-ink-soft">{facility}</span>
                  ))}
                  {(venue.eventCount || 0) > 0 ? (
                    <span className="pill bg-lime text-pine">{pluralize(venue.eventCount || 0, "series")}</span>
                  ) : (
                    <span className="pill border border-line bg-white text-ink-soft">No current listings</span>
                  )}
                </div>

                <div className="mt-auto border-t border-line pt-3 text-xs text-ink-soft">
                  {next ? (
                    <span>
                      <span className="font-bold text-ink">{next.title}</span>
                      <span className="mt-0.5 block">{formatDate(next.start, "EEE d MMM")} · {formatTimeRange(next.start, next.end)}</span>
                    </span>
                  ) : (
                    <span>We have no upcoming sessions from this venue yet.</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-line bg-white p-5 text-sm leading-relaxed text-ink-soft md:p-6">
          <p className="font-bold text-ink">Know a venue we&apos;re missing?</p>
          <p className="mt-1.5">
            Send us the venue name, address and public booking page. We add coordinates once and reuse them across every
            listing, rather than geocoding the same address over and over.
          </p>
          <Link href="/submit" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-moss underline decoration-moss/30 underline-offset-4">
            Suggest a venue <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
