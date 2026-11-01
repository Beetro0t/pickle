import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Sparkles, Tag, Users } from "lucide-react";
import type { EventWithMatch } from "@/lib/query";
import { CategoryPill, FreshnessIndicator, StatusPill } from "./event-badges";
import { SaveButton } from "./save-button";
import { distanceLabel, formatDate, formatDateTimeRange, formatPrice, formatTimeRange, levelLabel, relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";

export function EventCard({ event, compact = false, className }: { event: EventWithMatch; compact?: boolean; className?: string }) {
  const occurrence = event.match ?? event.occurrences[0];
  const dayLabel = relativeDay(occurrence.start);
  const ongoing = new Date(occurrence.start).getTime() <= Date.now() && new Date(occurrence.end).getTime() >= Date.now();
  const multiDay = formatDate(occurrence.start, "yyyy-MM-dd") !== formatDate(occurrence.end, "yyyy-MM-dd");
  const level = levelLabel(event.levels);
  const price = event.price == null ? "Price not provided" : `${formatPrice(event.price)}${event.price.free ? "" : ` ${event.price.unit}`}`;
  const spots = occurrence.spotsLeft;
  const isFull = occurrence.status === "full" || occurrence.registrationStatus === "full" || spots === 0;
  const availability =
    occurrence.status === "cancelled" || isFull
      ? null
      : typeof spots === "number"
        ? {
            label: `${spots} ${spots === 1 ? "spot" : "spots"} left`,
            tone: spots <= 3 ? "bg-[#FFE1DA] text-[#7A2312]" : "bg-[#DDF3D4] text-[#20501B]",
            title: "Spots remaining as published by the organiser's booking system",
          }
        : {
            label: "Check availability",
            tone: "border border-line bg-white text-ink-soft",
            title: "This organiser doesn't publish live spot counts — check availability on the booking page",
          };

  return (
    <article className={cn("card card-hover group relative flex flex-col", className)}>
      <Link href={`/events/${event.id}`} className="flex h-full flex-col p-4 focus-visible:outline-offset-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2 pr-11">
          <CategoryPill category={event.category} />
          {event.recurrenceLabel ? (
            <span className="pill border border-line bg-white text-ink-soft">
              <Sparkles className="h-3 w-3" /> Recurring
            </span>
          ) : null}
        </div>

        <h3 className="mt-3 font-display text-lg font-bold leading-snug text-ink group-hover:text-moss md:text-xl">
          <span className="line-clamp-2">{event.title}</span>
        </h3>

        <div className="mt-2.5 space-y-1.5 text-sm text-ink-soft">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <CalendarDays className="h-4 w-4 shrink-0 text-moss" />
            <span>
              {ongoing ? (
                <>In progress · ends {formatDate(occurrence.end)}</>
              ) : multiDay ? (
                <>
                  {dayLabel ? `${dayLabel} · ` : ""}
                  {formatDateTimeRange(occurrence.start, occurrence.end)}
                </>
              ) : (
                <>
                  {dayLabel ? `${dayLabel} · ` : ""}
                  {formatDate(occurrence.start)} · {formatTimeRange(occurrence.start, occurrence.end)}
                </>
              )}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-moss" />
            <span className="line-clamp-1">
              {event.venue.name}
              {event.venue.suburb ? ` · ${event.venue.suburb}` : ""}
            </span>
            {event.distanceKm != null ? (
              <span className="ml-auto shrink-0 rounded-full bg-cream px-2 py-0.5 text-xs font-bold text-ink">
                {distanceLabel(event.distanceKm)}
              </span>
            ) : null}
          </p>
          {!compact && (
            <p className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-moss" />
              <span>{level}</span>
              {event.duprRange ? <span className="text-xs">· {event.duprRange}</span> : null}
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="pill border border-line bg-cream text-ink">
            <Tag className="h-3 w-3" /> {price}
          </span>
          {event.indoor === true ? <span className="pill border border-line bg-white text-ink-soft">Indoor</span> : null}
          {event.indoor === false ? <span className="pill border border-line bg-white text-ink-soft">Outdoor</span> : null}
          {event.membershipRequired === true ? <span className="pill border border-line bg-white text-ink-soft">Members</span> : null}
          {availability ? (
            <span className={cn("pill font-bold", availability.tone)} title={availability.title}>
              {availability.label}
            </span>
          ) : null}
          <StatusPill status={occurrence.status} registrationStatus={occurrence.registrationStatus} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <FreshnessIndicator
            lastChecked={event.lastChecked}
            method={event.sources[0]?.method}
            verified={event.verified}
            sourceCount={event.sourceCount}
          />
          <span className="inline-flex items-center gap-1 text-xs font-bold text-moss opacity-0 transition group-hover:opacity-100">
            View event <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
      <div className="absolute right-3 top-3 z-10">
        <SaveButton eventId={event.id} compact />
      </div>
    </article>
  );
}
