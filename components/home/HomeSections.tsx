'use client';

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { CalendarClock, ChevronRight, CircleAlert, FileCheck2, ShieldCheck, Ticket } from "lucide-react";
import { HomeSearch } from "@/components/home/HomeSearch";
import { AirlineMark } from "@/components/ds/AirlineMark";
import { FreshnessBadge } from "@/components/ds/FreshnessBadge";
import { PriceTag } from "@/components/ds/PriceTag";
import { RouteTitle } from "@/components/ds/RouteTitle";
import { Badge } from "@/components/ui/badge";
import { daysBetween, formatDateShort, formatDayMonthYear, formatFlightNumber } from "@/lib/format";
import { routeHref } from "@/lib/links";
import type { AirportAlert, HomeData, TrackedRoute, UpcomingDeparture } from "@/lib/home";

// Matches the "verify" window chosen on 2026-10-31 (docs/ROUTE-MODEL.md §11).
const FRESH_DAYS = 7;

function SectionHeading({ title, subtitle, id }: { title: string; subtitle?: string; id: string }) {
  return (
    <div className="max-w-2xl">
      <h2 id={id} className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function HomeHero({ popular }: { popular: TrackedRoute[] }) {
  const { t } = useTranslation();
  return (
    <section className="hero-surface rounded-b-[2rem] sm:rounded-b-[3rem]" aria-labelledby="home-title">
      <div className="container mx-auto px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold text-brand">{t("home.hero.eyebrow")}</p>
          <h1
            id="home-title"
            className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            {t("home.hero.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg text-neutral-700">{t("home.hero.subtitle")}</p>

          <div className="mt-8 sm:mt-10">
            <HomeSearch />
          </div>
          <p className="mt-3 text-sm text-neutral-700">{t("home.search.hint")}</p>

          {popular.length > 0 && (
            <nav aria-label={t("home.hero.popular")} className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="basis-full text-sm font-medium text-neutral-700 sm:basis-auto">{t("home.hero.popular")}</span>
              {popular.map((r) => (
                <Link
                  key={`${r.origin.code}-${r.destination.code}`}
                  href={routeHref(r.origin, r.destination)}
                  className="rounded-full border bg-card/80 px-3 py-1 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-link"
                >
                  <RouteTitle as="span" origin={r.origin.city} destination={r.destination.city} className="font-medium" />
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}

function DepartureCard({ d }: { d: UpcomingDeparture }) {
  const { t } = useTranslation();
  const checkedAt = d.checkedAt ? new Date(d.checkedAt) : null;
  return (
    <Link
      href={`/explore/${d.id}`}
      className="flex h-full flex-col rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-primary"
    >
      <div className="flex items-baseline justify-between gap-2">
        <time dateTime={d.date} className="text-sm font-bold text-brand">
          {formatDateShort(new Date(d.date))}
        </time>
        {d.flightNumber && <span className="text-sm text-muted-foreground">{formatFlightNumber(d.flightNumber)}</span>}
      </div>
      <RouteTitle as="h3" origin={d.origin.city} destination={d.destination.city} className="mt-2 text-lg leading-snug" />
      <p className="mt-1 text-sm text-foreground">
        <time>{d.departureTime}</time> – <time>{d.arrivalTime}</time>
      </p>
      <AirlineMark code={d.airline.code} name={d.airline.name} className="mt-3 items-start [&>span:last-child]:leading-6" />
      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-end justify-between gap-2 border-t pt-3">
          {d.price != null ? (
            <PriceTag amount={d.price} observedAt={new Date(d.priceObservedAt!)} />
          ) : (
            <span className="text-sm text-muted-foreground">{t("home.departures.noPrice")}</span>
          )}
          {checkedAt && daysBetween(checkedAt, new Date()) > FRESH_DAYS && <FreshnessBadge verifiedAt={checkedAt} />}
        </div>
      </div>
    </Link>
  );
}

export function UpcomingDepartures({ departures }: { departures: UpcomingDeparture[] }) {
  const { t } = useTranslation();
  if (!departures.length) return null;
  return (
    <section className="container mx-auto px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8" aria-labelledby="home-departures">
      <SectionHeading id="home-departures" title={t("home.departures.title")} subtitle={t("home.departures.subtitle")} />
      {/* Phones swipe a row (never moves on its own); larger screens get a grid.
          "relative" keeps the cards' sr-only text inside the scroller instead of widening the page. */}
      <ul className="relative -mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
        {departures.map((d) => (
          <li key={d.id} className="w-[85%] shrink-0 snap-start sm:w-auto">
            <DepartureCard d={d} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TrackedRoutes({ routes }: { routes: TrackedRoute[] }) {
  const { t } = useTranslation();
  if (!routes.length) return null;
  return (
    <section className="container mx-auto px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8" aria-labelledby="home-routes">
      <div className="rounded-3xl bg-muted p-5 sm:p-8">
        <SectionHeading id="home-routes" title={t("home.routes.title")} subtitle={t("home.routes.subtitle")} />
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((r) => (
            <li key={`${r.origin.code}-${r.destination.code}`}>
              <Link
                href={routeHref(r.origin, r.destination)}
                className="flex h-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary"
              >
                <span className="min-w-0">
                  <RouteTitle as="span" origin={r.origin.city} destination={r.destination.city} className="text-base" />
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {t("home.routes.airlines", { count: r.airlineCount })} ·{" "}
                    {t("home.routes.flights", { count: r.flightsNext7Days })}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {r.minPrice != null && r.minPriceObservedAt && (
                    <PriceTag amount={r.minPrice} observedAt={new Date(r.minPriceObservedAt)} className="text-right" />
                  )}
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function AirportAlerts({ alerts }: { alerts: AirportAlert[] }) {
  const { t } = useTranslation();
  if (!alerts.length) return null;
  return (
    <section className="container mx-auto px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8" aria-labelledby="home-airports">
      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        <SectionHeading id="home-airports" title={t("home.airports.title")} subtitle={t("home.airports.subtitle")} />
        <ul className="grid gap-3">
          {alerts.map((a) => (
            <li key={a.code} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <CircleAlert
                  className={a.status === "CLOSED" ? "size-4 text-danger" : "size-4 text-warning"}
                  aria-hidden="true"
                />
                <span className="font-semibold text-foreground">
                  {a.city} ({a.code})
                </span>
                <Badge variant={a.status === "CLOSED" ? "danger" : "warning"}>
                  {t(`airportPicker.status.${a.status}`)}
                </Badge>
                {a.since && (
                  <span className="text-sm text-muted-foreground">
                    {t("airportPicker.notice.since", { date: formatDayMonthYear(new Date(a.since)) })}
                  </span>
                )}
              </div>
              {a.note && <p className="mt-2 text-sm text-muted-foreground">{a.note}</p>}
              {a.sourceUrl && (
                <a
                  href={a.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm text-link underline"
                >
                  {t("airportPicker.notice.source")}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const METHOD = [
  { key: "sources", icon: FileCheck2 },
  { key: "prices", icon: CalendarClock },
  { key: "freshness", icon: ShieldCheck },
  { key: "tickets", icon: Ticket },
] as const;

export function HowWeWork() {
  const { t } = useTranslation();
  return (
    <section className="container mx-auto px-4 py-12 sm:px-6 sm:py-16 lg:px-8" aria-labelledby="home-method">
      <div className="rounded-3xl border p-5 sm:p-8">
        <SectionHeading id="home-method" title={t("home.method.title")} subtitle={t("home.method.subtitle")} />
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METHOD.map(({ key, icon: Icon }) => (
            <li key={key} className="rounded-xl bg-muted p-4">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-semibold text-foreground">{t(`home.method.${key}.title`)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`home.method.${key}.description`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function HomeView({ data }: { data: HomeData }) {
  return (
    <div className="flex flex-col">
      <HomeHero popular={data.routes.slice(0, 4)} />
      <UpcomingDepartures departures={data.departures} />
      <TrackedRoutes routes={data.routes} />
      <AirportAlerts alerts={data.airportAlerts} />
      <HowWeWork />
    </div>
  );
}
