export const dynamic = "force-static";
import type { MetadataRoute } from "next";
import { getDataset } from "@/lib/data";
import { SITE_URL } from "@/lib/site";



export default function sitemap(): MetadataRoute.Sitemap {
  const dataset = getDataset();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/events`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/social-play`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/tournaments`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/venues`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/sources`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/submit`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const eventRoutes: MetadataRoute.Sitemap = dataset.events.map((event) => ({
    url: `${SITE_URL}/events/${event.id}`,
    lastModified: event.lastChecked,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const venueRoutes: MetadataRoute.Sitemap = dataset.venues
    .filter((venue) => (venue.eventCount || 0) > 0)
    .map((venue) => ({
      url: `${SITE_URL}/venues/${venue.id}`,
      lastModified: venue.nextEventAt || dataset.generatedAt || undefined,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  return [...staticRoutes, ...eventRoutes, ...venueRoutes];
}
