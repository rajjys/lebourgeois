import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteTitle } from "@/components/ds/RouteTitle";
import { AirportStatusAlert } from "@/components/search/AirportStatusNotice";
import { RouteSettingsForm } from "@/components/backoffice/RouteSettingsForm";
import { HistoryPanel } from "@/components/backoffice/HistoryPanel";
import { RouteWorkspace } from "@/components/backoffice/workspace/RouteWorkspace";
import { RouteFreshnessBadge, RouteStatusBadge, TierBadge } from "@/components/backoffice/RouteParts";
import { loadRouteDetail } from "@/lib/routeBoard";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ semaine?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Route ${(await params).slug}` };
}

/** One route and everything under it: airlines, their flights and prices, notes, history (docs/ROUTE-MODEL.md §6.2). */
export default async function RoutePage({ params, searchParams }: Props) {
  const detail = await loadRouteDetail((await params).slug, (await searchParams).semaine);
  if (!detail) notFound();
  const { route, reverseSlug, freshness, history, workspace } = detail;
  const canDelete = route.status === "DRAFT" && route.airlines.length === 0 && route._count.requests === 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-2">
        <Link href="/dashboard/routes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Routes
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <RouteTitle origin={route.origin.city} destination={route.destination.city} className="text-2xl" />
          <TierBadge tier={route.tier} />
          <RouteStatusBadge status={route.status} />
          <RouteFreshnessBadge freshness={freshness} />
          {reverseSlug && (
            <Button asChild variant="outline" size="sm" className="ml-auto">
              <Link href={`/dashboard/routes/${reverseSlug}`}>
                <ArrowLeftRight className="size-4" aria-hidden="true" />
                {route.destination.city} → {route.origin.city}
              </Link>
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {route.origin.name} ({route.origin.code}) → {route.destination.name} ({route.destination.code}) ·{" "}
          <span className="font-mono">{route.slug}</span> · {route._count.requests} demande{route._count.requests > 1 ? "s" : ""}
        </p>
      </header>

      {[route.origin, route.destination].map((a) => (
        <AirportStatusAlert key={a.code} airport={a} />
      ))}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <div className="space-y-6">
          <Suspense>
            <RouteWorkspace routeId={route.id} workspace={workspace} reverseSlug={reverseSlug} />
          </Suspense>

          <HistoryPanel items={history} />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-4">
          <RouteSettingsForm
            key={route.updatedAt.getTime()}
            route={{ id: route.id, status: route.status, tier: route.tier, note: route.note }}
            canDelete={canDelete}
          />
        </aside>
      </div>
    </div>
  );
}
