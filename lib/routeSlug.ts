/**
 * Route addresses (docs/ROUTE-MODEL.md §7): /vols/{origin slug}-{destination slug}.
 * Airport slugs can contain hyphens ("mbuji-mayi"), so a route slug is split by trying each
 * hyphen until both halves are known airports. Pure; shared by pages, redirects and tests.
 */
export function splitRouteSlug(slug: string, airportSlugs: ReadonlySet<string>): [string, string] | null {
  for (let i = slug.indexOf("-"); i > 0; i = slug.indexOf("-", i + 1)) {
    const origin = slug.slice(0, i);
    const destination = slug.slice(i + 1);
    if (origin !== destination && airportSlugs.has(origin) && airportSlugs.has(destination)) return [origin, destination];
  }
  return null;
}

/** A calendar date in a URL (?date=2026-11-03), or null when absent or malformed. */
export const dateParam = (value: string | string[] | undefined) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : null;

/** A departure time in a URL (?heure=14:00), or null. */
export const timeParam = (value: string | string[] | undefined) =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
