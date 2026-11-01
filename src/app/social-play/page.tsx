import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Repeat2, Users } from "lucide-react";
import { getDataset } from "@/lib/data";
import { asCardEvent } from "@/lib/query";
import { EventCard } from "@/components/event-card";
import { formatDate } from "@/lib/format";
import { pluralize } from "@/lib/utils";



export const metadata: Metadata = {
  title: "Pickleball social play in NSW",
  description:
    "Find drop-in pickleball, open play and friendly social sessions across New South Wales, with times, prices, levels and booking links.",
};

export default function SocialPlayPage() {
  const dataset = getDataset();
  const events = dataset.events
    .filter((event) => event.category === "social" || event.category === "casual")
    .sort((a, b) => new Date(a.nextStart).getTime() - new Date(b.nextStart).getTime())
    .map(asCardEvent);
  const recurring = events.filter((event) => event.recurrenceLabel).length;
  const free = events.filter((event) => event.price?.free).length;

  return (
    <>
      <section className="bg-lime text-ink">
        <div className="page-shell py-10 md:py-14">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill bg-pine text-lime"><Users className="h-3 w-3" /> Social play</span>
            <span className="pill border border-pine/20 bg-white/30 text-pine">{pluralize(events.length, "series")}</span>
          </div>
          <h1 className="mt-5 max-w-3xl text-balance font-display text-4xl font-extrabold leading-[0.96] tracking-tight sm:text-5xl md:text-6xl">
            Turn up. Rotate in. Play.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-pine/75 md:text-base">
            Open play, drop-in sessions and friendly club nights across New South Wales. Most are beginner-friendly, but
            each listing shows the level the organiser publishes — check before you go.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold text-pine/75">
            <span className="inline-flex items-center gap-2"><Repeat2 className="h-4 w-4" /> {recurring} recurring timetables</span>
            <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Dates up to eight weeks ahead</span>
            {free > 0 ? <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" /> {free} free sessions</span> : null}
          </div>
        </div>
      </section>

      <div className="page-shell py-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">Drop in</p>
            <h2 className="mt-1 font-display text-3xl font-extrabold">Social sessions near you</h2>
            {events[0] ? <p className="mt-2 text-sm text-ink-soft">Next up {formatDate(events[0].nextStart, "EEEE d MMMM")} · sorted by date</p> : null}
          </div>
          <Link href="/events?category=social" className="inline-flex items-center gap-1.5 text-sm font-bold text-moss hover:underline">
            Filter by area or day <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {events.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        ) : (
          <div className="card mt-5 p-8 text-center">
            <Users className="mx-auto h-8 w-8 text-moss" />
            <h3 className="mt-3 font-display text-2xl font-extrabold">No social sessions are listed right now.</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">Try the full calendar, or submit a session that is missing.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href="/events" className="btn btn-primary">Explore all sessions</Link>
              <Link href="/submit" className="btn btn-ghost">Submit a session</Link>
            </div>
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-line bg-white p-5 text-sm leading-relaxed text-ink-soft md:p-6">
          <p className="font-bold text-ink">A note on weekly timetables</p>
          <p className="mt-1.5">
            Recurring sessions are generated from the organiser&apos;s published timetable. They are not individually
            re-confirmed every week, so public holidays and venue closures can change them. The listing always links to
            the organiser&apos;s page.
          </p>
        </div>
      </div>
    </>
  );
}
