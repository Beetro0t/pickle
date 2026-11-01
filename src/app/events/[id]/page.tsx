import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  Info,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { getDataset, getEventById } from "@/lib/data";
import { categoryMeta } from "@/lib/categories";
import { CategoryPill, FreshnessIndicator, StatusPill } from "@/components/event-badges";
import { SaveButton } from "@/components/save-button";
import { ShareButton } from "@/components/share-button";
import {
  formatDate,
  formatPrice,
  formatTimeRange,
  levelLabel,
  occurrenceStatusLabel,
  relativeDay,
  spotsLabel,
  relativeTime,
} from "@/lib/format";
import type { Occurrence, PickleballEvent } from "@/lib/types";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";



export function generateStaticParams() { return getDataset().events.map((item) => ({ id: item.id })); }
export const dynamicParams = false;
export const dynamic = "force-static";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) return { title: "Event not found" };
  const description = event.descriptionExcerpt?.slice(0, 158) || event.summary;
  return {
    title: event.title,
    description,
    alternates: { canonical: `/events/${event.id}` },
    openGraph: {
      title: `${event.title} · ${SITE_NAME}`,
      description,
      type: "website",
      url: absoluteUrl(`/events/${event.id}`),
    },
  };
}

function eventStatusLabel(event: PickleballEvent) {
  if (event.status === "cancelled" || event.nextStatus === "cancelled") return "Cancelled";
  if (event.nextStatus === "full" || event.nextRegistrationStatus === "full") return "Full";
  if (new Date(event.nextStart).getTime() <= Date.now() && new Date(event.nextEnd).getTime() >= Date.now()) return "In progress";
  if (event.nextRegistrationStatus === "open") return "Bookings open";
  if (event.nextRegistrationStatus === "closed") return "Bookings closed";
  if (event.nextRegistrationStatus === "waitlist") return "Waitlist";
  return occurrenceStatusLabel(event.nextStatus);
}

