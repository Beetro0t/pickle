import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Building2, CalendarDays, MapPin, Navigation, Plus, Users } from "lucide-react";
import { getDataset, getVenueById } from "@/lib/data";
import { filterEvents } from "@/lib/query";
import { EventCard } from "@/components/event-card";
import { formatDate, formatTimeRange, relativeDay } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import { pluralize } from "@/lib/utils";



export function generateStaticParams() { return getDataset().venues.map((item) => ({ id: item.id })); }
export const dynamicParams = false;
export const dynamic = "force-static";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const venue = getVenueById(id);
  if (!venue) return { title: "Venue not found" };
  return {
    title: `${venue.name} — pickleball sessions`,
    description: `Upcoming pickleball sessions at ${venue.name}, ${venue.suburb || "NSW"}. Times, prices, levels and booking links.`,
    alternates: { canonical: `/venues/${venue.id}` },
    openGraph: { title: venue.name, description: `Pickleball sessions at ${venue.name}`, url: absoluteUrl(`/venues/${venue.id}`) },
  };
}

export default async function VenuePage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const venue = getVenueById(id);
  if (!venue) notFound();

  const dataset = getDataset();
  const { events, total } = filterEvents(dataset, { venueId: venue.id, sort: "soonest", limit: 0 });
  const next = events[0];
  const organizers = [...new Map(events.map((event) => [event.organizerId, event.organizer])).values()];
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue.address || venue.name)}`;

  return (
    <>
      <section className="border-b border-line bg-[#F0EBDD]">
        <div className="page-shell py-8 md:py-11">
          <Link href="/venues" className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft transition hover:text-moss">
            <ArrowLeft className="h-3.5 w-3.5" /> All venues
          </Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill bg-pine text-lime"><Building2 className="h-3 w-3" /> Venue</span>
                {venue.indoor === true ? <span className="pill border border-line bg-white text-ink-soft">Indoor</span> : null}
                {venue.indoor === false ? <span className="pill border border-line bg-white text-ink-soft">Outdoor</span> : null}
                <span className="pill border border-line bg-white/70 text-ink-soft">{pluralize(total, "series")}</span>
              </div>
              <h1 className="mt-3 max-w-3xl text-balance font-display text-4xl font-extrabold leading-[0.98] tracking-tight md:text-5xl">{venue.name}</h1>
              <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-ink-soft">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
                {venue.address || "Address not provided"}
              </p>
              {venue.facilities.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {venue.facilities.map((facility) => <span key={facility} className="pill border border-line bg-white text-ink-soft">{facility}</span>)}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={directions} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <Navigation className="h-4 w-4" /> Directions
              </a>
              <Link href="/submit" className="btn btn-ghost"><Plus className="h-4 w-4" /> Add a session</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="page-shell grid gap-8 py-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">What&apos;s on</p>
              <h2 className="mt-1 font-display text-3xl font-extrabold">Upcoming sessions</h2>
              {next ? (
                <p className="mt-2 text-sm text-ink-soft">
                  Next: {relativeDay(next.nextStart) ? `${relativeDay(next.nextStart)} · ` : ""}
                  {formatDate(next.nextStart, "EEEE d MMMM")} · {formatTimeRange(next.nextStart, next.nextEnd)}
                </p>
              ) : null}
            </div>
            <Link href={`/events?venueId=${venue.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-moss hover:underline">
              Open in Explore <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {events.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {events.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          ) : (
            <div className="card mt-5 p-8 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-moss" />
              <h3 className="mt-3 font-display text-2xl font-extrabold">No upcoming sessions at this venue.</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
                This venue is in the directory, but no current public listing has been found. If you run a session here, send it in.
              </p>
              <Link href="/submit" className="btn btn-primary mt-4">Submit a session</Link>
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-moss">Venue details</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-ink-soft">Address</dt>
                <dd className="mt-0.5 font-semibold leading-snug">{venue.address || "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Suburb</dt>
                <dd className="mt-0.5 font-semibold">{[venue.suburb, venue.state, venue.postcode].filter(Boolean).join(" · ") || "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Setting</dt>
                <dd className="mt-0.5 font-semibold">{venue.indoor === true ? "Indoor" : venue.indoor === false ? "Outdoor" : "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">Coordinates</dt>
                <dd className="mt-0.5 font-semibold">{venue.lat != null && venue.lng != null ? `${venue.lat.toFixed(4)}, ${venue.lng.toFixed(4)}` : "Not verified"}</dd>
              </div>
            </dl>
          </div>

          {organizers.length ? (
            <div className="card p-5">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-moss">Who runs sessions here</p>
              <ul className="mt-3 space-y-3">
                {organizers.map((organizer) => (
                  <li key={organizer.id} className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pine text-xs font-bold text-lime">{organizer.name.slice(0, 1)}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{organizer.name}</p>
                      {organizer.website ? (
                        <a href={organizer.website} target="_blank" rel="noopener noreferrer" className="text-[0.7rem] font-semibold text-moss hover:underline">Organiser website</a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-2xl border border-line bg-white/60 p-4 text-xs leading-relaxed text-ink-soft">
            <p className="flex items-center gap-2 font-bold text-ink"><Users className="h-4 w-4 text-moss" /> Venue info is shared</p>
            <p className="mt-1.5">Facilities and indoor/outdoor status come from the venue or organiser. Always confirm access and equipment with the organiser.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
