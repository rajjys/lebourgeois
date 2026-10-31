'use client';

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowRight, Plane } from "lucide-react";
import { DayStrip } from "@/components/ds/DayStrip";
import { PriceTag } from "@/components/ds/PriceTag";
import { formatDuration, weekdayOf } from "@/lib/flights";
import { formatDateShort, formatWeekdays, WEEKDAYS } from "@/lib/format";
import type { Service } from "@/lib/searchResults";
import { cn } from "@/lib/utils/cn-utils";

/** The airline's code in a tile, where other sites put a logo (no logos without the airline's consent). */
export function AirlineTile({ code, className }: { code: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted text-sm font-bold tracking-wide text-foreground", className)}
    >
      {code}
    </span>
  );
}

/** "Direct", "1 escale", or the stop cities when there is room. */
export function useStopsLabel() {
  const { t } = useTranslation();
  return (via: { city: string }[]) =>
    via.length === 0 ? t("explore.results.direct") : via.length === 1 ? t("explore.results.oneStop") : t("explore.results.stops", { count: via.length });
}

/**
 * One search result, laid out like the big comparison sites: airline name on top, times in the
 * middle, price and action on the right (at the bottom on phones). Number and aircraft are on the
 * flight's own page. The day strip shows the weekdays it flies; the date is repeated only when
 * the visitor did not pick one.
 */
export function ResultCard({
  service,
  origin,
  destination,
  dateChosen,
}: {
  service: Service;
  origin: string;
  destination: string;
  dateChosen: boolean;
}) {
  const { t } = useTranslation();
  const stopsLabel = useStopsLabel();
  const s = service;
  const letters = WEEKDAYS.map((d) => t(`explore.results.daysOfWeek.${d.toLowerCase()}`));
  const nextDate = new Date(`${s.next.date}T00:00:00Z`);
  const href = `/explore/${s.next.flightId}`;

  return (
    <article className="group relative overflow-hidden rounded-2xl border bg-card shadow-card transition-shadow hover:border-primary/40 hover:shadow-hover">
      <div className="grid sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="min-w-0 p-4 sm:p-5">
          <p className="mb-3 truncate text-sm font-semibold text-foreground">{s.airline.name}</p>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:gap-5">
            <AirlineTile code={s.airline.code} />
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-4">
              <div className="text-left">
                <p className="text-xl font-bold tabular-nums leading-none sm:text-2xl">{s.departureTime}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{origin}</p>
              </div>
              <div className="min-w-0 text-center">
                <p className="text-xs text-muted-foreground">{formatDuration(s.durationMinutes)}</p>
                <div className="relative my-1 h-px bg-border" aria-hidden="true">
                  {s.via.map((v, i) => (
                    <span
                      key={v.code}
                      className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-muted-foreground"
                      style={{ left: `${((i + 1) / (s.via.length + 1)) * 100}%` }}
                    />
                  ))}
                  <Plane className="absolute -right-1 top-1/2 size-3.5 -translate-y-1/2 rotate-45 fill-muted-foreground text-muted-foreground" />
                </div>
                <p className={cn("truncate text-xs font-medium", s.via.length ? "text-warning" : "text-success")} title={s.via.length ? t("explore.results.via", { cities: s.via.map((v) => v.city).join(", ") }) : undefined}>
                  {stopsLabel(s.via)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold tabular-nums leading-none sm:text-2xl">
                  {s.arrivalTime}
                  {s.arrivalDayOffset > 0 && (
                    <sup className="ml-0.5 text-xs font-semibold text-warning" title={t("explore.results.nextDay")}>
                      +1
                    </sup>
                  )}
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{destination}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 sm:pl-16">
            <DayStrip
              days={s.days}
              highlight={weekdayOf(s.next.date)}
              letters={letters}
              label={t("explore.results.flies", { days: formatWeekdays(s.days) })}
            />
            {!dateChosen && (
              <span className="text-xs text-muted-foreground">
                {t("explore.results.next", { date: formatDateShort(nextDate) })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3 sm:flex-col sm:items-stretch sm:justify-center sm:border-l sm:border-t-0 sm:px-5 sm:py-5">
          <div className="sm:text-right">
            {s.price ? (
              <PriceTag
                amount={s.price.amount}
                observedAt={new Date(s.price.observedAt)}
                kind={s.price.kind === "FROM_PRICE" ? "from" : "quote"}
                labels={{ from: t("explore.results.from"), observed: t("explore.results.seenOn") }}
                className="sm:items-end"
              />
            ) : (
              <span className="text-sm text-muted-foreground">{t("explore.results.noPrice")}</span>
            )}
          </div>
          <Link
            href={href}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 after:absolute after:inset-0 after:content-['']"
          >
            {t("explore.results.view")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