function googleMapsUrl(event: PickleballEvent) {
  if (event.venue.lat != null && event.venue.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${event.venue.lat},${event.venue.lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.venue.address)}`;
}

function Fact({ label, value, note }: { label: string; value: ReactNode; note?: string | null }) {
  return (
    <div className="rounded-2xl border border-line bg-white/60 p-4">
      <dt className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-soft">{label}</dt>
      <dd className="mt-1.5 text-sm font-semibold leading-snug text-ink">
        {value}
        {note ? <span className="mt-1 block text-xs font-medium text-ink-soft">{note}</span> : null}
      </dd>
    </div>
  );
}

export default async function EventPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) notFound();

  const dataset = getDataset();
  const now = Date.now();
  const ongoing = new Date(event.nextStart).getTime() <= now && new Date(event.nextEnd).getTime() >= now;
  const upcoming = event.occurrences.filter((occurrence) => new Date(occurrence.end).getTime() >= now - 3 * 60 * 60 * 1000);
  const dates = upcoming.length ? upcoming : event.occurrences;
  const visibleDates = dates.slice(0, 6);
  const remainingDates = dates.slice(6);
  const sourceById = new Map(dataset.sources.map((source) => [source.id, source]));
  const bookingUrl = event.bookingUrl || event.officialUrl;
  const bookingHost = bookingUrl ? new URL(bookingUrl).hostname.replace(/^www\./, "") : null;
  const meta = categoryMeta(event.category);
  const level = event.levels.length ? levelLabel(event.levels) : "Not provided";
  const price = formatPrice(event.price);
  const priceUnit = event.price && !event.price.free ? event.price.unit : null;
  const next = dates[0] || null;
  const hasSomeCancelled = event.occurrences.some((occurrence) => occurrence.status === "cancelled");
  const remainingCount = remainingDates.length;

  const statusBanner =
    event.status === "cancelled" || event.nextStatus === "cancelled" ? (
      <div className="flex gap-3 rounded-2xl border border-[#f0b4a5] bg-[#fff0ec] p-4 text-sm text-[#7a2312]">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-bold">This event is marked cancelled at the source.</p>
          <p className="mt-1 text-[#7a2312]/80">Contact the organiser before making plans, and check the original listing for the latest status.</p>
        </div>
      </div>
    ) : event.nextStatus === "full" || event.nextRegistrationStatus === "full" ? (
      <div className="flex gap-3 rounded-2xl border border-[#e7cf90] bg-[#fff8e6] p-4 text-sm text-[#6b4a08]">
        <Info className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-bold">The next session is marked full on the organiser&apos;s booking page.</p>
          <p className="mt-1 text-[#6b4a08]/80">There may be a waitlist or cancellations. Open the original booking page for the current position.</p>
        </div>
      </div>
    ) : !event.verified ? (
      <div className="flex gap-3 rounded-2xl border border-line bg-white p-4 text-sm text-ink-soft">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-moss" />
        <div>
          <p className="font-bold text-ink">This listing has not been confirmed by the organiser.</p>
          <p className="mt-1">It was collected from a public source. Confirm times and availability before travelling.</p>
        </div>
      </div>
    ) : null;

  return (
    <>
      <section className="court-lines relative overflow-hidden bg-pine text-cream">
        <div className="page-shell relative py-7 md:py-10">
          <Link href="/events" className="inline-flex items-center gap-1.5 text-xs font-bold text-cream/65 transition hover:text-lime">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to explore
          </Link>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <CategoryPill category={event.category} />
            {event.recurrenceLabel ? (
              <span className="pill border border-cream/20 bg-white/10 text-cream">
                <Sparkles className="h-3 w-3" /> Recurring
              </span>
            ) : null}
            <span className="pill border border-cream/20 bg-white/10 text-cream">
              <RefreshCw className="h-3 w-3" /> {event.sourceCount} {event.sourceCount === 1 ? "source" : "sources"}
            </span>
            <span className="pill border border-cream/20 bg-white/10 text-cream">{eventStatusLabel(event)}</span>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="min-w-0">
              <h1 className="max-w-4xl text-balance font-display text-4xl font-extrabold leading-[0.98] tracking-tight text-cream sm:text-5xl md:text-6xl">
                {event.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-cream/70 md:text-base">{event.summary}</p>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-cream/85">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-lime" />
                  {next ? (
                    <time dateTime={next.start}>
                      {ongoing ? (
                        <>In progress · ends {formatDate(next.end, "EEE d MMM, h:mm a")}</>
                      ) : (
                        <>
                          {relativeDay(next.start) ? `${relativeDay(next.start)} · ` : ""}
                          {formatDate(next.start, "EEE d MMM")} · {formatTimeRange(next.start, next.end)}
                        </>
                      )}
                    </time>
                  ) : (
                    "Dates not provided"
                  )}
                </span>
                <Link href={`/venues/${event.venueId}`} className="inline-flex items-center gap-2 underline decoration-cream/25 underline-offset-4 hover:text-lime">
                  <MapPin className="h-4 w-4 text-lime" />
                  {event.venue.name}
                  {event.venue.suburb ? ` · ${event.venue.suburb}` : ""}
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SaveButton eventId={event.id} className="!border-cream/25 !bg-white/10 !text-cream hover:!border-lime" />
              <ShareButton
                title={event.title}
                text={event.summary}
                path={`/events/${event.id}`}
                className="!border-cream/25 !text-cream hover:!bg-white/10"
              />
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            {bookingUrl ? (
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-lime">
                {event.bookingUrl ? "Book with the organiser" : "View organiser page"}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            ) : (
              <span className="btn border border-cream/25 text-cream/70">No booking link provided</span>
            )}
            <a href={googleMapsUrl(event)} target="_blank" rel="noopener noreferrer" className="btn border border-cream/25 text-cream hover:bg-white/10">
              <Navigation className="h-4 w-4" /> Directions
            </a>
            {bookingHost ? <span className="ml-1 text-xs font-semibold text-cream/55">Booking via {bookingHost}</span> : null}
          </div>
        </div>
      </section>

      <div className="page-shell grid gap-8 py-8 pb-24 lg:grid-cols-[minmax(0,1fr)_350px] lg:py-12 lg:pb-16">
        <div className="min-w-0 space-y-7">
          {statusBanner}

          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5 md:p-6">
              <div>
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-moss">When it runs</p>
                <h2 className="mt-1 font-display text-2xl font-extrabold">Dates &amp; times</h2>
              </div>
              <span className="pill border border-line bg-cream text-ink-soft">
                <Clock3 className="h-3 w-3" /> {event.recurrenceLabel || `${dates.length} ${dates.length === 1 ? "date" : "dates"}`}
              </span>
            </div>

            <div className="p-5 md:p-6">
              {dates.length === 0 ? (
                <p className="text-sm text-ink-soft">No future dates are currently published. Check the original listing for updates.</p>
              ) : (
                <>
                  <ul className="divide-y divide-line">
                    {visibleDates.map((occurrence) => (
                      <OccurrenceRow key={occurrence.id} occurrence={occurrence} />
                    ))}
                  </ul>

                  {remainingCount > 0 ? (
                    <details className="group mt-3 rounded-2xl border border-line bg-cream/60 px-4 py-3">
                      <summary className="cursor-pointer text-sm font-bold text-moss marker:text-moss">
                        Show all {dates.length} published dates
                      </summary>
                      <ul className="mt-2 divide-y divide-line">
                        {remainingDates.map((occurrence) => (
                          <OccurrenceRow key={occurrence.id} occurrence={occurrence} />
                        ))}
                      </ul>
                    </details>
                  ) : null}

                  <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {event.recurrenceLabel
                        ? "These dates are generated from the organiser's published weekly timetable. Public holidays, venue closures and private bookings can change a session — confirm with the organiser."
                        : "Dates are shown as published by the organiser. Check the original listing before making plans."}
                    </span>
                  </p>
                </>
              )}
            </div>
          </section>

          <section className="card p-5 md:p-6">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-moss">About this session</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">The details, in one place</h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft md:text-[0.95rem]">
              {event.descriptionExcerpt || event.description ? (
                <p className="whitespace-pre-line">{event.descriptionExcerpt || event.description}</p>
              ) : (
                <p>
                  The organiser has not published a longer description for this listing. The key facts are summarised from their public timetable and event page.
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="pill border border-line bg-cream text-ink">{level}</span>
                {event.duprRange ? <span className="pill border border-line bg-cream text-ink">{event.duprRange}</span> : null}
                {event.format ? <span className="pill border border-line bg-cream text-ink">{event.format}</span> : null}
                {event.indoor === true ? <span className="pill border border-line bg-cream text-ink">Indoor</span> : null}
                {event.indoor === false ? <span className="pill border border-line bg-cream text-ink">Outdoor</span> : null}
              </div>
              {event.descriptionExcerpt ? (
                <p className="text-xs text-ink-soft/80">
                  Description reproduced from the organiser&apos;s public listing. See the source links below for the original wording and any updates.
                </p>
              ) : null}
            </div>
          </section>

          <section className="card p-5 md:p-6">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-moss">Know before you go</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">Good to know</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Fact label="Skill level" value={level} note={event.duprRange ? `DUPR reference: ${event.duprRange}` : "As published by the organiser"} />
              <Fact label="Format" value={event.format || "Not provided"} note={event.categoryLabel} />
              <Fact label="Setting" value={event.indoor === true ? "Indoor" : event.indoor === false ? "Outdoor" : "Not provided"} />
              <Fact
                label="Eligibility"
                value={[event.ageGroup, event.gender].filter(Boolean).join(" · ") || "Not provided"}
                note={event.ageGroup || event.gender ? "As published by the organiser" : null}
              />
              <Fact
                label="Membership"
                value={event.membershipRequired === true ? "Membership required" : event.membershipRequired === false ? "Open to everyone" : "Not provided"}
              />
              <Fact
                label="Equipment"
                value={event.equipmentProvided === true ? "Equipment provided" : event.equipmentProvided === false ? "Bring your own" : "Not provided"}
              />
              <Fact
                label="Facilities"
                value={event.facilities.length ? event.facilities.join(" · ") : "Not provided"}
              />
              <Fact
                label="Booking status"
                value={eventStatusLabel(event)}
                note={next?.note || "Check the organiser's booking page for live availability"}
              />
              <Fact
                label="Spots left"
                value={spotsLabel(next?.spotsLeft, next?.status)}
                note={typeof next?.spotsLeft === "number" ? "As shown on the organiser's booking page" : "The organiser has not published availability"}
              />
            </dl>
            {event.category === "tournament" || event.category === "league" ? (
              <div className="mt-4 rounded-2xl border border-line bg-cream/70 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  <ShieldCheck className="h-4 w-4 text-moss" /> Competition details
                </p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink-soft">Tier</dt>
                    <dd className="mt-1 font-semibold">{event.tournamentTier || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink-soft">Sanctioned</dt>
                    <dd className="mt-1 font-semibold">{event.sanctioned === true ? "Yes" : event.sanctioned === false ? "No" : "Not provided"}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink-soft">Divisions</dt>
                    <dd className="mt-1 font-semibold">{event.ageGroup || event.gender || "See organiser page"}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </section>

          <section className="card overflow-hidden">
            <div className="p-5 pb-4 md:p-6 md:pb-4">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-moss">Where to play</p>
              <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-extrabold">{event.venue.name}</h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    {event.venue.address || [event.venue.suburb, event.venue.state, event.venue.postcode].filter(Boolean).join(", ") || "Address not provided"}
                  </p>
                </div>
                <a href={googleMapsUrl(event)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !px-3 !py-2">
                  <Navigation className="h-4 w-4" /> Directions
                </a>
              </div>
            </div>
            <div className="border-t border-line bg-cream/60 p-5 text-sm text-ink-soft md:p-6">
              Use the directions link above or the full address to find the courts. Maps are not embedded in this listing.
            </div>
            {event.venue.facilities.length ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-line p-4 text-xs text-ink-soft md:px-6">
                <span className="font-bold text-ink">At the venue:</span>
                {event.venue.facilities.map((facility) => (
                  <span key={facility} className="pill border border-line bg-cream text-ink-soft">{facility}</span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="card p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-moss">Provenance</p>
                <h2 className="mt-1 font-display text-2xl font-extrabold">Where this listing comes from</h2>
              </div>
              <FreshnessIndicator lastChecked={event.lastChecked} method={event.sources[0]?.method} verified={event.verified} sourceCount={event.sourceCount} />
            </div>
            <div className="mt-4 space-y-2">
              {event.sources.map((source) => {
                const sourceInfo = sourceById.get(source.sourceId);
                return (
                  <a
                    key={`${source.sourceId}-${source.url}`}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start justify-between gap-3 rounded-2xl border border-line bg-cream/50 p-4 transition hover:border-moss hover:bg-cream"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-ink">{sourceInfo?.name || source.sourceId}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                        {source.method} · checked {relativeTime(source.lastChecked)}
                        {sourceInfo?.region ? ` · ${sourceInfo.region}` : ""}
                      </span>
                    </span>
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft transition group-hover:text-moss" />
                  </a>
                );
              })}
            </div>
            <div className="mt-4 space-y-2 text-xs leading-relaxed text-ink-soft">
              <p>
                We only store factual event metadata and link back to the original listing. We do not copy full event pages, images or attendee information.
              </p>
              <p>
                Last checked {relativeTime(event.lastChecked)}. If a detail has changed, the organiser&apos;s page is the authoritative source.
              </p>
              <Link href={`/submit?report=${event.id}`} className="inline-flex items-center gap-1 font-bold text-moss underline decoration-moss/30 underline-offset-4">
                Report incorrect information <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="bg-lime p-5 md:p-6">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-pine/70">Cost</p>
              <div className="mt-1 flex items-end gap-2">
                <span className="font-display text-4xl font-extrabold tracking-tight text-ink">{price}</span>
                {priceUnit ? <span className="pb-1 text-xs font-bold text-pine/70">{priceUnit}</span> : null}
              </div>
              {event.price?.memberAmount != null ? (
                <p className="mt-1 text-xs font-semibold text-pine/75">Members ${event.price.memberAmount.toFixed(2).replace(/\.00$/, "")}</p>
              ) : null}
              {event.price?.notes ? <p className="mt-2 text-xs leading-relaxed text-pine/75">{event.price.notes}</p> : null}
              {!event.price ? <p className="mt-2 text-xs leading-relaxed text-pine/75">The organiser has not published a price. Check the booking page.</p> : null}
            </div>
            <div className="space-y-3 p-5 md:p-6">
              {bookingUrl ? (
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full">
                  {event.bookingUrl ? "Book this session" : "Open organiser page"} <ArrowUpRight className="h-4 w-4" />
                </a>
              ) : (
                <p className="rounded-xl bg-cream p-3 text-center text-xs font-semibold text-ink-soft">No booking link was published with this listing.</p>
              )}
              <p className="flex items-start gap-2 text-[0.7rem] leading-relaxed text-ink-soft">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-moss" />
                <span>
                  Booking happens on the organiser&apos;s website. {event.verified ? "This session was published directly by the organiser." : "We could not verify this listing directly with the organiser."}
                </span>
              </p>
            </div>
          </div>

          <div className="card p-5 md:p-6">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-moss">Organiser</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pine font-display text-lg font-extrabold text-lime">
                {event.organizer.name.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-extrabold">{event.organizer.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[0.7rem] font-semibold text-ink-soft">
                  {event.organizer.verified ? <Check className="h-3 w-3 text-moss" /> : null}
                  {event.organizer.verified ? "Published organiser" : "Public listing"}
                </p>
              </div>
            </div>
            {event.organizer.website ? (
              <a href={event.organizer.website} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-moss underline decoration-moss/30 underline-offset-4">
                Visit organiser website <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 text-xs">
              <div>
                <p className="text-ink-soft">Sessions listed</p>
                <p className="mt-0.5 font-bold">{event.organizer.eventCount ?? 1}</p>
              </div>
              <div>
                <p className="text-ink-soft">Last checked</p>
                <p className="mt-0.5 font-bold">{relativeTime(event.lastChecked)}</p>
              </div>
            </div>
          </div>

          <div className="card p-5 md:p-6">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-moss">Quick facts</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-ink-soft">{ongoing ? "Happening now" : "Next session"}</dt>
                <dd className="text-right font-bold">{next ? (ongoing ? `Ends ${formatDate(next.end, "EEE d MMM, h:mm a")}` : `${formatDate(next.start, "EEE d MMM")}, ${formatTimeRange(next.start, next.end)}`) : "Not provided"}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-ink-soft">Level</dt>
                <dd className="text-right font-bold">{level}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-ink-soft">Format</dt>
                <dd className="text-right font-bold">{event.format || "Not provided"}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-ink-soft">Spots left</dt>
                <dd className="text-right font-bold">{spotsLabel(next?.spotsLeft, next?.status)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-ink-soft">Setting</dt>
                <dd className="text-right font-bold">{event.indoor === true ? "Indoor" : event.indoor === false ? "Outdoor" : "Not provided"}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-ink-soft">Region</dt>
                <dd className="text-right font-bold">{event.region || event.venue.suburb || "NSW"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-line bg-white/50 p-4 text-xs leading-relaxed text-ink-soft">
            <p className="flex items-center gap-2 font-bold text-ink">
              <Users className="h-4 w-4 text-moss" /> Something not right?
            </p>
            <p className="mt-1.5">Tell us if a time, price or venue has changed. Organiser corrections are reviewed before they go live.</p>
            <Link href={`/submit?report=${event.id}`} className="mt-2 inline-flex items-center gap-1 font-bold text-moss underline decoration-moss/30 underline-offset-4">
              Report this event <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/95 p-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-ink">{event.title}</p>
            <p className="mt-0.5 text-[0.7rem] text-ink-soft">{price}{priceUnit ? ` ${priceUnit}` : ""} · {next ? formatDate(next.start, "EEE d MMM") : "Dates not provided"}</p>
          </div>
          {bookingUrl ? (
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary shrink-0 !px-4 !py-2.5 text-xs">
              Book <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ) : (
            <Link href={`/venues/${event.venueId}`} className="btn btn-ghost shrink-0 !px-4 !py-2.5 text-xs">Venue</Link>
          )}
        </div>
      </div>

      {event.venue.lat != null && event.venue.lng != null ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Event",
              name: event.title,
              description: event.descriptionExcerpt || event.summary,
              startDate: event.nextStart,
              endDate: event.nextEnd,
              eventStatus: event.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
              eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
              location: {
                "@type": "Place",
                name: event.venue.name,
                address: {
                  "@type": "PostalAddress",
                  streetAddress: event.venue.address,
                  addressLocality: event.venue.suburb || undefined,
                  addressRegion: event.venue.state || "NSW",
                  postalCode: event.venue.postcode || undefined,
                  addressCountry: "AU",
                },
                geo: { "@type": "GeoCoordinates", latitude: event.venue.lat, longitude: event.venue.lng },
              },
              organizer: { "@type": "Organization", name: event.organizer.name, url: event.organizer.website || undefined },
              offers: event.price
                ? {
                    "@type": "Offer",
                    price: event.price.min,
                    priceCurrency: "AUD",
                    availability: event.nextRegistrationStatus === "full" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
                    url: bookingUrl || absoluteUrl(`/events/${event.id}`),
                  }
                : undefined,
              url: absoluteUrl(`/events/${event.id}`),
            }).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
    </>
  );
}

function OccurrenceRow({ occurrence }: { occurrence: Occurrence }) {
  const cancelled = occurrence.status === "cancelled";
  return (
    <li className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5 first:pt-0 last:pb-0", cancelled && "opacity-60")}>
      <div className="flex w-[52px] shrink-0 flex-col items-center rounded-xl border border-line bg-cream px-2 py-1.5">
        <span className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-ink-soft">{formatDate(occurrence.start, "MMM")}</span>
        <span className="font-display text-lg font-extrabold leading-tight text-ink">{formatDate(occurrence.start, "d")}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">
          <time dateTime={occurrence.start}>{formatDate(occurrence.start, "EEEE")}</time>
          <span className="font-semibold text-ink-soft"> · {formatTimeRange(occurrence.start, occurrence.end)}</span>
        </p>
        {occurrence.note ? <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{occurrence.note}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <StatusPill status={occurrence.status} registrationStatus={occurrence.registrationStatus} />
        {typeof occurrence.spotsLeft === "number" ? (
          <span className="text-[0.7rem] font-semibold text-ink-soft">{spotsLabel(occurrence.spotsLeft, occurrence.status)}</span>
        ) : null}
      </div>
      {occurrence.url && !cancelled ? (
        <a href={occurrence.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-moss underline decoration-moss/30 underline-offset-4">
          Book <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </li>
  );
}
