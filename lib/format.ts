/**
 * Display rules for data (docs/DESIGN-SYSTEM.md#data-display).
 * French (DRC) formats everywhere; every price is USD.
 */
const LOCALE = "fr-CD";

const price = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});
const shortDate = new Intl.DateTimeFormat(LOCALE, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const relative = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
const list = new Intl.ListFormat("fr", { type: "conjunction" });

const DAY_MS = 86_400_000;

/** 244 → "244 $" (whole dollars; airlines quote whole USD). */
export const formatPrice = (amount: number | string) => price.format(Number(amount));

// Dates are calendar days stored at UTC midnight, so they are formatted in UTC.
/** "mar. 3 nov." */
export const formatDateShort = (d: Date) => shortDate.format(d);
/** "30 oct." */
export const formatDayMonth = (d: Date) => dayMonth.format(d);
/** "mardi 3 novembre 2026" */
export const formatDateLong = (d: Date) => longDate.format(d);

/** Whole days between two instants, never negative. */
export const daysBetween = (from: Date, to: Date) => Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS));

/** "aujourd’hui", "hier", "il y a 10 jours" */
export const formatDaysAgo = (d: Date, now: Date = new Date()) => relative.format(-daysBetween(d, now), "day");

/** "BU1611" → "BU 1611" */
export const formatFlightNumber = (n: string) => n.replace(/^([A-Z0-9]{2})\s*(\d{1,4}[A-Z]?)$/i, "$1 $2").toUpperCase();

export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export type WeekdayCode = (typeof WEEKDAYS)[number];
export const WEEKDAY_LABEL: Record<WeekdayCode, { short: string; long: string }> = {
  MON: { short: "L", long: "lundi" },
  TUE: { short: "M", long: "mardi" },
  WED: { short: "M", long: "mercredi" },
  THU: { short: "J", long: "jeudi" },
  FRI: { short: "V", long: "vendredi" },
  SAT: { short: "S", long: "samedi" },
  SUN: { short: "D", long: "dimanche" },
};

/** ["MON","WED","SAT"] → "lundi, mercredi et samedi" (always in week order). */
export const formatWeekdays = (days: readonly WeekdayCode[]) =>
  days.length === 7 ? "tous les jours" : list.format(WEEKDAYS.filter((d) => days.includes(d)).map((d) => WEEKDAY_LABEL[d].long));
