'use client';

import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Plane } from "lucide-react";
import { DayStrip } from "@/components/ds/DayStrip";
import { formatDuration, weekdayOf } from "@/lib/flights";
import { formatFlightNumber, formatWeekdays, WEEKDAYS } from "@/lib/format";
import type { FlightPage } from "@/lib/search";
import { cn } from "@/lib/utils/cn-utils";

function Fact({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

/** "Escale à Mbuji-Mayi, Kolwezi", where a city name never breaks at its hyphen ("Mbuji-" / "Mayi"). */
function StopsVia({ cities }: { cities: string[] }) {
  const { t } = useTranslation();
  const [before, after = ""] = t("explore.detail.stopsVia", { cities: "\u0000" }).split("\u0000");
  return (
    <>
      {before}
      {cities.map((city, i) => (
        <Fragment key={city}>
          {i > 0 && ", "}
          <span className="whitespace-nowrap">{city}</span>
        </Fragment>
      ))}
      {after}
    </>
  );
}

/** One departure: local times at each end, duration, stops, then number, aircraft and flying days. */
export function DepartureDetail({ flight: f, className }: { flight: FlightPage; className?: string }) {
  const { t } = useTranslation();
  const letters = WEEKDAYS.map((d) => t(`explore.results.daysOfWeek.${d.toLowerCase()}`));
  return (
    <section className={cn("rounded-2xl border bg-card p-4 shadow-card sm:p-6", className)} aria-label={t("explore.detail.localTimes")}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 sm:gap-6">
        <div>
          <p className="text-[1.75rem] font-bold leading-none tabular-nums sm:text-4xl">{f.departureTime}</p>
          <p className="mt-1.5 text-sm font-semibold">{f.origin.code}</p>
          <p className="text-xs text-muted-foreground sm:text-sm">{f.origin.name}</p>
        </div>
        {/* Same voice as the result cards: duration and stops small; the stop names wrap inside a
            narrow column, so they no longer squeeze the airport names (P-17). */}
        <div className="flex max-w-[7.5rem] flex-col items-center pt-0.5 text-center sm:max-w-[11rem]">
          <span className="text-xs text-muted-foreground sm:text-sm">{formatDuration(f.durationMinutes)}</span>
          <span className="relative my-1.5 block h-px w-14 bg-border sm:my-2 sm:w-28" aria-hidden="true">
            <Plane className="absolute -right-1 top-1/2 size-4 -translate-y-1/2 rotate-45 fill-muted-foreground text-muted-foreground" />
          </span>
          <span className={cn("text-xs font-medium", f.via.length ? "text-warning" : "text-success")}>
            {f.via.length ? <StopsVia cities={f.via.map((v) => v.city)} /> : t("explore.detail.direct")}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[1.75rem] font-bold leading-none tabular-nums sm:text-4xl">
            {f.arrivalTime}
            {f.arrivalDayOffset > 0 && <sup className="ml-0.5 text-sm text-warning">+1</sup>}
          </p>
          <p className="mt-1.5 text-sm font-semibold">{f.destination.code}</p>
          <p className="text-xs text-muted-foreground sm:text-sm">{f.destination.name}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground sm:mt-4">{t("explore.detail.localTimes")}</p>

      <dl className="mt-4 grid grid-cols-3 gap-x-3 gap-y-3 border-t pt-4 sm:mt-6 sm:gap-4 sm:pt-5">
        <Fact label={t("explore.detail.duration")}>{formatDuration(f.durationMinutes)}</Fact>
        <Fact label={t("explore.detail.flightNumber")}>{f.flightNumber ? formatFlightNumber(f.flightNumber) : "—"}</Fact>
        <Fact label={t("explore.detail.aircraft")}>{f.aircraft ?? "—"}</Fact>
        <Fact label={t("explore.detail.days")} className="col-span-3">
          <DayStrip days={f.days} highlight={weekdayOf(f.date)} letters={letters} label={t("explore.results.flies", { days: formatWeekdays(f.days) })} />
        </Fact>
      </dl>
    </section>
  );
}
