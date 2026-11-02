'use client';

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, ArrowRight, ChevronRight, Info, LifeBuoy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DayStrip } from "@/components/ds/DayStrip";
import { PriceTag } from "@/components/ds/PriceTag";
import { RouteTitle } from "@/components/ds/RouteTitle";
import { TYPE } from "@/components/ds/typography";
import { AirportStatusAlert } from "@/components/search/AirportStatusNotice";
import { AirlineTile, ResultCard } from "@/components/search/ResultCard";
import { SortTabs } from "@/components/search/SortTabs";
import { Breadcrumbs } from "@/components/vols/Breadcrumbs";
import { PageFacts } from "@/components/vols/PageFacts";
import { RouteSearch } from "@/components/vols/RouteSearch";
import { sortServices, type SortKey } from "@/lib/searchResults";
import { airlineRouteHref, requestHref, VOLS_HREF } from "@/lib/links";
import { formatDateLong, formatDayMonth, formatPrice, formatWeekdays, shortAirlineName as shortName, WEEKDAYS } from "@/lib/format";
import type { RoutePage } from "@/lib/routePages";
import { cn } from "@/lib/utils/cn-utils";

const day = (d: string) => new Date(`${d}T00:00:00Z`);

/** UTC offset of a zone, in hours, on a given day. */
const offset = (zone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(new Date());
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  return Number(name.replace("GMT", "") || 0);
};

/**
 * The route page (docs/ROUTE-MODEL.md §7), in the owner's order (2026-11-02): the answer, the search
 * box (this page is also the search result), each airline, the departures, the return trip, the route
 * itself, and last the dates and sources.
 * Rendered on the server with its data, so every fact is in the HTML.
 */
