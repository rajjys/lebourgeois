'use client';

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DayStrip } from "@/components/ds/DayStrip";
import { PriceTag } from "@/components/ds/PriceTag";
import { RouteTitle } from "@/components/ds/RouteTitle";
import { TYPE } from "@/components/ds/typography";
import { AirportStatusAlert } from "@/components/search/AirportStatusNotice";
import { BookingRequest } from "@/components/search/BookingRequest";
import { AirlineTile, useStopsLabel } from "@/components/search/ResultCard";
import { Breadcrumbs } from "@/components/vols/Breadcrumbs";
import { DepartureDetail } from "@/components/vols/DepartureDetail";
import { PageFacts } from "@/components/vols/PageFacts";
import { formatDuration } from "@/lib/flights";
import { airlineRouteHref, requestHref, VOLS_HREF } from "@/lib/links";
import { formatDateLong, formatDateShort, formatDayMonth, formatFlightNumber, formatPrice, formatWeekdays, shortAirlineName as shortName, WEEKDAYS } from "@/lib/format";
import type { AirlinePage } from "@/lib/routePages";
import { cn } from "@/lib/utils/cn-utils";

const day = (d: string) => new Date(`${d}T00:00:00Z`);
const DATE_CHIPS = 14;

const chip = (selected: boolean) =>
  cn(
    "inline-flex whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium tabular-nums transition-colors",
    selected ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary hover:text-link",
  );

/**
 * A row of chips (times, dates). Phones: one line that swipes, instead of up to five lines of dates
 * (P-17); wider screens: wrapped. "relative" keeps any sr-only text inside the scroller.
 */
const chipRow =
  "relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden [&>li]:shrink-0";

/** Brings the selected chip into view inside its row, without scrolling the page. */
function useCenterSelected(key: string | undefined) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const row = ref.current;
    const current = row?.querySelector<HTMLElement>("[aria-current]");
    if (!row || !current || row.scrollWidth <= row.clientWidth) return;
    row.scrollLeft = current.offsetLeft - (row.clientWidth - current.offsetWidth) / 2;
  }, [key]);
  return ref;
}

/**
 * One airline on one route (docs/ROUTE-MODEL.md §7): its days and times, the next departures,
 * one departure in full with the booking request, and every validated price with its date.
 */
