import { Suspense } from "react";
import { getDataset } from "@/lib/data";
import { HomeFeed } from "@/components/homefeed";
export default function Page() {
  return <Suspense fallback={<div className="page-shell py-12">Loading sessions…</div>}><HomeFeed dataset={getDataset()} /></Suspense>;
}
