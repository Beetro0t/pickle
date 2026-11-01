"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { CATEGORY_META } from "@/lib/categories";
import type { EventCategory, Locality } from "@/lib/types";
import { activeFilterCount } from "@/components/filter-panel";

const DAYS = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
  ["sunday", "Sun"],
] as const;

type Params = Record<string, string | string[] | undefined>;

function value(params: Params, key: string) {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v || "";
}

function selectedDays(params: Params) {
  const raw = params.day;
  const values = Array.isArray(raw) ? raw : raw ? raw.split(",") : [];
  return values.map((day) => day.toLowerCase());
}

export function HomeFeedFilters({
  params,
  localities,
  total,
}: {
  params: Params;
  localities: Locality[];
  total: number;
}) {
  const router = useRouter();
  const count = activeFilterCount(params);
  const days = selectedDays(params);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget).entries()) {
      if (typeof value === "string" && value.trim()) params.append(key, value.trim());
    }
    const query = params.toString();
    router.push(`/${query ? `?${query}` : ""}#feed`);
  }
  const grouped = new Map<string, Locality[]>();
  for (const locality of localities) {
    if (!grouped.has(locality.region)) grouped.set(locality.region, []);
    grouped.get(locality.region)!.push(locality);
  }

  return (
    <section className="bg-white p-4 text-ink md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink-soft">
          Search for something specific, or just narrow things down — the feed below updates.
        </p>
        {count > 0 ? (
          <Link href="/#feed" className="inline-flex items-center gap-1.5 text-xs font-bold text-moss underline decoration-moss/30 underline-offset-4">
            <RotateCcw className="h-3.5 w-3.5" /> Reset {count} {count === 1 ? "filter" : "filters"}
          </Link>
        ) : null}
      </div>

      <form key={JSON.stringify(params)} onSubmit={submit} method="get" action="/#feed" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="col-span-2">
          <label htmlFor="feed-q" className="label">Keyword</label>
          <input id="feed-q" name="q" defaultValue={value(params, "q")} className="field" placeholder="Club, venue, suburb or event name" />
        </div>
        <div>
          <label htmlFor="feed-category" className="label">Type of play</label>
          <select id="feed-category" name="category" defaultValue={value(params, "category")} className="field">
            <option value="">Everything</option>
            {(Object.keys(CATEGORY_META) as EventCategory[]).map((category) => (
              <option key={category} value={category}>{CATEGORY_META[category].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="feed-level" className="label">Skill level</label>
          <select id="feed-level" name="level" defaultValue={value(params, "level")} className="field">
            <option value="">Any level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="all">All levels / open play</option>
            <option value="dupr">DUPR-rated only</option>
          </select>
        </div>

        <div>
          <label htmlFor="feed-dupr" className="label">My DUPR <span className="normal-case tracking-normal text-ink-soft/70">(optional)</span></label>
          <input
            id="feed-dupr"
            name="dupr"
            type="number"
            min="2"
            max="8"
            step="0.1"
            inputMode="decimal"
            defaultValue={value(params, "dupr")}
            className="field"
            placeholder="e.g. 3.5"
          />
          <p className="mt-1 text-[0.7rem] text-ink-soft">Shows sessions whose published DUPR range includes you.</p>
        </div>
        <div>
          <label htmlFor="feed-date" className="label">When</label>
          <select id="feed-date" name="date" defaultValue={value(params, "date")} className="field">
            <option value="">Any date</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="weekend">This weekend</option>
            <option value="week">Next 7 days</option>
          </select>
        </div>
        <div>
          <label htmlFor="feed-from" className="label">Or an exact date</label>
          <input id="feed-from" name="from" type="date" defaultValue={value(params, "from")} className="field" />
        </div>
        <div>
          <label htmlFor="feed-session" className="label">Time of day</label>
          <select id="feed-session" name="session" defaultValue={value(params, "session")} className="field">
            <option value="">Any time</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
          </select>
        </div>

        <div>
          <label htmlFor="feed-indoor" className="label">Setting</label>
          <select id="feed-indoor" name="indoor" defaultValue={value(params, "indoor")} className="field">
            <option value="">Indoor or outdoor</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
          </select>
        </div>
        <div>
          <label htmlFor="feed-price" className="label">Price</label>
          <select id="feed-price" name="price" defaultValue={value(params, "price")} className="field">
            <option value="">Any price</option>
            <option value="free">Free only</option>
            <option value="paid">Paid sessions</option>
          </select>
        </div>
        <div>
          <label htmlFor="feed-membership" className="label">Who can play</label>
          <select id="feed-membership" name="membership" defaultValue={value(params, "membership")} className="field">
            <option value="">Everyone</option>
            <option value="open">No membership needed</option>
            <option value="members">Members only</option>
          </select>
        </div>
        <div>
          <label htmlFor="feed-sort" className="label">Sort by</label>
          <select
            id="feed-sort"
            name="sort"
            defaultValue={value(params, "sort") || (value(params, "locality") || value(params, "lat") ? "soonest" : "relevance")}
            className="field"
          >
            <option value="relevance">Best match</option>
            <option value="soonest">Soonest</option>
            <option value="closest">Closest</option>
            <option value="price">Lowest price</option>
          </select>
        </div>

        <div className="col-span-2">
          <label htmlFor="feed-locality" className="label">Location</label>
          <select id="feed-locality" name="locality" defaultValue={value(params, "locality")} className="field">
            <option value="">All of NSW</option>
            {[...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([region, items]) => (
              <optgroup key={region} label={region}>
                {items.map((locality) => (
                  <option key={locality.id} value={locality.id}>{locality.name} {locality.postcode}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="feed-radius" className="label">Distance</label>
          <select id="feed-radius" name="radius" defaultValue={value(params, "radius")} className="field">
            <option value="">Any distance</option>
            <option value="5">Within 5 km</option>
            <option value="10">Within 10 km</option>
            <option value="25">Within 25 km</option>
            <option value="50">Within 50 km</option>
            <option value="100">Within 100 km</option>
          </select>
        </div>
        <div className="col-span-2">
          <p className="label">Days</p>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map(([id, label]) => (
              <label key={id} className="cursor-pointer">
                <input type="checkbox" name="day" value={id} defaultChecked={days.includes(id)} className="peer sr-only" />
                <span className="inline-flex h-9 min-w-10 items-center justify-center rounded-full border border-line-strong bg-white px-2 text-xs font-bold text-ink-soft transition peer-checked:border-pine peer-checked:bg-pine peer-checked:text-lime">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4 col-span-2 lg:col-span-4">
          <button type="submit" className="btn btn-primary">
            <Filter className="h-4 w-4" /> Update my feed
          </button>
          <span className="text-xs font-semibold text-ink-soft">
            {total} {total === 1 ? "listing" : "listings"} match this feed
          </span>
          {count > 0 ? (
            <Link href="/#feed" className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-moss underline decoration-moss/30 underline-offset-4">
              Clear filters
            </Link>
          ) : null}
        </div>
      </form>
    </section>
  );
}
