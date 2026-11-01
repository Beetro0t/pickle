export const SITE_NAME = "Pickleball Finder";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://beetro0t.github.io/pickle").replace(/\/$/, "");
export const SITE_DESCRIPTION =
  "Find pickleball social sessions, tournaments, leagues and coaching across New South Wales. Real listings from clubs, venues and associations, with direct links to the organiser's booking page.";

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
