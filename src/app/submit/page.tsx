import { Suspense } from "react";
import { SubmissionPage } from "@/components/submission-page";
import { getDataset } from "@/lib/data";
export const metadata = { title: "Submit an event or correction" };
export default function Page() {
  const events = getDataset().events.map(({ id, title, venue, category }) => ({ id, title, venueName: venue.name, category }));
  return <Suspense fallback={<div className="page-shell py-12">Loading…</div>}><SubmissionPage events={events} /></Suspense>;
}