export function RoutePageView({ data }: { data: RoutePage }) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<SortKey>("best");
  const { origin, destination } = data;
  const letters = WEEKDAYS.map((d) => t(`explore.results.daysOfWeek.${d.toLowerCase()}`));

  const flying = data.airlines.filter((a) => a.flightsThisWeek > 0 || a.next);
  const names = flying.map((a) => shortName(a.name));
  const flightsThisWeek = data.airlines.reduce((n, a) => n + a.flightsThisWeek, 0);
  const cheapest = data.airlines.map((a) => a.price).filter((p) => !!p).sort((a, b) => a!.amount - b!.amount)[0] ?? null;
  const answer = flying.length
    ? [
        t("vols.route.airlines", { count: flying.length, names: names.join(", ") }),
        t("vols.route.flights", { count: flightsThisWeek }),
        cheapest && t("vols.route.from", { price: formatPrice(cheapest.amount), date: formatDayMonth(new Date(cheapest.observedAt)) }),
      ]
        .filter(Boolean)
        .join(" · ")
    : t("vols.route.none");

  const { dated, results } = data;
  const ahead = offset(destination.timezone) - offset(origin.timezone);

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 pb-16 pt-4 sm:space-y-8 sm:px-6 sm:pt-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: t("vols.breadcrumb.home"), href: "/" },
          { label: t("vols.breadcrumb.vols"), href: VOLS_HREF },
          { label: `${origin.city} – ${destination.city}`, href: `/vols/${data.slug}` },
        ]}
      />

      <header className="space-y-2 sm:space-y-3">
        <h1 className={cn(TYPE.title, "flex flex-wrap items-baseline gap-x-2")}>
          <span>{t("vols.route.h1")}</span>
          <RouteTitle as="span" origin={origin.city} destination={destination.city} />
        </h1>
        <p className={TYPE.lead}>{answer}</p>
      </header>

      {/* empty:hidden: with no alert, the empty block must not add a gap of its own. */}
      <div className="space-y-3 empty:hidden">
        {[origin, destination].map((a) => (
          <AirportStatusAlert key={a.code} airport={a} />
        ))}
        {data.airlines
          .filter((a) => a.routeStatus !== "ACTIVE" || a.airlineStatus !== "OPERATING")
          .map((a) => (
            <Alert key={a.code} variant="warning">
              <Info className="size-4" aria-hidden="true" />
              <AlertDescription>
                {a.airlineStatus !== "OPERATING"
                  ? t("vols.route.airlineSuspended", { airline: shortName(a.name) })
                  : t(a.routeStatus === "SUSPENDED" ? "vols.route.suspended" : "vols.route.ended", { airline: shortName(a.name) })}
              </AlertDescription>
            </Alert>
          ))}
      </div>

      <RouteSearch
        initialFrom={origin.code}
        initialTo={destination.code}
        initialDate={data.date}
        today={data.today}
        flightDates={data.flightDates}
      />

      {data.airlines.length > 0 && (
        // Before the departures (owner, 2026-11-02): travellers here pick an airline more than an hour,
        // and comparing airlines is what the site is for.
        <section aria-labelledby="airlines-title" className="space-y-3">
          <h2 id="airlines-title" className={TYPE.section}>
            {t("vols.route.byAirline")}
          </h2>
          <ul className="space-y-3">
            {data.airlines.map((a) => (
              <li key={a.code}>
                {/* Phones (P-17): name and days beside the logo, then one line with the flights this
                    week, the price and a chevron; "Tout sur …" from 640px. About 150px instead of 230. */}
                <Link
                  href={airlineRouteHref(data.slug, a.slug, a.next?.date)}
                  className="group flex flex-wrap items-center gap-x-3 gap-y-3 rounded-2xl border bg-card p-3.5 transition-colors hover:border-primary sm:flex-nowrap sm:gap-x-5 sm:p-5"
                >
                  <AirlineTile code={a.code} logo={a.logo} />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="flex flex-wrap items-center gap-2 font-semibold leading-snug">
                      {a.name}
                      {a.routeStatus !== "ACTIVE" && <Badge variant="warning">{t(`vols.route.badge.${a.routeStatus}`)}</Badge>}
                    </p>
                    {a.days.length > 0 && (
                      <DayStrip days={a.days} letters={letters} label={t("explore.results.flies", { days: formatWeekdays(a.days) })} />
                    )}
                    {/* Wider screens: departure times and the count. Phones show the count on the line
                        below, never the times, so cards keep one height (owner, 2026-11-02). */}
                    <p className="hidden text-sm text-muted-foreground sm:block">
                      {a.times.length > 0 && (
                        <>
                          {t("vols.route.times", { count: a.times.length, times: a.times.join(", ") })}
                          {" · "}
                        </>
                      )}
                      {t("vols.route.flights", { count: a.flightsThisWeek })}
                    </p>
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 border-t pt-3 sm:w-auto sm:flex-col sm:items-end sm:gap-1.5 sm:border-0 sm:pt-0">
                    <span className="text-sm text-muted-foreground sm:hidden">{t("vols.route.flights", { count: a.flightsThisWeek })}</span>
                    <span className="flex items-center gap-1 sm:contents">
                      {a.price ? (
                        <PriceTag
                          amount={a.price.amount}
                          observedAt={new Date(a.price.observedAt)}
                          kind={a.price.kind === "FROM_PRICE" ? "from" : "quote"}
                          labels={{ from: t("explore.results.from"), observed: t("explore.results.seenOn") }}
                          className="items-end text-right"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">{t("vols.route.noPriceYet")}</span>
                      )}
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground sm:hidden" aria-hidden="true" />
                    </span>
                    <span className="hidden items-center gap-1 text-sm font-medium text-link group-hover:underline sm:inline-flex">
                      {t("vols.route.seeAirline", { airline: shortName(a.name) })}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="results-title" className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="results-title" className={TYPE.section}>
            {t("vols.route.results")}
          </h2>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {dated ? t("explore.results.onDate", { date: formatDateLong(day(data.date!)) }) : t("explore.results.window")}
          </p>
        </div>
        {data.date && !dated && <p className="text-sm text-muted-foreground">{t("vols.route.otherDate")}</p>}
        {results.length > 0 ? (
          <>
            <SortTabs services={results} value={sort} onChange={setSort} dateChosen={dated} />
            <ul className="space-y-3">
              {sortServices(results, sort).map((s) => (
                <li key={s.key}>
                  <ResultCard service={s} origin={origin.code} destination={destination.code} routeSlug={data.slug} dateChosen={dated} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed p-5 text-center sm:p-6">
            <p className="text-muted-foreground">{t("vols.route.noFlightsBody")}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={requestHref(origin.code, destination.code)}>{t("vols.route.helpCta")}</Link>
            </Button>
          </div>
        )}
      </section>

      {data.reverse?.linked && (
        <Link href={`/vols/${data.reverse.slug}`} className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary sm:p-5">
          <span className="flex items-center gap-3">
            <ArrowLeftRight className="size-5 text-brand" aria-hidden="true" />
            <span>
              <span className="block font-semibold">{t("vols.route.return", { from: destination.city, to: origin.city })}</span>
              <span className="text-sm text-muted-foreground">
                {[data.reverse.airlines.join(", "), t("vols.route.flights", { count: data.reverse.flightsThisWeek })].filter(Boolean).join(" · ")}
              </span>
            </span>
          </span>
          <ArrowRight className="size-5 text-muted-foreground" aria-hidden="true" />
        </Link>
      )}

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <section aria-labelledby="about-title" className="rounded-2xl bg-muted p-4 sm:p-5">
          <h2 id="about-title" className="font-semibold">
            {t("vols.route.about")}
          </h2>
          {data.route?.note && <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">{data.route.note}</p>}
          <p className="mt-2 text-sm text-neutral-700">
            {origin.name} ({origin.code}) – {destination.name} ({destination.code}).
          </p>
          <p className="mt-2 text-sm text-neutral-700">
            {ahead === 0
              ? t("vols.route.sameZone")
              : t("vols.route.timeAhead", { count: Math.abs(ahead), ...(ahead > 0 ? { city: destination.city, other: origin.city } : { city: origin.city, other: destination.city }) })}
          </p>
        </section>
        <section aria-labelledby="help-title" className="rounded-2xl border p-4 sm:p-5">
          <h2 id="help-title" className="flex items-center gap-2 font-semibold">
            <LifeBuoy className="size-4 text-brand" aria-hidden="true" />
            {t("vols.route.helpTitle")}
          </h2>
          <p className="mt-2 text-sm text-neutral-700">{t("vols.route.helpBody")}</p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href={requestHref(origin.code, destination.code)}>{t("vols.route.helpCta")}</Link>
          </Button>
        </section>
      </div>

      <PageFacts
        updatedAt={data.updatedAt}
        verifiedAt={data.verifiedAt}
        sources={data.sources}
        report={{ label: [`${origin.city} – ${destination.city}`, data.date && formatDateLong(day(data.date))].filter(Boolean).join(", "), date: data.date }}
      />
    </div>
  );
}
