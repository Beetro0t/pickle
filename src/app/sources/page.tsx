import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ExternalLink, ShieldCheck, XCircle } from "lucide-react";
import { getDataset } from "@/lib/data";
import { relativeTime } from "@/lib/format";
import { pluralize } from "@/lib/utils";



export const metadata: Metadata = {
  title: "Where our pickleball listings come from",
  description:
    "The public sources behind Pickleball Finder, how each is collected, and which platforms we deliberately do not scrape.",
};

const POLICY_LABEL: Record<string, string> = {
  allowed: "Collected",
  restricted: "Restricted",
  excluded: "Not collected",
  unavailable: "Not collected",
  review: "Under review",
};

function policyClass(policy: string) {
  if (policy === "allowed") return "bg-[#DDF3D4] text-[#20501B]";
  if (policy === "restricted") return "bg-[#FCEBC4] text-[#6B4A08]";
  if (policy === "excluded") return "bg-[#FFE1DA] text-[#7A2312]";
  return "bg-[#ECE9DE] text-[#4A4A3C]";
}

export default function SourcesPage() {
  const dataset = getDataset();
  const collected = dataset.sources.filter((source) => source.policy === "allowed" && source.eventCount > 0);
  const excluded = dataset.sources.filter((source) => source.policy === "excluded");
  const linkOnly = dataset.sources.filter((source) => source.status === "link-only" || source.eventCount === 0);

  return (
    <div className="page-shell py-8 md:py-12">
      <div className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-moss">
          <ShieldCheck className="h-3.5 w-3.5" /> Transparent by default
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Where the listings come from.</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft md:text-base">
          Every event links back to the organiser&apos;s own page. This registry records what we collect, how we collect it,
          and what we deliberately leave alone. A public page is not automatically permission to republish its content —
          access rules and terms are checked per source.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-soft">Collected sources</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{collected.length}</p>
          <p className="mt-0.5 text-xs text-ink-soft">{pluralize(dataset.stats.events, "event series")} in the current dataset</p>
        </div>
        <div className="card p-4">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-soft">Dated sessions</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{dataset.stats.occurrences}</p>
          <p className="mt-0.5 text-xs text-ink-soft">Generated from published dates and timetables</p>
        </div>
        <div className="card p-4">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-soft">Deliberately excluded</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{excluded.length}</p>
          <p className="mt-0.5 text-xs text-ink-soft">Platforms whose terms prohibit automated extraction</p>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="border-b border-line p-5 md:p-6">
          <h2 className="font-display text-2xl font-extrabold">Source register</h2>
          <p className="mt-1 text-sm text-ink-soft">What each source is used for, and when it was last checked.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-cream text-[0.68rem] font-bold uppercase tracking-[0.1em] text-ink-soft">
              <tr>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Coverage</th>
                <th className="px-5 py-3">Collection</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Series</th>
                <th className="px-5 py-3 text-right">Checked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {dataset.sources.map((source) => (
                <tr key={source.id} className="align-top transition hover:bg-cream/50">
                  <td className="px-5 py-4">
                    <a href={source.homepage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-ink hover:text-moss">
                      {source.name} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-ink-soft">{source.policyNote}</p>
                  </td>
                  <td className="px-5 py-4 text-xs text-ink-soft">{source.region}<br /><span className="text-ink-soft/75">{source.type}</span></td>
                  <td className="px-5 py-4 text-xs text-ink-soft">{source.method}</td>
                  <td className="px-5 py-4">
                    <span className={`pill ${policyClass(source.policy)}`}>{POLICY_LABEL[source.policy] || source.policy}</span>
                    {source.health === "failed" ? <p className="mt-1 text-[0.68rem] font-bold text-coral">Last refresh failed</p> : null}
                  </td>
                  <td className="px-5 py-4 text-right font-bold">{source.eventCount || "—"}</td>
                  <td className="px-5 py-4 text-right text-xs text-ink-soft">{source.lastSuccess ? relativeTime(source.lastSuccess) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="flex items-center gap-2 font-display text-lg font-extrabold"><CheckCircle2 className="h-4 w-4 text-moss" /> What we collect</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Public event names, dates, times, venue names, published prices, skill levels, booking links and organiser
            names. We store factual metadata and a short excerpt where the source permits it — never attendee lists,
            private group content, images or entire page copies.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="flex items-center gap-2 font-display text-lg font-extrabold"><XCircle className="h-4 w-4 text-coral" /> What we don&apos;t do</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            We do not bypass logins, CAPTCHAs, paywalls or anti-bot protections. Eventbrite and Meetup are not automated
            targets because their terms restrict extraction. Facebook, Instagram and WhatsApp groups are not scraped;
            organisers can submit public details instead.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-[#F0EBDD] p-5 md:p-6">
        <p className="font-display text-xl font-extrabold">See a source we should know about?</p>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Suggest a club, council, venue or public calendar. We review the site&apos;s terms and technical access before
          adding an adapter.
        </p>
        <Link href="/submit" className="btn btn-primary mt-4">Suggest a source <ArrowUpRight className="h-4 w-4" /></Link>
      </div>

      {linkOnly.length ? (
        <p className="mt-4 text-xs leading-relaxed text-ink-soft">
          Some approved sources currently have no upcoming public listings; they remain in the registry so coverage can
          resume when they publish new dates.
        </p>
      ) : null}
    </div>
  );
}
