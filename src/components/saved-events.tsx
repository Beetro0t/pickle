"use client";

import Link from "next/link";
import { ArrowUpRight, Bookmark, CalendarDays, MapPin, Trash2 } from "lucide-react";
import { useSaved } from "@/lib/use-saved";
import { CategoryPill } from "@/components/event-badges";
import type { EventCategory } from "@/lib/types";

export type SavedSummary = {
  id: string;
  title: string;
  category: EventCategory;
  dateLabel: string;
  timeLabel: string;
  venueName: string;
  suburb: string | null;
  priceLabel: string;
  level: string;
  recurrenceLabel: string | null;
};

export function SavedEvents({ events }: { events: SavedSummary[] }) {
  const { ids, ready, clear } = useSaved();
  const saved = events.filter((event) => ids.includes(event.id));

  if (!ready) {
    return <div className="mt-6 h-40 animate-pulse rounded-2xl border border-line bg-white/60" aria-label="Loading saved events" />;
  }

  if (!saved.length) {
    return (
      <div className="card mt-6 p-8 text-center md:p-12">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime text-2xl">
          <Bookmark className="h-6 w-6 text-pine" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-extrabold">No saved sessions yet.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
          Tap the bookmark on any listing to keep it here. Saved events live in this browser only — no account needed.
        </p>
        <Link href="/events" className="btn btn-primary mt-5">
          Find a session <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink-soft">{saved.length} saved {saved.length === 1 ? "session" : "sessions"}</p>
        <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft hover:text-coral">
          <Trash2 className="h-3.5 w-3.5" /> Clear all
        </button>
      </div>
      <div className="mt-3 grid gap-3">
        {saved.map((event) => (
          <article key={event.id} className="card card-hover relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="flex w-full min-w-0 items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryPill category={event.category} />
                  {event.recurrenceLabel ? <span className="text-[0.7rem] font-semibold text-ink-soft">Recurring</span> : null}
                </div>
                <h2 className="mt-1.5 font-display text-lg font-extrabold leading-snug">
                  <Link href={`/events/${event.id}`} className="hover:text-moss">{event.title}</Link>
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-moss" /> {event.dateLabel} · {event.timeLabel}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-moss" /> {event.venueName}{event.suburb ? ` · ${event.suburb}` : ""}</span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
              <div className="text-right">
                <p className="text-sm font-bold">{event.priceLabel}</p>
                <p className="text-[0.7rem] text-ink-soft">{event.level}</p>
              </div>
              <Link href={`/events/${event.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-moss">
                View <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
