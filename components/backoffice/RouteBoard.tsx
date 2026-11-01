'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RouteTitle } from "@/components/ds/RouteTitle";
import { NewRouteDialog, type ExistingRoutes } from "@/components/backoffice/NewRouteDialog";
import { AirlineCodes, RouteFreshnessBadge, RouteStatusBadge, TierBadge } from "@/components/backoffice/RouteParts";
import { attentionRank } from "@/lib/routeStatus";
import type { BoardRoute } from "@/lib/routeBoard";
import { formatDateShort, formatDayMonth, formatFlightNumber } from "@/lib/format";
import { cn } from "@/lib/utils/cn-utils";

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Filter = { text: string; status: string; tier: string; attention: string };

/** The network board: every route, what needs work first (docs/ROUTE-MODEL.md §6.1). */
export function RouteBoard({ routes }: { routes: BoardRoute[] }) {
  const [filter, setFilter] = useState<Filter>({ text: "", status: "active", tier: "all", attention: "all" });
  const set = (patch: Partial<Filter>) => setFilter((f) => ({ ...f, ...patch }));

  const shown = useMemo(() => {
    const text = normalize(filter.text.trim());
    return routes.filter((r) => {
      if (filter.status === "active" ? r.status === "ARCHIVED" : filter.status !== "all" && r.status !== filter.status) return false;
      if (filter.tier !== "all" && String(r.tier) !== filter.tier) return false;
      if (filter.attention === "todo" && attentionRank(r) > 1) return false;
      if (filter.attention === "empty" && r.airlines.length > 0) return false;
      if (filter.attention === "prices" && r.prices.pending === 0) return false;
      if (!text) return true;
      const haystack = normalize(`${r.origin.city} ${r.destination.city} ${r.origin.code} ${r.destination.code} ${r.slug}`);
      return text.split(/\s+/).every((word) => haystack.includes(word));
    });
  }, [routes, filter]);

  const existing = useMemo<ExistingRoutes>(
    () =>
      Object.fromEntries(
        routes.map((r) => [
          `${r.origin.code}-${r.destination.code}`,
          { slug: r.slug, label: `${r.origin.city} → ${r.destination.city}${r.status === "ARCHIVED" ? " (archivée)" : ""}` },
        ]),
      ),
    [routes],
  );
  const toCheck = routes.filter((r) => attentionRank(r) <= 1).length;
  const withoutAirline = routes.filter((r) => r.status !== "ARCHIVED" && r.airlines.length === 0).length;
  const published = routes.filter((r) => r.status === "PUBLISHED").length;
  const pendingPrices = routes.reduce((n, r) => n + r.prices.pending, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Routes</h1>
          <p className="text-sm text-muted-foreground">
            {routes.length} routes · {published} publiées · {toCheck} à vérifier · {withoutAirline} sans compagnie
            {pendingPrices > 0 && ` · ${pendingPrices} prix à valider`}
          </p>
        </div>
        <NewRouteDialog existing={existing} />
      </header>

      <div className="flex flex-wrap items-center gap-3" role="search">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={filter.text}
            onChange={(e) => set({ text: e.target.value })}
            placeholder="Kinshasa, FBM…"
            aria-label="Rechercher une route"
            className="pl-9"
          />
        </div>
        <Select value={filter.status} onValueChange={(status) => set({ status })}>
          <SelectTrigger className="w-56" aria-label="Statut">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Brouillons et publiées</SelectItem>
            <SelectItem value="DRAFT">Brouillons</SelectItem>
            <SelectItem value="PUBLISHED">Publiées</SelectItem>
            <SelectItem value="ARCHIVED">Archivées</SelectItem>
            <SelectItem value="all">Toutes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter.tier} onValueChange={(tier) => set({ tier })}>
          <SelectTrigger className="w-36" aria-label="Priorité">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes priorités</SelectItem>
            <SelectItem value="1">P1</SelectItem>
            <SelectItem value="2">P2</SelectItem>
            <SelectItem value="3">P3</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter.attention} onValueChange={(attention) => set({ attention })}>
          <SelectTrigger className="w-44" aria-label="À faire">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout</SelectItem>
            <SelectItem value="todo">À vérifier</SelectItem>
            <SelectItem value="empty">Sans compagnie</SelectItem>
            <SelectItem value="prices">Prix à valider</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {shown.length} affichée{shown.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route</TableHead>
              <TableHead className="w-12">P</TableHead>
              <TableHead>Compagnies</TableHead>
              <TableHead>Prochain vol</TableHead>
              <TableHead className="hidden xl:table-cell">Connu jusqu&apos;au</TableHead>
              <TableHead>Fraîcheur</TableHead>
              <TableHead className="hidden lg:table-cell">Prix</TableHead>
              <TableHead className="hidden lg:table-cell">Demandes</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  Aucune route ne correspond.
                </TableCell>
              </TableRow>
            )}
            {shown.map((r) => (
              <TableRow key={r.id} className={cn(r.status === "ARCHIVED" && "opacity-60")}>
                <TableCell>
                  <Link href={`/dashboard/routes/${r.slug}`} className="group block">
                    <RouteTitle as="span" origin={r.origin.city} destination={r.destination.city} className="text-sm group-hover:text-link group-hover:underline" />
                  </Link>
                  <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                    {r.origin.code} → {r.destination.code}
                    {r.reverseSlug && (
                      <Link
                        href={`/dashboard/routes/${r.reverseSlug}`}
                        className="inline-flex items-center gap-1 font-sans hover:text-link"
                        aria-label={`Retour : ${r.destination.city} vers ${r.origin.city}`}
                      >
                        <ArrowLeftRight className="size-3" aria-hidden="true" /> retour
                      </Link>
                    )}
                  </span>
                  {[r.origin, r.destination]
                    .filter((a) => a.status !== "OPEN")
                    .map((a) => (
                      <Badge key={a.code} variant={a.status === "CLOSED" ? "danger" : "warning"} className="mt-1 mr-1">
                        {a.city} : {a.status === "CLOSED" ? "fermé" : "activité réduite"}
                      </Badge>
                    ))}
                </TableCell>
                <TableCell>
                  <TierBadge tier={r.tier} />
                </TableCell>
                <TableCell>
                  <AirlineCodes airlines={r.airlines} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {r.next ? (
                    <>
                      <span className="font-medium">{formatDateShort(day(r.next.day))}</span> · {r.next.time}
                      <span className="block text-xs text-muted-foreground">
                        {r.next.flightNumber ? formatFlightNumber(r.next.flightNumber) : r.next.airline} · {r.flightsNext7Days} vol
                        {r.flightsNext7Days > 1 ? "s" : ""} sur 7 j
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-sm xl:table-cell">
                  {r.knownUntil ? formatDayMonth(day(r.knownUntil)) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <RouteFreshnessBadge freshness={r.freshness} />
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-sm lg:table-cell">
                  {r.prices.approved + r.prices.pending === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <>
                      {r.prices.approved > 0 && <span className="block">{r.prices.approved} validé{r.prices.approved > 1 ? "s" : ""}</span>}
                      {r.prices.pending > 0 && <span className="block text-xs text-warning">{r.prices.pending} à valider</span>}
                    </>
                  )}
                </TableCell>
                <TableCell className="hidden text-sm lg:table-cell">{r.requests || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <RouteStatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
