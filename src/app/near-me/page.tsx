import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDataset } from "@/lib/data";
import { NearMe } from "@/components/near-me";

export const metadata: Metadata = {
  title: "Pickleball near me",
  description: "Use your approximate location to find pickleball sessions within 25 km across New South Wales.",
};

export default function NearMePage() {
  const dataset = getDataset();

  return (
    <div className="page-shell py-8 md:py-12">
      <Link href="/events" className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft hover:text-moss">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to explore
      </Link>
      <div className="mt-4 max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">Location-first</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Find a game near you.</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Opt in to a one-off location lookup, or browse by suburb. Distances are straight-line estimates — always check
          the venue address before travelling.
        </p>
      </div>
      <div className="mt-6">
        <NearMe localities={dataset.localities.map((locality) => ({ id: locality.id, name: locality.name, label: locality.label }))} />
      </div>
    </div>
  );
}
