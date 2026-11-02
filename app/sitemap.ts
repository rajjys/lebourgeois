import { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { sitemapRoutes } from "@/lib/routePages";

// Read from the database, so rebuilt every hour rather than frozen at build time.
export const revalidate = 3600;

/**
 * Fixed pages, then each published route and its published airlines (docs/SEO-AEO-GEO.md §7, §14).
 * `lastmod` is the date the data last changed, never the build date. The home, /vols and /about show
 * route data, so they take the latest route change; the contact and request forms have no data date.
 * No `priority` or `changefreq`: Google ignores both (F-3).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = await sitemapRoutes();
  const latest = routes
    .map((r) => r.lastModified)
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  return [
    { url: SITE.url, lastModified: latest },
    { url: `${SITE.url}/vols`, lastModified: latest },
    ...routes.flatMap((r) => [
      { url: `${SITE.url}/vols/${r.slug}`, lastModified: r.lastModified },
      ...r.airlines.map((a) => ({ url: `${SITE.url}/vols/${r.slug}/${a}`, lastModified: r.lastModified })),
    ]),
    { url: `${SITE.url}/about`, lastModified: latest },
    { url: `${SITE.url}/contact` },
    { url: `${SITE.url}/request` },
  ];
}
