/**
 * Date ranges for the analytics dashboard. Days are Kinshasa days (UTC+1, no daylight saving);
 * a range includes both ends; the comparison period is the same number of days just before.
 */
import { DateTime } from "luxon";

export const ZONE = "Africa/Kinshasa";
export const PERIODS = { today: "Aujourd'hui", "7j": "7 derniers jours", "30j": "30 derniers jours", "90j": "90 derniers jours", dates: "Dates choisies" } as const;
export type PeriodKey = keyof typeof PERIODS;

export type Range = { from: string; to: string; start: Date; end: Date };
export type Period = Range & { key: PeriodKey; days: number; previous: Range };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const startOf = (day: string) => DateTime.fromISO(day, { zone: ZONE }).startOf("day");
const plus = (day: string, n: number) => startOf(day).plus({ days: n }).toISODate()!;
const range = (from: string, to: string): Range => ({ from, to, start: startOf(from).toJSDate(), end: startOf(plus(to, 1)).toJSDate() });

/** The period asked for in the address (?periode=30j, or ?periode=dates&du=…&au=…); 7 days otherwise. */
export function resolvePeriod(query: { periode?: string; du?: string; au?: string }, today: string): Period {
  let key: PeriodKey = query.periode && query.periode in PERIODS ? (query.periode as PeriodKey) : "7j";
  let from: string;
  let to = today;
  if (key === "dates" && query.du && query.au && DAY.test(query.du) && DAY.test(query.au) && startOf(query.du).isValid && startOf(query.au).isValid) {
    [from, to] = query.du <= query.au ? [query.du, query.au] : [query.au, query.du];
    // At most a year at a time.
    if (startOf(to).diff(startOf(from), "days").days > 365) from = plus(to, -365);
  } else {
    if (key === "dates") key = "7j";
    const days = { today: 1, "7j": 7, "30j": 30, "90j": 90 }[key as Exclude<PeriodKey, "dates">];
    from = plus(today, -(days - 1));
  }
  const days = Math.round(startOf(to).diff(startOf(from), "days").days) + 1;
  return { key, days, ...range(from, to), previous: range(plus(from, -days), plus(from, -1)) };
}

/** Every day of a range, for charts that must show the days without data too. */
export function daysOf(r: { from: string; to: string }) {
  const out: string[] = [];
  for (let d = r.from; d <= r.to; d = plus(d, 1)) out.push(d);
  return out;
}
