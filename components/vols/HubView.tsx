'use client';

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { PriceTag } from "@/components/ds/PriceTag";
import { RouteTitle } from "@/components/ds/RouteTitle";
import { Breadcrumbs } from "@/components/vols/Breadcrumbs";
import { RouteSearch } from "@/components/vols/RouteSearch";
import { shortAirlineName as shortName } from "@/lib/format";
import { VOLS_HREF } from "@/lib/links";
import type { Hub } from "@/lib/routePages";

/** /vols: the search box, then every route we can show, by departure city. */
export function HubView({ hub, today }: { hub: Hub; today: string }) {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto max-w-5xl space-y-10 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: t("vols.breadcrumb.home"), href: "/" },
          { label: t("vols.breadcrumb.vols"), href: VOLS_HREF },
        ]}
      />
      <header className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("vols.hub.title")}</h1>
        <p className="text-lg text-neutral-700">{t("vols.hub.intro")}</p>
      </header>

      <RouteSearch today={today} />

      {hub.length ? (
        hub.map((group) => (
          <section key={group.city} aria-labelledby={`from-${group.routes[0].origin.slug}`} className="space-y-4">
            <h2 id={`from-${group.routes[0].origin.slug}`} className="text-xl font-bold">
              {t("vols.hub.from", { city: group.city })}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {group.routes.map((r) => (
                <li key={r.slug}>
                  <Link href={`/vols/${r.slug}`} className="flex h-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary">
                    <span className="min-w-0">
                      <RouteTitle as="span" origin={r.origin.city} destination={r.destination.city} className="text-base" />
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
