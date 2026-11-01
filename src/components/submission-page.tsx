"use client";
import { useSearchParams } from "next/navigation";
import { SubmitForm, type ReportTarget } from "./submit-form";
export function SubmissionPage({ events }: { events: ReportTarget[] }) {
  const reportId = useSearchParams().get("report");
  const report = events.find((event) => event.id === reportId) || null;
  return <div className="page-shell max-w-3xl py-10"><h1 className="font-display text-4xl font-extrabold">{report ? "Report a correction" : "Submit a session"}</h1><p className="my-4 text-sm text-ink-soft">Prepare a draft below, then review and submit it on GitHub. Submissions are public; include only public organiser information. A GitHub account is required.</p><SubmitForm report={report} /></div>;
}
