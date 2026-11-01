"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LocateFixed, MapPin, ShieldCheck } from "lucide-react";

export function NearMe({ localities }: { localities: { id: string; name: string; label: string }[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");
  const [message, setMessage] = useState("");

  function locate() {
    if (!navigator.geolocation) {
      setStatus("error");
      setMessage("Your browser does not support location access. Choose a suburb below instead.");
      return;
    }
    setStatus("locating");
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        router.push(`/events?lat=${latitude.toFixed(5)}&lng=${longitude.toFixed(5)}&radius=25&sort=closest`);
      },
      (error) => {
        setStatus("error");
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was declined. You can still search by suburb."
            : "We couldn't get your location. Try again or choose a suburb.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="card p-6 md:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime"><LocateFixed className="h-6 w-6 text-pine" /></span>
        <h2 className="mt-4 font-display text-2xl font-extrabold">Use your approximate location</h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
          We ask the browser for a rough position, then show sessions within 25 km. Location is used for this one search
          and is added to the URL — it is not stored on a server or linked to an account.
        </p>
        <button type="button" onClick={locate} disabled={status === "locating"} className="btn btn-primary mt-5">
          {status === "locating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          {status === "locating" ? "Finding you…" : "Find sessions near me"}
        </button>
        {message ? <p className="mt-3 rounded-xl border border-line bg-cream p-3 text-sm font-semibold text-ink-soft">{message}</p> : null}
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-moss" />
          Coordinates are only used to calculate straight-line distance. Nothing is saved.
        </p>
      </div>

      <div className="card p-5">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-moss">Or pick a nearby area</p>
        <div className="mt-3 grid gap-1">
          {localities.slice(0, 10).map((locality) => (
            <button
              key={locality.id}
              type="button"
              onClick={() => router.push(`/events?locality=${locality.id}&radius=25&sort=closest`)}
              className="flex items-center justify-between rounded-xl px-2 py-2.5 text-left text-sm font-semibold transition hover:bg-cream"
            >
              <span>{locality.label}</span>
              <span className="text-xs text-ink-soft">25 km →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
