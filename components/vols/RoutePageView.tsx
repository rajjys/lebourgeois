'use client';

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, ArrowRight, Info, LifeBuoy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DayStrip } from "@/components/ds/DayStrip";
import { PriceTag } from "@/components/ds/PriceTag";
import { RouteTitle } from "@/components/ds/RouteTitle";
import { AirportStatusAlert } from "@/components/search/AirportStatusNotice";
import { AirlineTile, ResultCard } from "@/components/search/ResultCard";
import { SortTabs } from "@/components/search/SortTabs";
import { Breadcrumbs } from "@/components/vols/Breadcrumbs";
import { RouteSearch } from "@/components/vols/RouteSearch";
import { sortServices, type SortKey } from "@/lib/searchResults";
import { airlineRouteHref, requestHref, VOLS_HREF } from "@/lib/links";
import { formatDateLong, formatDayMonth, formatDayMonthYear, formatPrice, formatWeekdays, shortAirlineName as shortName, WEEKDAYS } from "@/lib/format";
import type { RoutePage } from "@/lib/routePages";

const day = (d: string) => new Date(`${d}T00:00:00Z`);

/** UTC offset of a zone, in hours, on a given day. */
const offset = (zone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(new Date());
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  return Number(name.replace("GMT", "") || 0);
};

/**
 * The route page (docs/ROUTE-MODEL.md §7): the answer first, then the departures (it is also
 * the search result), then each airline, the return trip, the route itself and the sources.
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
    <div className="container mx-auto max-w-5xl space-y-8 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: t("vols.breadcrumb.home"), href: "/" },
          { label: t("vols.breadcrumb.vols"), href: VOLS_HREF },
          { label: `${origin.city} – ${destination.city}`, href: `/vols/${data.slug}` },
        ]}
      />

      <header className="space-y-3">
        <h1 className="flex flex-wrap items-baseline gap-x-2 text-3xl font-bold tracking-tight sm:text-4xl">
          <span>{t("vols.route.h1")}</span>
          <RouteTitle as="span" origin={origin.city} destination={destination.city} />
        </h1>
        <p className="text-lg text-neutral-700">{answer}</p>
        <p className="text-sm text-muted-foreground">
          {[data.updatedAt && t("vols.route.updated", { date: formatDayMonthYear(new Date(data.updatedAt)) }), data.verifiedAt && t("vols.route.verified", { date: formatDayMonthYear(new Date(data.verifiedAt)) })]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <div className="space-y-3">
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

      <RouteSearch initialFrom={origin.code} initialTo={destination.code} initialDate={data.date} today={data.today} />

      <section aria-labelledby="results-title" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="results-title" className="text-xl font-bold">
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
          <div className="rounded-2xl border border-dashed p-6 text-center">
            <p className="text-muted-foreground">{t("vols.route.noFlightsBody")}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={requestHref(origin.code, destination.code)}>{t("vols.route.helpCta")}</Link>
            </Button>
          </div>
        )}
      </section>

      {data.airlines.length > 0 && (
        <section aria-labelledby="airlines-title" className="space-y-3">
          <h2 id="airlines-title" className="text-xl font-bold">
            {t("vols.route.byAirline")}
          </h2>
          <ul className="divide-y rounded-2xl border bg-card">
            {data.airlines.map((a) => (
              <li key={a.code} className="flex flex-wrap items-center gap-x-5 gap-y-3 p-4 sm:p-5">
                <AirlineTile code={a.code} logo={a.logo} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {a.name}
                    {a.routeStatus !== "ACTIVE" && <Badge variant="warning">{t(`vols.route.badge.${a.routeStatus}`)}</Badge>}
                  </p>
                  {a.days.length > 0 && (
                    <DayStrip days={a.days} letters={letters} label={t("explore.results.flies", { days: formatWeekdays(a.days) })} />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {[a.times.length && t("vols.route.times", { count: a.times.length, times: a.times.join(", ") }), t("vols.route.flights", { count: a.flightsThisWeek })]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  {a.price ? (
                    <PriceTag
                      amount={a.price.amount}
                      observedAt={new Date(a.price.observedAt)}
                      kind={a.price.kind === "FROM_PRICE" ? "from" : "quote"}
                      labels={{ from: t("explore.results.from"), observed: t("explore.results.seenOn") }}
                      className="sm:items-end"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">{t("vols.route.noPriceYet")}</span>
                  )}
                  <Link href={airlineRouteHref(data.slug, a.slug, a.next?.date)} className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline">
                    {t("vols.route.seeAirline", { airline: shortName(a.name) })}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.reverse?.linked && (
        <Link href={`/vols/${data.reverse.slug}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5 transition-colors hover:border-primary">
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

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="about-title" className="rounded-2xl bg-muted p-5">
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
          {data.sources.length > 0 && (
            <p className="mt-3 text-sm">
              <span className="font-medium">{t("vols.route.sources")} : </span>
              {data.sources.map((s, i) => (
                <span key={s.url}>
                  {i > 0 && ", "}
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-link underline">
                    {s.host}
                  </a>
                </span>
              ))}
            </p>
          )}
        </section>
        <section aria-labelledby="help-title" className="rounded-2xl border p-5">
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

      <p className="text-xs text-muted-foreground">{t("explore.detail.disclaimer")}</p>
    </div>
  );
}
