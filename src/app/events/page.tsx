import { Suspense } from "react";
import { getDataset } from "@/lib/data";
import { EventsFeed } from "@/components/eventsfeed";
export default function Page() {
  return <Suspense fallback={<div className="page-shell py-12">Loading sessions…</div>}><EventsFeed dataset={getDataset()} /></Suspense>;
}
