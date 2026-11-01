import { BadgeCheck, Clock3, RefreshCw } from "lucide-react";
import { categoryMeta } from "@/lib/categories";
import type { EventCategory, OccurrenceStatus, RegistrationStatus } from "@/lib/types";
import { occurrenceStatusLabel, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CategoryPill({ category, className }: { category: EventCategory; className?: string }) {
  const meta = categoryMeta(category);
  return (
    <span className={cn("pill", className)} style={{ background: meta.color, color: meta.text }}>
      {meta.short}
    </span>
  );
}

export function StatusPill({ status, registrationStatus }: { status: OccurrenceStatus; registrationStatus?: RegistrationStatus }) {
  if (status === "cancelled") {
    return <span className="pill bg-[#FFE1DA] text-[#7A2312]">Cancelled</span>;
  }
  if (status === "full" || registrationStatus === "full") {
    return <span className="pill bg-[#FCEBC4] text-[#6B4A08]">Full</span>;
  }
  if (registrationStatus === "waitlist") {
    return <span className="pill bg-[#E7E0FB] text-[#3B2A70]">Waitlist</span>;
  }
  if (registrationStatus === "open") {
    return <span className="pill bg-[#DDF3D4] text-[#20501B]">Bookings open</span>;
  }
  if (registrationStatus === "closed") {
    return <span className="pill bg-[#ECE9DE] text-[#4A4A3C]">Bookings closed</span>;
  }
  return <span className="pill bg-white text-ink-soft border border-line">{occurrenceStatusLabel(status)}</span>;
}

export function FreshnessIndicator({
  lastChecked,
  method,
  verified,
  sourceCount,
  className,
}: {
  lastChecked: string;
  method?: string;
  verified?: boolean;
  sourceCount?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-[0.72rem] font-semibold text-ink-soft", className)}
      title={`${method ? `${method}. ` : ""}Last checked ${relativeTime(lastChecked)}${sourceCount && sourceCount > 1 ? ` · ${sourceCount} sources` : ""}`}
    >
      {verified ? <BadgeCheck className="h-3.5 w-3.5 text-moss" /> : <Clock3 className="h-3.5 w-3.5" />}
      <span>
        {verified ? "Organiser published" : "Scheduled listing"} · checked {relativeTime(lastChecked)}
      </span>
      {sourceCount && sourceCount > 1 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[0.68rem] text-ink-soft">
          <RefreshCw className="h-3 w-3" /> {sourceCount} sources
        </span>
      ) : null}
    </span>
  );
}
