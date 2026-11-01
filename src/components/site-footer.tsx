import Link from "next/link";
import { getDataset } from "@/lib/data";
import { formatDate } from "@/lib/format";

export function SiteFooter() {
  const dataset = getDataset();
  const sources = dataset.sources.filter((s) => s.status === "active" && s.eventCount > 0);

  return (
    <footer className="mt-20 border-t border-line bg-pine text-white">
      <div className="page-shell grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl font-extrabold">Pickleball Finder</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
            One place to find pickleball games, social sessions, leagues, clinics and tournaments across New South Wales.
            Listings link back to the organiser so you always book with the source.
          </p>
          <p className="mt-4 text-xs text-white/55">
            {dataset.generatedAt ? `Data refreshed ${formatDate(dataset.generatedAt, "d MMM yyyy")}.` : "Awaiting the first scrape."} Sessions from published timetables are marked as scheduled,
            not individually confirmed.
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime">Explore</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/80">
            <li><Link className="hover:text-lime" href="/events">All sessions</Link></li>
            <li><Link className="hover:text-lime" href="/social-play">Social play</Link></li>
            <li><Link className="hover:text-lime" href="/tournaments">Tournaments</Link></li>
            <li><Link className="hover:text-lime" href="/venues">Venues</Link></li>
            <li><Link className="hover:text-lime" href="/near-me">Near me</Link></li>
            <li><Link className="hover:text-lime" href="/submit">Submit an event</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime">Where listings come from</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/80">
            {sources.slice(0, 8).map((source) => (
              <li key={source.id}>
                <a className="hover:text-lime" href={source.url} target="_blank" rel="noreferrer noopener">
                  {source.name}
                </a>
              </li>
            ))}
            <li>
              <Link className="hover:text-lime" href="/sources">All {dataset.sources.length} registry entries →</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="page-shell flex flex-col gap-3 py-6 text-xs text-white/55 md:flex-row md:items-center md:justify-between">
          <p>
            Listings link to the organiser&apos;s own page. Sessions can change — always confirm details before travelling.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link className="hover:text-lime" href="/sources">Source registry</Link>
            <Link className="hover:text-lime" href="/submit">Report an error</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
