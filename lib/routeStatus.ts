/**
 * Values computed from flights and verification dates, never stored (docs/ROUTE-MODEL.md §4):
 * next departure, freshness, and the "needs attention" order of the network board (§6.1).
 * Pure functions: the board, the route page and the tests share them.
 */
import { DateTime } from "luxon";

/** Owner decision 2026-10-31 (ROUTE-MODEL §11, question 5): data unchecked for more than 7 days must be re-verified. */
export const FRESH_DAYS = 7;
/** Past this, the data is old (same threshold as the design system's FreshnessBadge). */
export const OLD_DAYS = 14;

/** Calendar day and clock time at an airport: departures are stored in the origin's local time. */
export function localNow(timezone: string, now: Date = new Date()) {
  const local = DateTime.fromJSDate(now, { zone: timezone });
  return { day: local.toISODate()!, time: local.toFormat("HH:mm") };
}

/** "YYYY-MM-DD" of a calendar date stored at UTC midnight. */
export const dayOf = (date: Date) => date.toISOString().slice(0, 10);

/** Has not left yet: a later day, or today at or after the current local time. */
export function isUpcoming(flight: { date: Date; departureTime: string }, local: { day: string; time: string }) {
  const day = dayOf(flight.date);
  return day > local.day || (day === local.day && flight.departureTime >= local.time);
}

export type Freshness =
  | { state: "fresh" | "stale" | "old"; days: number; verifiedAt: Date }
  | { state: "never" }
  | { state: "none" }; // no airline on the route yet

const DAY_MS = 86_400_000;

export function freshnessOf(verifiedAt: Date | null, now: Date = new Date()): Freshness {
  if (!verifiedAt) return { state: "never" };
  const days = Math.max(0, Math.floor((now.getTime() - verifiedAt.getTime()) / DAY_MS));
  return { state: days <= FRESH_DAYS ? "fresh" : days <= OLD_DAYS ? "stale" : "old", days, verifiedAt };
}

/**
 * A route is as fresh as its least recently checked active airline: every airline that flies it
 * must be checked. Suspended or ended airlines don't count.
 */
export function routeFreshness(airlines: { status: string; verifiedAt: Date | null }[], now: Date = new Date()): Freshness {
  const active = airlines.filter((a) => a.status === "ACTIVE");
  if (active.length === 0) return { state: "none" };
  if (active.some((a) => !a.verifiedAt)) return { state: "never" };
  const oldest = active.reduce((min, a) => (a.verifiedAt! < min ? a.verifiedAt! : min), active[0].verifiedAt!);
  return freshnessOf(oldest, now);
}

/**
 * Order of the board: what needs work first (ROUTE-MODEL §6.1).
 * 0 never checked or old, 1 to re-check, 2 no airline yet, 3 fresh, 4 archived. Then tier, then name.
 */
export function attentionRank(route: { status: string; freshness: Freshness }) {
  if (route.status === "ARCHIVED") return 4;
  switch (route.freshness.state) {
    case "never":
    case "old":
      return 0;
    case "stale":
      return 1;
    case "none":
      return 2;
    case "fresh":
      return 3;
  }
}

export function byAttention<T extends { status: string; freshness: Freshness; tier: number; slug: string }>(a: T, b: T) {
  return attentionRank(a) - attentionRank(b) || a.tier - b.tier || a.slug.localeCompare(b.slug);
}
