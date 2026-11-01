"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, MapPin, Search } from "lucide-react";
import type { Locality } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SearchForm({
  localities,
  initialQ = "",
  initialLocality = "",
  initialDate = "all",
  showDate = true,
  variant = "hero",
  className,
  targetPath = "/events",
  anchor,
  keepParams,
}: {
  localities: Locality[];
  initialQ?: string;
  initialLocality?: string;
  initialDate?: string;
  showDate?: boolean;
  variant?: "hero" | "bar";
  className?: string;
  targetPath?: string;
  anchor?: string;
  keepParams?: Record<string, string | string[] | undefined>;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [locality, setLocality] = useState(initialLocality);
  const [date, setDate] = useState(initialDate);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQ(initialQ);
    setLocality(initialLocality);
    setDate(initialDate);
  }, [initialQ, initialLocality, initialDate]);

  const grouped = useMemo(() => {
    const map = new Map<string, Locality[]>();
    for (const l of localities) {
      if (!map.has(l.region)) map.set(l.region, []);
      map.get(l.region)!.push(l);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [localities]);

  function keptParams() {
    const params = new URLSearchParams();
    for (const [key, raw] of Object.entries(keepParams || {})) {
      if (["q", "locality", "date", "page"].includes(key)) continue;
      for (const item of Array.isArray(raw) ? raw : raw ? [raw] : []) {
        if (item) params.append(key, item);
      }
    }
    return params;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = keptParams();
    // Picking a new location should start from the soonest sessions nearby,
    // not preserve an old "closest" sort from a previous location search.
    if (locality !== initialLocality) params.delete("sort");
    if (q.trim()) params.set("q", q.trim());
    if (locality) params.set("locality", locality);
    if (date && date !== "all") params.set("date", date);
    const query = params.toString();
    router.push(`${targetPath}${query ? `?${query}` : ""}${anchor ? `#${anchor}` : ""}`);
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setError("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const params = keptParams();
        params.set("lat", position.coords.latitude.toFixed(5));
        params.set("lng", position.coords.longitude.toFixed(5));
        params.set("radius", "25");
        params.set("sort", "soonest");
        if (q.trim()) params.set("q", q.trim());
        router.push(`${targetPath}?${params.toString()}${anchor ? `#${anchor}` : ""}`);
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Choose a suburb instead.");
      },
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 600000 }
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <form
        onSubmit={submit}
        className={cn(
          "grid gap-2 rounded-[20px] border border-line bg-white p-2 shadow-card",
          variant === "hero" ? "md:grid-cols-[1.4fr_1fr_auto_auto]" : "md:grid-cols-[1.3fr_1fr_auto]"
        )}
        role="search"
      >
        <label className="relative flex items-center">
          <span className="sr-only">Search games, suburbs or clubs</span>
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-ink-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search games, suburbs or clubs"
            className="field !border-transparent bg-cream/70 pl-9 focus:bg-white"
          />
        </label>

        <label className="relative flex items-center">
          <span className="sr-only">Location</span>
          <MapPin className="pointer-events-none absolute left-3 h-4 w-4 text-ink-soft" />
          <select
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            className="field appearance-none !border-transparent bg-cream/70 pl-9 pr-8 focus:bg-white"
          >
            <option value="">All of NSW</option>
            {grouped.map(([region, items]) => (
              <optgroup key={region} label={region}>
                {items.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.postcode}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {showDate && (
          <label className="flex items-center">
            <span className="sr-only">When</span>
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field !border-transparent bg-cream/70 focus:bg-white"
            >
              <option value="all">Any date</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="weekend">This weekend</option>
              <option value="week">Next 7 days</option>
            </select>
          </label>
        )}

        <button type="submit" className="btn btn-primary h-full min-h-11">
          Search the feed
        </button>
      </form>

      <div className="mt-2 flex flex-wrap items-center gap-3 px-1">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-moss underline decoration-moss/30 underline-offset-4 hover:decoration-moss disabled:opacity-60"
        >
          <Crosshair className="h-3.5 w-3.5" />
          {locating ? "Finding you…" : "Use my location"}
        </button>
        {error && <span className="text-xs text-coral">{error}</span>}
      </div>
    </div>
  );
}
