import { Weekday } from "../generated/prisma/enums";
import { DateTime } from "luxon";

type PrimitiveDate = string | Date;

const WEEKDAY_TO_LUXON: Record<Weekday, number> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 7,
};

const SEARCH_WINDOW_DAYS = 21;
const FALLBACK_ZONE = "UTC";

export type NextDepartureInput = {
  daysOfWeek: Weekday[] | null | undefined;
  departureTime: string | null | undefined;
  startDate: PrimitiveDate;
  endDate: PrimitiveDate;
  originTimezone?: string | null | undefined;
  referenceDate?: PrimitiveDate;
};

type PatternWithOrigin = {
  daysOfWeek: Weekday[] | null | undefined;
  departureTime: string | null | undefined;
  startDate: PrimitiveDate;
  endDate: PrimitiveDate;
  origin?: { timezone?: string | null } | null;
};

export function computeNextDepartureDate({
  daysOfWeek,
  departureTime,
  startDate,
  endDate,
  originTimezone,
  referenceDate,
}: NextDepartureInput): string | null {
  const parsedTime = parseDepartureTime(departureTime);
  if (!parsedTime) return null;

  const allowedWeekdays = (daysOfWeek ?? [])
    .map((day) => WEEKDAY_TO_LUXON[day])
    .filter((val): val is number => typeof val === "number");
  if (!allowedWeekdays.length) return null;

  const zone = resolveZone(originTimezone);
  const now = toDateTime(referenceDate ?? new Date(), zone);
  const start = toDateTime(startDate, zone).startOf("day");
  const end = toDateTime(endDate, zone).endOf("day");

  if (!start.isValid || !end.isValid || end < start) return null;

  const searchStart = DateTime.max(now.startOf("day"), start);

  for (let offset = 0; offset <= SEARCH_WINDOW_DAYS; offset++) {
    const date = searchStart.plus({ days: offset });
    if (date > end) break;
    if (!allowedWeekdays.includes(date.weekday)) continue;

    const candidate = date.set({
      hour: parsedTime.hour,
      minute: parsedTime.minute,
      second: 0,
      millisecond: 0,
    });
    if (candidate < now) continue;
    if (candidate < start) continue;
    if (candidate > end) return null;

    return candidate.toISO();
  }

  return null;
}

export function withNextDepartureDate<T extends PatternWithOrigin>(
  pattern: T
): T & { nextDepartureDate: string | null } {
  const nextDepartureDate = computeNextDepartureDate({
    daysOfWeek: pattern.daysOfWeek,
    departureTime: pattern.departureTime,
    startDate: pattern.startDate,
    endDate: pattern.endDate,
    originTimezone: pattern.origin?.timezone,
  });

  return { ...pattern, nextDepartureDate };
}

export function withNextDepartureDates<T extends PatternWithOrigin>(
  patterns: T[]
) {
  return patterns.map((pattern) => withNextDepartureDate(pattern));
}

function parseDepartureTime(value: string | null | undefined) {
  if (!value) return null;
  const [hourStr, minuteStr] = value.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return { hour, minute };
}

function toDate(value: PrimitiveDate) {
  return value instanceof Date ? value : new Date(value);
}

function toDateTime(value: PrimitiveDate, zone: string) {
  return DateTime.fromJSDate(toDate(value), { zone });
}

function resolveZone(zone: string | null | undefined) {
  if (!zone) return FALLBACK_ZONE;
  const test = DateTime.now().setZone(zone);
  return test.isValid ? zone : FALLBACK_ZONE;
}

