"use client";
import type { EventCategory } from "@/lib/types";
export type ReportTarget = { id: string; title: string; venueName: string; category: EventCategory };
export function SubmitForm({ report }: { report: ReportTarget | null }) {
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = `${report ? "Correction" : "New session"}: ${data.get("title")}`;
    const body = [report ? `Event: ${report.id}` : "New session submission", `Public source: ${data.get("url")}`, String(data.get("notes"))].join("\n\n");
    window.location.href = `https://github.com/Beetro0t/pickle/issues/new?${new URLSearchParams({ title, body })}`;
  }
  return <form onSubmit={submit} className="card space-y-5 p-6">
    <div><label className="label" htmlFor="title">Event name</label><input className="field" id="title" name="title" required defaultValue={report?.title} maxLength={180} /></div>
    <div><label className="label" htmlFor="url">Public organiser or booking URL</label><input className="field" id="url" name="url" type="url" required maxLength={500} /></div>
    <div><label className="label" htmlFor="notes">Details or correction</label><textarea className="field" id="notes" name="notes" rows={5} required maxLength={4000} /></div>
    <button className="btn btn-primary" type="submit">Review draft on GitHub</button>
  </form>;
}
