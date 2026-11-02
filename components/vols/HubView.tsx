'use client';

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { PriceTag } from "@/components/ds/PriceTag";
import { RouteTitle } from "@/components/ds/RouteTitle";
import { TYPE } from "@/components/ds/typography";
import { Breadcrumbs } from "@/components/vols/Breadcrumbs";
import { RouteSearch } from "@/components/vols/RouteSearch";
import { shortAirlineName as shortName } from "@/lib/format";
import { VOLS_HREF } from "@/lib/links";
import type { Hub } from "@/lib/routePages";

/** /vols: the search box, then every route we can show, by departure city. */
export function HubView({ hub, today }: { hub: Hub; today: string }) {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 pb-16 pt-4 sm:space-y-10 sm:px-6 sm:pt-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: t("vols.breadcrumb.home"), href: "/" },
          { label: t("vols.breadcrumb.vols"), href: VOLS_HREF },
        ]}
      />
      <header className="max-w-2xl space-y-2 sm:space-y-3">
        <h1 className={TYPE.title}>{t("vols.hub.title")}</h1>
        <p className={TYPE.lead}>{t("vols.hub.intro")}</p>
      </header>

      <RouteSearch today={today} />

      {hub.length ? (
        hub.map((group) => (
          <section key={group.city} aria-labelledby={`from-${group.routes[0].origin.slug}`} className="space-y-3 sm:space-y-4">
            <h2 id={`from-${group.routes[0].origin.slug}`} className={TYPE.section}>
              {t("vols.hub.from", { city: group.city })}
            </h2>
            {/* Phones (P-17): one grouped list per city, rows divided by a line; from 640px a grid of cards. */}
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-y-0 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent">
              {group.routes.map((r) => (
                <li key={r.slug}>
                  <Link href={`/vols/${r.slug}`} className="flex h-full items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted sm:rounded-xl sm:border sm:bg-card sm:hover:border-primary sm:hover:bg-card">
                    <span className="min-w-0">
                      <RouteTitle as="span" origin={r.origin.city} destination={r.destination.city} className="text-base font-semibold" />
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        {[r.airlines.map((a) => shortName(a.name)).sort().join(", "), t("vols.hub.flights", { count: r.flightsThisWeek })].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {r.minPrice && (
                        <PriceTag
                          amount={r.minPrice.amount}
                          observedAt={new Date(r.minPrice.observedAt)}
                          kind={r.minPrice.kind === "FROM_PRICE" ? "from" : "quote"}
                          labels={{ from: t("explore.results.from"), observed: t("explore.results.seenOn") }}
                          className="text-right"
                        />
                      )}
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <p className="text-muted-foreground">{t("vols.hub.empty")}</p>
      )}
    </div>
  );
}
