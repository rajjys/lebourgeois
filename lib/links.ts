/**
 * Internal links to routes, built in one place. Today they open the search;
 * RW-5 points them at /vols/{origin}-{destination} (docs/SEO-AEO-GEO.md §3).
 */
type Place = { code: string; slug: string };

export const routeHref = (origin: Place, destination: Place) => `/explore?from=${origin.code}&to=${destination.code}`;

/** Where "help me find this flight" goes, prefilled with the route when we know it. */
export const requestHref = (origin?: string | null, destination?: string | null) => {
  const params = new URLSearchParams();
  if (origin) params.set("from", origin);
  if (destination) params.set("to", destination);
  const query = params.toString();
  return query ? `/request?${query}` : "/request";
};

/** Id of the search form on pages that have one (home hero, /explore); the navbar button scrolls to it. */
export const SEARCH_ANCHOR = "recherche";
