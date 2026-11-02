'use client';

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
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

/** One departure: local times at each end, duration, stops, then number, aircraft and flying days. */
export function DepartureDetail({ flight: f, className }: { flight: FlightPage; className?: string }) {
  const { t } = useTranslation();
  const letters = WEEKDAYS.map((d) => t(`explore.results.daysOfWeek.${d.toLowerCase()}`));
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-card sm:p-6", className)} aria-label={t("explore.detail.localTimes")}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 sm:gap-6">
        <div>
          <p className="text-3xl font-bold tabular-nums sm:text-4xl">{f.departureTime}</p>
          <p className="mt-1 font-semibold">{f.origin.code}</p>
          <p className="text-sm text-muted-foreground">{f.origin.name}</p>
        </div>
        <div className="flex flex-col items-center pt-2 text-center">
          <span className="text-sm font-medium">{formatDuration(f.durationMinutes)}</span>
          <span className="relative my-2 block h-px w-16 bg-border sm:w-28" aria-hidden="true">
            <Plane className="absolute -right-1 top-1/2 size-4 -translate-y-1/2 rotate-45 fill-muted-foreground text-muted-foreground" />
          </span>
          <span className={cn("text-xs font-medium", f.via.length ? "text-warning" : "text-success")}>
            {f.via.length ? t("explore.detail.stopsVia", { cities: f.via.map((v) => v.city).join(", ") }) : t("explore.detail.direct")}
          </span>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums sm:text-4xl">
            {f.arrivalTime}
            {f.arrivalDayOffset > 0 && <sup className="ml-0.5 text-sm text-warning">+1</sup>}
          </p>
          <p className="mt-1 font-semibold">{f.destination.code}</p>
          <p className="text-sm text-muted-foreground">{f.destination.name}</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{t("explore.detail.localTimes")}</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-3">
        <Fact label={t("explore.detail.duration")}>{formatDuration(f.durationMinutes)}</Fact>
        <Fact label={t("explore.detail.flightNumber")}>{f.flightNumber ? formatFlightNumber(f.flightNumber) : "—"}</Fact>
        <Fact label={t("explore.detail.aircraft")}>{f.aircraft ?? "—"}</Fact>
        <Fact label={t("explore.detail.days")} className="col-span-2 sm:col-span-3">
          <DayStrip days={f.days} highlight={weekdayOf(f.date)} letters={letters} label={t("explore.results.flies", { days: formatWeekdays(f.days) })} />
        </Fact>
      </dl>
    </section>
  );
}
