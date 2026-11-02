import { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { sitemapRoutes } from "@/lib/routePages";

// Read from the database, so rebuilt every hour rather than frozen at build time.
export const revalidate = 3600;

/** Fixed pages, then each published route and its published airlines (docs/SEO-AEO-GEO.md §14). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = await sitemapRoutes();
  return [
    { url: SITE.url, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE.url}/vols`, changeFrequency: "daily", priority: 0.9 },
    ...routes.flatMap((r) => [
      { url: `${SITE.url}/vols/${r.slug}`, lastModified: r.lastModified, changeFrequency: "daily" as const, priority: 0.8 },
      ...r.airlines.map((a) => ({ url: `${SITE.url}/vols/${r.slug}/${a}`, lastModified: r.lastModified, changeFrequency: "daily" as const, priority: 0.7 })),
    ]),
    { url: `${SITE.url}/request`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE.url}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
