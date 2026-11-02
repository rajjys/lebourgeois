/**
 * Internal links, built in one place (docs/SEO-AEO-GEO.md §3.1). Since RW-5 every route link
 * and every search leads to the route pages under /vols (docs/ROUTE-MODEL.md §7).
 */
type Place = { code: string; slug: string };

/** The routes hub: the search box, then every route by departure city. */
export const VOLS_HREF = "/vols";

/** /vols/kinshasa-lubumbashi, optionally narrowed to one date. */
export const routeHref = (origin: Place, destination: Place, date?: string | null) =>
  `/vols/${origin.slug}-${destination.slug}${date ? `?date=${date}` : ""}`;

/** /vols/kinshasa-lubumbashi/caa, optionally on one departure (?date=2026-11-02&heure=14:00). */
export const airlineRouteHref = (routeSlug: string, airlineSlug: string, date?: string | null, time?: string | null) =>
  `/vols/${routeSlug}/${airlineSlug}${date ? `?date=${date}${time ? `&heure=${time}` : ""}` : ""}`;

/** Where "help me find this flight" goes, prefilled with the route when we know it. */
export const requestHref = (origin?: string | null, destination?: string | null) => {
  const params = new URLSearchParams();
  if (origin) params.set("from", origin);
  if (destination) params.set("to", destination);
  const query = params.toString();
  return query ? `/request?${query}` : "/request";
};

/** Id of the search form on pages that have one (home, /vols, route pages); the navbar button scrolls to it. */
export const SEARCH_ANCHOR = "recherche";
