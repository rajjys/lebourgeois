/**
 * Priority city pairs (docs/ROUTE-MODEL.md §8, confirmed by the owner 2026-10-31), both directions.
 * The seed creates them as draft routes; the legacy clean-up never removes them.
 * Tier 3 for the two routes kept for closed airports: there is no schedule to maintain.
 */
export const PRIORITY_ROUTES: { tier: 1 | 2 | 3; pairs: [string, string][] }[] = [
  {
    tier: 1,
    pairs: [
      ["FIH", "FBM"], ["FIH", "MJM"], ["FIH", "FKI"], ["FIH", "KWZ"], ["FIH", "KGA"],
      ["FIH", "MDK"], ["KWZ", "FBM"], ["FIH", "FMI"], ["FIH", "KND"],
    ],
  },
  { tier: 2, pairs: [["FBM", "MJM"], ["FBM", "FMI"], ["KND", "FMI"], ["FIH", "MNB"], ["FIH", "GMA"], ["FKI", "KND"]] },
  { tier: 3, pairs: [["FIH", "GOM"], ["BUX", "BNC"]] },
];

/** Every priority route as "FROM-TO", in both directions. */
export const PRIORITY_ROUTE_KEYS = new Set(
  PRIORITY_ROUTES.flatMap(({ pairs }) => pairs.flatMap(([a, b]) => [`${a}-${b}`, `${b}-${a}`])),
);
