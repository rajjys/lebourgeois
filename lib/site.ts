/**
 * Single source of truth for brand and canonical URL.
 * The brand is Clerikaa. The site is still served from lebourgeois.cd until
 * clerikaa.com is bought; switching is one env var (NEXT_PUBLIC_SITE_URL)
 * plus 301 redirects (docs/PLAN.md, rebrand track).
 */
export const SITE = {
  name: "Clerikaa",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://lebourgeois.cd").replace(/\/$/, ""),
  description:
    "Horaires et prix indicatifs des vols intérieurs en RDC : compagnies, jours de vol et tarifs vérifiés, route par route.",
} as const;
