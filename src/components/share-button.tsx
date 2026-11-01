"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ShareButton({ title, text, path, className }: { title: string; text?: string; path: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <button type="button" onClick={share} className={cn("btn btn-ghost !px-3 !py-2", className)} aria-label="Share this event">
      {copied ? <Check className="h-4 w-4 text-moss" /> : <Share2 className="h-4 w-4" />}
      <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
    </button>
  );
}
