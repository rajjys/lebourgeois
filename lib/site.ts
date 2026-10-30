/**
 * Single source of truth for brand and canonical URL.
 * Keep "Le Bourgeois" on lebourgeois.cd until the move to the new brand (clerikaa.com).
 */
export const SITE = {
  name: "Le Bourgeois",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://lebourgeois.cd").replace(/\/$/, ""),
  description:
    "Horaires et prix indicatifs des vols intérieurs en RDC : compagnies, jours de vol et tarifs vérifiés, route par route.",
} as const;
