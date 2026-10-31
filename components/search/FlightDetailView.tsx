'use client';

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ExternalLink, Info, LifeBuoy, Plane } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DayStrip } from "@/components/ds/DayStrip";
import { PriceTag } from "@/components/ds/PriceTag";
import { RouteTitle } from "@/components/ds/RouteTitle";
import { AirportStatusAlert } from "@/components/search/AirportStatusNotice";
import { AirlineTile } from "@/components/search/ResultCard";
import { formatDuration, weekdayOf } from "@/lib/flights";
import { formatDateLong, formatDateShort, formatDayMonthYear, formatFlightNumber, formatWeekdays, WEEKDAYS } from "@/lib/format";
import { requestHref } from "@/lib/links";
import type { FlightPage } from "@/lib/search";
import { cn } from "@/lib/utils/cn-utils";

const day = (d: string) => new Date(`${d}T00:00:00Z`);
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

function Fact({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

/** The flight's own page: everything the result card leaves out. */
export function FlightDetailView({ flight: f }: { flight: FlightPage }) {
  const { t } = useTranslation();
  const letters = WEEKDAYS.map((d) => t(`explore.results.daysOfWeek.${d.toLowerCase()}`));
  const searchHref = `/explore?from=${f.origin.code}&to=${f.destination.code}`;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link href={searchHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("explore.detail.back")}
      </Link>

      <header className="mt-4 space-y-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AirlineTile code={f.airline.code} className="size-8 rounded-lg text-xs" />
          {f.airline.name}
          <span className="font-normal text-muted-foreground">
            · {f.flightNumber ? t("explore.detail.flight", { number: formatFlightNumber(f.flightNumber) }) : t("explore.detail.noNumber")}
          </span>
        </p>
        <RouteTitle origin={f.origin.city} destination={f.destination.city} className="text-3xl sm:text-4xl" />
        <p className="text-lg text-neutral-700 first-letter:uppercase">{formatDateLong(day(f.date))}</p>
      </header>

      <div className="mt-6 space-y-3">
        {[f.origin, f.destination].map((a) => (
          <AirportStatusAlert key={a.code} airport={a} />
        ))}
        {f.departed && (
          <Alert variant="info">
            <Info className="size-4" aria-hidden="true" />
            <AlertDescription>{t("explore.detail.departed")}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5 shadow-card sm:p-6" aria-label={t("explore.detail.localTimes")}>
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
                <DayStrip
                  days={f.days}
                  highlight={weekdayOf(f.date)}
                  letters={letters}
                  label={t("explore.results.flies", { days: formatWeekdays(f.days) })}
                />
              </Fact>
            </dl>
          </section>

          {f.otherDates.length > 0 && (
            <section aria-labelledby="other-dates">
              <h2 id="other-dates" className="text-base font-semibold">
                {t("explore.detail.otherDates")}
              </h2>
              <p className="text-sm text-muted-foreground">{t("explore.detail.daysHint")}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {f.otherDates.map((o) => (
                  <li key={o.id}>
                    <Link href={`/explore/${o.id}`} className="inline-flex rounded-full border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:text-link">
                      {formatDateShort(day(o.date))}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {f.note && (
            <section aria-labelledby="airline-note" className="rounded-2xl bg-muted p-5">
              <h2 id="airline-note" className="text-base font-semibold">
                {t("explore.detail.airlineNote")}
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">{f.note}</p>
            </section>
          )}

          {f.verifiedAt && (
            <p className="text-sm text-muted-foreground">
              {t("explore.detail.verified", { date: formatDayMonthYear(new Date(f.verifiedAt)) })}
              {f.sourceUrl && (
                <>
                  {" · "}
                  <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-link underline">
                    {t("explore.detail.source")} : {hostOf(f.sourceUrl)}
                  </a>
                </>
              )}
            </p>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="text-sm font-medium text-muted-foreground">{t("explore.detail.price")}</h2>
            <div className="mt-2">
              {f.price ? (
                <>
                  <PriceTag
                    amount={f.price.amount}
                    observedAt={new Date(f.price.observedAt)}
                    kind={f.price.kind === "FROM_PRICE" ? "from" : "quote"}
                    size="lg"
                    labels={{ from: t("explore.results.from"), observed: t("explore.results.seenOn") }}
                  />
                  {(f.price.fareName || f.price.tripType === "ROUND_TRIP") && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[f.price.fareName, f.price.tripType === "ROUND_TRIP" ? t("explore.detail.roundTrip") : null].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {f.price.sourceUrl && (
                    <a href={f.price.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-link underline">
                      {t("explore.detail.priceSource")} : {hostOf(f.price.sourceUrl)}
                    </a>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("explore.detail.noPrice")}</p>
              )}
            </div>
            {f.bookingUrl && (
              <>
                <Button asChild className="mt-5 w-full">
                  <a href={f.bookingUrl} target="_blank" rel="noopener noreferrer">
                    {t("explore.detail.book", { site: hostOf(f.bookingUrl) })}
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">{t("explore.detail.bookHint")}</p>
              </>
            )}
          </div>

          <div className="rounded-2xl border p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <LifeBuoy className="size-4 text-brand" aria-hidden="true" />
              {t("explore.detail.helpTitle")}
            </h2>
            <p className="mt-2 text-sm text-neutral-700">{t("explore.detail.helpBody")}</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={requestHref(f.origin.code, f.destination.code)}>{t("explore.detail.helpCta")}</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">{t("explore.detail.disclaimer")}</p>
        </aside>
      </div>
    </div>
  );
}
