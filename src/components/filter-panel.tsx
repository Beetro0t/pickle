import Link from "next/link";
import { ChevronDown, Filter, RotateCcw, Search } from "lucide-react";
import type { EventCategory, Locality } from "@/lib/types";
import { CATEGORY_META } from "@/lib/categories";
import { cn } from "@/lib/utils";

const DAYS = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
  ["sunday", "Sun"],
] as const;

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v || "";
}

function selectedDays(params: Record<string, string | string[] | undefined>) {
  const raw = params.day;
  const values = Array.isArray(raw) ? raw : raw ? raw.split(",") : [];
  return values.map((d) => d.toLowerCase());
}

export function activeFilterCount(params: Record<string, string | string[] | undefined>) {
  const keys = ["q", "locality", "lat", "date", "from", "dupr", "category", "level", "day", "session", "indoor", "price", "membership", "radius"];
  let count = 0;
  for (const key of keys) {
    const v = params[key];
    if (Array.isArray(v) ? v.length : v) {
      if (key === "date" && v === "all") continue;
      if (key === "radius" && !value(params, "locality") && !value(params, "lat")) continue;
      count++;
    }
  }
  return count;
}

export function FilterFields({
  params,
  localities,
  prefix,
  showSort = true,
}: {
  params: Record<string, string | string[] | undefined>;
  localities: Locality[];
  prefix: string;
  showSort?: boolean;
}) {
  const currentCategory = value(params, "category");
  const currentLevel = value(params, "level");
  const days = selectedDays(params);
  const grouped = new Map<string, Locality[]>();
  for (const l of localities) {
    if (!grouped.has(l.region)) grouped.set(l.region, []);
    grouped.get(l.region)!.push(l);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor={`${prefix}-q`}>Search</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-soft" />
          <input id={`${prefix}-q`} name="q" defaultValue={value(params, "q")} placeholder="Club, venue or keyword" className="field pl-9" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor={`${prefix}-locality`}>Location</label>
        <select id={`${prefix}-locality`} name="locality" defaultValue={value(params, "locality")} className="field">
          <option value="">All of NSW</option>
          {[...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([region, items]) => (
            <optgroup key={region} label={region}>
              {items.map((l) => (
                <option key={l.id} value={l.id}>{l.name} {l.postcode}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={`${prefix}-date`}>When</label>
          <select id={`${prefix}-date`} name="date" defaultValue={value(params, "date") || "all"} className="field">
            <option value="all">Any date</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="weekend">This weekend</option>
            <option value="week">Next 7 days</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${prefix}-session`}>Time of day</label>
          <select id={`${prefix}-session`} name="session" defaultValue={value(params, "session")} className="field">
            <option value="">Any time</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor={`${prefix}-category`}>Event type</label>
        <select id={`${prefix}-category`} name="category" defaultValue={currentCategory} className="field">
          <option value="">All types</option>
          {(Object.keys(CATEGORY_META) as EventCategory[]).map((c) => (
            <option key={c} value={c}>{CATEGORY_META[c].label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor={`${prefix}-level`}>Skill level</label>
        <select id={`${prefix}-level`} name="level" defaultValue={currentLevel} className="field">
          <option value="">Any level</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="all">All levels / open play</option>
          <option value="dupr">DUPR rated</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor={`${prefix}-dupr`}>My DUPR (optional)</label>
        <input
          id={`${prefix}-dupr`}
          name="dupr"
          type="number"
          min="2"
          max="8"
          step="0.1"
          inputMode="decimal"
          defaultValue={value(params, "dupr")}
          placeholder="e.g. 3.5"
          className="field"
        />
      </div>

      <fieldset>
        <legend className="label">Days</legend>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map(([id, label]) => (
            <label key={id} className="cursor-pointer">
              <input type="checkbox" name="day" value={id} defaultChecked={days.includes(id)} className="peer sr-only" />
              <span className="inline-flex h-8 min-w-10 items-center justify-center rounded-full border border-line-strong bg-white px-2 text-xs font-bold text-ink-soft transition peer-checked:border-pine peer-checked:bg-pine peer-checked:text-lime">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={`${prefix}-indoor`}>Setting</label>
          <select id={`${prefix}-indoor`} name="indoor" defaultValue={value(params, "indoor")} className="field">
            <option value="">Any</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${prefix}-price`}>Price</label>
          <select id={`${prefix}-price`} name="price" defaultValue={value(params, "price")} className="field">
            <option value="">Any</option>
            <option value="free">Free only</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={`${prefix}-membership`}>Who can play</label>
          <select id={`${prefix}-membership`} name="membership" defaultValue={value(params, "membership")} className="field">
            <option value="">Everyone</option>
            <option value="open">No membership needed</option>
            <option value="members">Members only</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${prefix}-radius`}>Distance</label>
          <select id={`${prefix}-radius`} name="radius" defaultValue={value(params, "radius") || "25"} className="field">
            <option value="5">Within 5 km</option>
            <option value="10">Within 10 km</option>
            <option value="25">Within 25 km</option>
            <option value="50">Within 50 km</option>
            <option value="100">Within 100 km</option>
          </select>
        </div>
      </div>

      {showSort && (
        <div>
          <label className="label" htmlFor={`${prefix}-sort`}>Sort by</label>
          <select
            id={`${prefix}-sort`}
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
      )}

      {value(params, "view") ? <input type="hidden" name="view" value={value(params, "view")} /> : null}
      {value(params, "lat") ? <input type="hidden" name="lat" value={value(params, "lat")} /> : null}
      {value(params, "lng") ? <input type="hidden" name="lng" value={value(params, "lng")} /> : null}
    </div>
  );
}

export function FilterSidebar({
  params,
  localities,
  action = "/events",
  mobile = false,
}: {
  params: Record<string, string | string[] | undefined>;
  localities: Locality[];
  action?: string;
  mobile?: boolean;
}) {
  const count = activeFilterCount(params);
  const form = (prefix: string, id: string) => (
    <form key={JSON.stringify(params)} id={id} method="get" action={`${process.env.NEXT_PUBLIC_BASE_PATH || "/pickle"}${action}/`} className="card p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-display text-lg font-bold">
          <Filter className="h-4 w-4" /> Filters
          {count > 0 && <span className="pill bg-lime text-ink">{count}</span>}
        </p>
        <Link href={action} className="inline-flex items-center gap-1 text-xs font-bold text-moss hover:underline">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Link>
      </div>
      <FilterFields params={params} localities={localities} prefix={prefix} />
      <button type="submit" className="btn btn-primary mt-5 w-full">Show results</button>
    </form>
  );

  if (mobile) {
    return (
      <details className="group card overflow-hidden lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3.5 font-display text-base font-bold">
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
            {count > 0 && <span className="pill bg-lime text-ink">{count}</span>}
          </span>
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-line p-4">{form("mobile", "mobile-filters")}</div>
      </details>
    );
  }

  return <aside className="hidden lg:block">{form("desktop", "desktop-filters")}</aside>;
}

export function ActiveFilterChips({
  params,
  localities,
}: {
  params: Record<string, string | string[] | undefined>;
  localities: Locality[];
}) {
  const chips: { label: string; href: string }[] = [];
  const base = { ...params };
  const remove = (key: string) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(base)) {
      if (k === key) continue;
      for (const item of Array.isArray(v) ? v : v ? [v] : []) next.append(k, item);
    }
    return `/events?${next.toString()}`;
  };
  const labelForLocality = localities.find((l) => l.id === value(params, "locality"))?.name;
  if (value(params, "q")) chips.push({ label: `“${value(params, "q")}”`, href: remove("q") });
  if (labelForLocality) chips.push({ label: labelForLocality, href: remove("locality") });
  const dateLabels: Record<string, string> = { today: "Today", tomorrow: "Tomorrow", weekend: "This weekend", week: "Next 7 days" };
  if (value(params, "date") && value(params, "date") !== "all") chips.push({ label: dateLabels[value(params, "date")] || value(params, "date"), href: remove("date") });
  if (value(params, "category")) chips.push({ label: CATEGORY_META[value(params, "category") as EventCategory]?.label || value(params, "category"), href: remove("category") });
  const levelLabels: Record<string, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", all: "All levels / open play", dupr: "DUPR rated" };
  if (value(params, "level")) chips.push({ label: levelLabels[value(params, "level")] || value(params, "level"), href: remove("level") });
  if (value(params, "dupr")) chips.push({ label: `DUPR ${value(params, "dupr")}`, href: remove("dupr") });
  if (value(params, "from")) chips.push({ label: value(params, "from"), href: remove("from") });
  if (value(params, "day")) chips.push({ label: value(params, "day")?.replace(/,/g, ", "), href: remove("day") });
  if (value(params, "session")) chips.push({ label: value(params, "session"), href: remove("session") });
  if (value(params, "indoor")) chips.push({ label: value(params, "indoor"), href: remove("indoor") });
  if (value(params, "price")) chips.push({ label: value(params, "price") === "free" ? "Free only" : "Paid", href: remove("price") });
  if (value(params, "membership")) chips.push({ label: value(params, "membership") === "open" ? "No membership" : "Members", href: remove("membership") });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Link key={chip.label} href={chip.href} className="pill border border-line bg-white text-ink hover:border-moss">
          {chip.label} <span aria-hidden>×</span>
        </Link>
      ))}
      <Link href="/events" className="text-xs font-bold text-moss underline underline-offset-4">Clear all</Link>
    </div>
  );
}
