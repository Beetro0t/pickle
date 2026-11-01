"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useSaved } from "@/lib/use-saved";
import { cn } from "@/lib/utils";

export function SaveButton({ eventId, compact = false, className }: { eventId: string; compact?: boolean; className?: string }) {
  const { isSaved, toggle, ready } = useSaved();
  const saved = ready && isSaved(eventId);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(eventId);
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved events" : "Save this event"}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border transition",
        saved ? "border-pine bg-pine text-lime" : "border-line-strong bg-white/90 text-ink hover:border-moss",
        compact ? "h-9 w-9" : "px-3 py-2 text-xs font-bold",
        className
      )}
    >
      {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {!compact && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
