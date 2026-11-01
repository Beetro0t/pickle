import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, MapPin, ShieldCheck, Trophy } from "lucide-react";
import { getDataset } from "@/lib/data";
import { filterEvents } from "@/lib/query";
import { EventCard } from "@/components/event-card";
import { formatDate } from "@/lib/format";
import { pluralize } from "@/lib/utils";



export const metadata: Metadata = {
  title: "Pickleball tournaments in NSW",
  description:
    "Upcoming pickleball tournaments across New South Wales, with dates, venues, divisions and direct links to the organiser's entry page.",
};

export default function TournamentsPage() {
  const dataset = getDataset();
  const { events, total } = filterEvents(dataset, { category: "tournament", sort: "soonest", limit: 0 });
  const sanctioned = events.filter((event) => event.sanctioned === true).length;
  const next = events[0];

  return (
    <>
      <section className="court-lines bg-pine text-cream">
        <div className="page-shell py-10 md:py-14">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill bg-lime text-pine"><Trophy className="h-3 w-3" /> Tournaments</span>
            <span className="pill border border-cream/20 bg-white/10 text-cream">{pluralize(total, "series")}</span>
          </div>
          <h1 className="mt-5 max-w-3xl text-balance font-display text-4xl font-extrabold leading-[0.96] tracking-tight sm:text-5xl md:text-6xl">
            The competitive calendar, in one place.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-cream/70 md:text-base">
            Local, regional and sanctioned tournaments published by associations, clubs and venues. Every listing links to
            the organiser&apos;s entry page — divisions and closing dates stay with the source.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold text-cream/75">
            <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-lime" /> {next ? `Next: ${formatDate(next.nextStart, "d MMM yyyy")}` : "Dates added as published"}</span>
            {sanctioned > 0 ? <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-lime" /> {sanctioned} marked sanctioned</span> : null}
            <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-lime" /> New South Wales</span>
          </div>
        </div>
      </section>

      <div className="page-shell grid gap-8 py-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">Upcoming</p>
              <h2 className="mt-1 font-display text-3xl font-extrabold">Tournaments to enter</h2>
            </div>
            <Link href="/events?category=tournament" className="inline-flex items-center gap-1.5 text-sm font-bold text-moss hover:underline">
              Open in Explore <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {events.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {events.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          ) : (
            <div className="card mt-5 p-8 text-center">
              <Trophy className="mx-auto h-8 w-8 text-moss" />
              <h3 className="mt-3 font-display text-2xl font-extrabold">No tournaments are published yet.</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">Check back soon, or add a tournament you know about.</p>
              <Link href="/submit" className="btn btn-primary mt-4">Submit a tournament</Link>
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-moss">Before you enter</p>
            <ul className="mt-3 space-y-3 text-sm text-ink-soft">
              <li className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-moss" /><span>Divisions, DUPR rules and entry deadlines are set by the organiser. Confirm them on the official entry page.</span></li>
              <li className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-moss" /><span>Sanctioned status is only shown when the source publishes it — never inferred.</span></li>
              <li className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-moss" /><span>If entries are closed, the organiser&apos;s page remains the source of truth.</span></li>
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-[#F0EBDD] p-5">
            <p className="font-display text-xl font-extrabold">Running an event?</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">Send us the public entry link and we&apos;ll review it for the calendar.</p>
            <Link href="/submit" className="btn btn-primary mt-4 w-full">Submit an event</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
