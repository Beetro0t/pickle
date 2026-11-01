"use client";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LayoutGrid, SlidersHorizontal } from "lucide-react";
import type { Dataset } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { queryParams } from "@/lib/browser-query";
import { filterEvents, parseEventQuery } from "@/lib/query";
import { EventCard } from "@/components/event-card";
import { ActiveFilterChips, FilterSidebar } from "@/components/filter-panel";
import { CATEGORY_META } from "@/lib/categories";
import type { EventCategory } from "@/lib/types";
import { pluralize } from "@/lib/utils";



type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(params: Params, overrides: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key in overrides) continue;
    for (const v of Array.isArray(value) ? value : value ? [value] : []) search.append(key, v);
  }
  for (const [key, value] of Object.entries(overrides)) if (value) search.set(key, value);
  const qs = search.toString();
  return `/events${qs ? `?${qs}` : ""}`;
}


export function EventsFeed({ dataset }: { dataset: Dataset }) {
  const params = queryParams(useSearchParams());
  const query = parseEventQuery(params);
  const requestedPage = Number(first(params.page) || 1);
  const limit = 24;
  const all = filterEvents(dataset, { ...query, limit: 0 });
  const pages = Math.max(1, Math.ceil(all.total / limit));
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(1, requestedPage), pages) : 1;
  const { events, total } = filterEvents(dataset, { ...query, page, limit });
  const locality = dataset.localities.find((l) => l.id === query.locality);
  const effectiveSort = query.sort || (query.locality || query.lat != null ? "soonest" : "relevance");
  const category = query.category && query.category !== "all" ? CATEGORY_META[query.category as EventCategory] : null;

  const heading = query.q
    ? `Results for “${query.q}”`
    : category
      ? `${category.label}${locality ? ` near ${locality.name}` : " across NSW"}`
      : `Pickleball sessions${locality ? ` near ${locality.name}` : " across NSW"}`;

  return (
    <div className="page-shell py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Explore</p>
          <h1 className="mt-1.5 font-display text-3xl font-extrabold tracking-tight md:text-5xl">{heading}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {pluralize(total, "session")} match your filters
            {query.sort === "closest" && locality ? ` · sorted by distance from ${locality.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill border border-line bg-white text-ink">
            <LayoutGrid className="h-3.5 w-3.5" /> List view
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[290px_1fr]">
        <div className="space-y-3">
          <FilterSidebar params={params} localities={dataset.localities} mobile />
          <FilterSidebar params={params} localities={dataset.localities} />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ActiveFilterChips params={params} localities={dataset.localities} />
            <div className="ml-auto flex items-center gap-1 text-xs font-semibold">
              <SlidersHorizontal className="mr-1 h-3.5 w-3.5 text-ink-soft" />
              {[
                ["Best match", "relevance"],
                ["Soonest", "soonest"],
                ["Closest", "closest"],
                ["Price", "price"],
              ].map(([label, sort]) => {
                const active = effectiveSort === sort;
                return (
                  <Link
                    key={label}
                    href={buildHref(params, { sort: sort || undefined, page: undefined })}
                    className={`rounded-full px-2.5 py-1.5 transition ${active ? "bg-pine text-lime" : "text-ink-soft hover:bg-white"}`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          {events.length === 0 ? (
            <div className="card mt-4 p-8 text-center md:p-12">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime text-2xl">🎾</span>
              <h2 className="mt-5 font-display text-2xl font-extrabold">{dataset.generatedAt ? "No sessions match that combination." : "Awaiting the first scrape."}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
                {dataset.generatedAt ? "Try a wider distance, a different day, or clear the skill filter." : "Use Refresh listings above to collect live public listings. No example events are shown."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link href="/events" className="btn btn-primary">Clear filters</Link>
                <Link href="/submit" className="btn btn-ghost">Submit a missing event</Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Pagination">
              {page > 1 ? (
                <Link href={buildHref(params, { page: String(page - 1) })} className="btn btn-ghost">
                  <ArrowLeft className="h-4 w-4" /> Previous
                </Link>
              ) : <span />}
              <span className="text-xs font-semibold text-ink-soft">Page {page} of {pages}</span>
              {page < pages ? (
                <Link href={buildHref(params, { page: String(page + 1) })} className="btn btn-ghost">
                  Next <ArrowRight className="h-4 w-4" />
                </Link>
              ) : <span />}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