export function AirlinePageView({ data }: { data: AirlinePage }) {
  const { t } = useTranslation();
  const stopsLabel = useStopsLabel();
  const { airline, origin, destination, departure: f } = data;
  const name = shortName(airline.name);
  const letters = WEEKDAYS.map((d) => t(`explore.results.daysOfWeek.${d.toLowerCase()}`));
  const routeLink = `/vols/${data.routeSlug}`;

  const dates = [...new Set(data.departures.map((d) => d.date))].slice(0, DATE_CHIPS);
  const timesRow = useCenterSelected(f?.id);
  const datesRow = useCenterSelected(f?.date);
  const latest = data.fares[0];
  const answer = data.departures.length
    ? [
        t("vols.airline.answer", { airline: name, days: formatWeekdays(data.days) }),
        t("vols.route.flights", { count: data.flightsThisWeek }),
        latest && t("vols.route.from", { price: formatPrice(latest.amount), date: formatDayMonth(new Date(latest.observedAt)) }),
      ]
        .filter(Boolean)
        .join(" · ")
    : t("vols.airline.answerNone", { airline: name });

  return (
    // Bottom padding on phones: the booking bar is fixed there.
    <div className={cn("container mx-auto max-w-5xl space-y-6 px-4 pt-4 sm:space-y-8 sm:px-6 sm:pt-6 lg:px-8 lg:pb-16", f ? "pb-28" : "pb-16")}>
      <Breadcrumbs
        items={[
          { label: t("vols.breadcrumb.home"), href: "/" },
          { label: t("vols.breadcrumb.vols"), href: VOLS_HREF },
          { label: `${origin.city} – ${destination.city}`, href: routeLink },
          { label: name, href: `${routeLink}/${airline.slug}` },
        ]}
      />

      <header className="space-y-2 sm:space-y-3">
        <p className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <AirlineTile code={airline.code} logo={airline.logo} className="h-9 w-[4.5rem] rounded-lg text-xs sm:h-10 sm:w-24" />
          {airline.name}
        </p>
        <h1 className={cn(TYPE.title, "flex flex-wrap items-baseline gap-x-2")}>
          <span>{t("vols.airline.h1", { airline: name })}</span>
          <RouteTitle as="span" origin={origin.city} destination={destination.city} />
        </h1>
        <p className={TYPE.lead}>{answer}</p>
        <Link href={routeLink} className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("vols.airline.compare")}
        </Link>
      </header>

      {/* empty:hidden: with no alert, the empty block must not add a gap of its own. */}
      <div className="space-y-3 empty:hidden">
        {[origin, destination].map((a) => (
          <AirportStatusAlert key={a.code} airport={a} />
        ))}
        {(airline.status !== "OPERATING" || data.routeStatus !== "ACTIVE") && (
          <Alert variant="warning">
            <Info className="size-4" aria-hidden="true" />
            <AlertDescription>
              {airline.status !== "OPERATING"
                ? [t("vols.route.airlineSuspended", { airline: name }), airline.statusNote].filter(Boolean).join(" ")
                : t(data.routeStatus === "SUSPENDED" ? "vols.route.suspended" : "vols.route.ended", { airline: name })}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className={cn("grid gap-6 sm:gap-8 lg:items-start", f && "lg:grid-cols-[minmax(0,1fr)_21rem]")}>
        <div className="min-w-0 space-y-6 sm:space-y-8">
          <section aria-labelledby="departures-title" className="space-y-3 sm:space-y-4">
            <h2 id="departures-title" className={TYPE.section}>
              {f ? t("vols.airline.departure", { date: formatDateLong(day(f.date)) }) : t("vols.airline.departures")}
            </h2>
            {f ? (
              <>
                {data.sameDay.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{t("vols.airline.sameDay")}</p>
                    <ul ref={timesRow} className={chipRow}>
                      {data.sameDay.map((d) => (
                        <li key={d.id}>
                          <Link
                            href={airlineRouteHref(data.routeSlug, airline.slug, f.date, d.time)}
                            scroll={false}
                            aria-current={d.id === f.id ? "true" : undefined}
                            className={chip(d.id === f.id)}
                          >
                            {d.time}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <DepartureDetail flight={f} />
                {f.departed && (
                  <Alert variant="info">
                    <Info className="size-4" aria-hidden="true" />
                    <AlertDescription>{t("explore.detail.departed")}</AlertDescription>
                  </Alert>
                )}
                {dates.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{t("vols.airline.moreDates")}</p>
                    <ul ref={datesRow} className={chipRow}>
                      {dates.map((d) => (
                        <li key={d}>
                          <Link
                            href={airlineRouteHref(data.routeSlug, airline.slug, d)}
                            scroll={false}
                            aria-current={d === f.date ? "date" : undefined}
                            className={chip(d === f.date)}
                          >
                            {formatDateShort(day(d))}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed p-5 text-center sm:p-6">
                <p className="text-muted-foreground">{t("vols.airline.noDeparture")}</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href={requestHref(origin.code, destination.code)}>{t("vols.route.helpCta")}</Link>
                </Button>
              </div>
            )}
          </section>

          {data.services.length > 0 && (
            <section aria-labelledby="services-title" className="space-y-3">
              <h2 id="services-title" className={TYPE.section}>
                {t("vols.airline.services")}
              </h2>
              <ul className="divide-y rounded-2xl border bg-card">
                {data.services.map((s) => (
                  // Same shape on every row (P-17): times and days on one line, then the facts. The days
                  // used to jump below or beside the times depending on how long the facts were.
                  <li key={s.key} className="space-y-1.5 p-3.5 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <p className="text-base font-bold tabular-nums sm:text-lg">
                        {s.departureTime} – {s.arrivalTime}
                        {s.arrivalDayOffset > 0 && <sup className="ml-0.5 text-xs text-warning">+1</sup>}
                      </p>
                      <DayStrip days={s.days} letters={letters} label={t("explore.results.flies", { days: formatWeekdays(s.days) })} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[formatDuration(s.durationMinutes), stopsLabel(s.via), s.flightNumber && t("vols.airline.flightNo", { number: formatFlightNumber(s.flightNumber) })]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.note && (
            <section aria-labelledby="note-title" className="rounded-2xl bg-muted p-4 sm:p-5">
              <h2 id="note-title" className="font-semibold">
                {t("vols.airline.note")}
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">{data.note}</p>
            </section>
          )}

          <section aria-labelledby="prices-title" className="space-y-3">
            <h2 id="prices-title" className={TYPE.section}>
              {t("vols.airline.prices")}
            </h2>
            {data.fares.length ? (
              <ul className="divide-y rounded-2xl border bg-card">
                {data.fares.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 p-3.5 sm:p-5">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-medium first-letter:uppercase">
                        {[p.fareName, t(p.tripType === "ROUND_TRIP" ? "vols.airline.roundTrip" : "vols.airline.oneWay")].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {[t(`vols.airline.fareKind.${p.kind}`), p.travelDate && t("vols.airline.travel", { date: formatDateShort(day(p.travelDate)) })].filter(Boolean).join(" · ")}
                        {p.sourceUrl && (
                          <>
                            {" · "}
                            <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-link underline">
                              {p.sourceHost ?? t("vols.airline.source")}
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                    <PriceTag
                      amount={p.amount}
                      observedAt={new Date(p.observedAt)}
                      kind={p.kind === "FROM_PRICE" ? "from" : "quote"}
                      labels={{ from: t("explore.results.from"), observed: t("explore.results.seenOn") }}
                      className="sm:items-end"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("vols.airline.noPrices")}</p>
            )}
          </section>
        </div>

        {f && (
          <aside className="lg:sticky lg:top-20">
            <BookingRequest flight={f} />
          </aside>
        )}
      </div>

      <PageFacts
        updatedAt={data.updatedAt}
        verifiedAt={data.verifiedAt}
        sources={data.verifiedSource ? [data.verifiedSource] : []}
        report={{
          label: [`${origin.city} – ${destination.city} · ${name}`, f && formatDateLong(day(f.date)), f?.departureTime].filter(Boolean).join(", "),
          date: f?.date,
        }}
      />
    </div>
  );
}
