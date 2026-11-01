"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bookmark, MapPin, Menu, Plus, Search, X } from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/events", label: "Explore" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/social-play", label: "Social play" },
  { href: "/venues", label: "Venues" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur-md">
      <div className="page-shell flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center" aria-label="Pickleball Finder home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-semibold text-ink-soft transition hover:bg-white hover:text-ink",
                  active && "bg-white text-ink shadow-[0_1px_0_rgba(10,42,32,0.06)]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/events" className="btn btn-ghost hidden !px-3 !py-2 sm:inline-flex" aria-label="Search sessions">
            <Search className="h-4 w-4" />
            <span className="hidden xl:inline">Search</span>
          </Link>
          <Link href="/saved" className="btn btn-ghost !px-3 !py-2" aria-label="Saved events">
            <Bookmark className="h-4 w-4" />
            <span className="hidden xl:inline">Saved</span>
          </Link>
          <Link href="/submit" className="btn btn-primary hidden sm:inline-flex">
            <Plus className="h-4 w-4" />
            Submit an event
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="btn btn-ghost !px-3 !py-2 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-line bg-cream lg:hidden">
          <nav className="page-shell grid gap-1 py-3" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-3 text-base font-semibold hover:bg-white"
              >
                {item.label}
                <span aria-hidden className="text-ink-soft">
                  →
                </span>
              </Link>
            ))}
            <Link
              href="/near-me"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-3 text-base font-semibold hover:bg-white"
            >
              <MapPin className="h-4 w-4" /> Near me
            </Link>
            <Link href="/submit" onClick={() => setOpen(false)} className="btn btn-primary mt-2">
              <Plus className="h-4 w-4" /> Submit an event
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
