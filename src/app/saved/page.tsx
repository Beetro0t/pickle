import type { Metadata } from "next";
import { Bookmark } from "lucide-react";
import { getDataset } from "@/lib/data";
import { SavedEvents, type SavedSummary } from "@/components/saved-events";
import { formatDate, formatPrice, formatTimeRange, levelLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "Saved pickleball sessions",
  description: "Your saved pickleball sessions, stored in this browser.",
};

export default function SavedPage() {
  const dataset = getDataset();
  const events: SavedSummary[] = dataset.events.map((event) => ({
    id: event.id,
    title: event.title,
    category: event.category,
    dateLabel: formatDate(event.nextStart, "EEE d MMM"),
    timeLabel: formatTimeRange(event.nextStart, event.nextEnd),
    venueName: event.venue.name,
    suburb: event.venue.suburb || null,
    priceLabel: formatPrice(event.price) + (event.price && !event.price.free ? ` ${event.price.unit}` : ""),
    level: levelLabel(event.levels),
    recurrenceLabel: event.recurrenceLabel,
  }));

  return (
    <div className="page-shell py-8 md:py-12">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-moss">
          <Bookmark className="h-3.5 w-3.5" /> Your shortlist
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Saved sessions</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Keep a shortlist of games you want to try. Saved events stay in this browser — no sign-up, no email, no account.
        </p>
      </div>
      <SavedEvents events={events} />
    </div>
  );
}
