import { RefreshCw, ExternalLink } from "lucide-react";
export function RefreshListings() {
  return <div className="page-shell flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 text-xs text-ink-soft"><span>Listings refresh only when you request it.</span><a href="https://github.com/Beetro0t/pickle/actions/workflows/refresh-listings.yml" target="_blank" rel="noopener noreferrer" className="btn btn-ghost !py-2" title="Sign in to GitHub, choose Run workflow, then Run workflow. Updated listings publish when it finishes."><RefreshCw className="h-4 w-4" /> Refresh listings <ExternalLink className="h-3 w-3" /></a></div>;
}
