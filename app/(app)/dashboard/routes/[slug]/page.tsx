import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RouteTitle } from "@/components/ds/RouteTitle";
import { AirlineMark } from "@/components/ds/AirlineMark";
import { AirportStatusAlert } from "@/components/search/AirportStatusNotice";
import { RouteSettingsForm } from "@/components/backoffice/RouteSettingsForm";
import { ROUTE_AIRLINE_STATUS, RouteFreshnessBadge, RouteStatusBadge, TierBadge } from "@/components/backoffice/RouteParts";
import { loadRouteDetail } from "@/lib/routeBoard";
import { formatDateShort, formatDayMonth, formatDayMonthYear, formatFlightNumber, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils/cn-utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Route ${(await params).slug}` };
}

const REVIEW = {
  APPROVED: { label: "Validé", variant: "success" },
  PENDING: { label: "À valider", variant: "warning" },
  REJECTED: { label: "Rejeté", variant: "neutral" },
} as const;

/** "BU 1611"; the airline is named only when the number doesn't start with its code ("4H · ET 60") or there is none. */
const flightLabel = (airline: string, flightNumber: string | null) => {
  if (!flightNumber) return `${airline} · sans numéro`;
  return flightNumber.startsWith(airline) ? formatFlightNumber(flightNumber) : `${airline} · ${formatFlightNumber(flightNumber)}`;
};

const hostOf = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** One route and everything under it: airlines, next departures, prices (docs/ROUTE-MODEL.md §6.2). */
export default async function RoutePage({ params }: Props) {
  const detail = await loadRouteDetail((await params).slug);
  if (!detail) notFound();
  const { route, reverseSlug, freshness, airlines, departures, stops } = detail;
  const airlineCode = new Map(airlines.map((ra) => [ra.id, ra.airline.code]));
  const fares = airlines.flatMap((ra) => ra.fares.map((f) => ({ ...f, airline: ra.airline.code })));
  const canDelete = route.status === "DRAFT" && airlines.length === 0 && route._count.requests === 0;

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compagnies sur cette route</CardTitle>
              <CardDescription>Une ligne par compagnie : son statut sur la route, sa dernière vérification et ses vols connus.</CardDescription>
            </CardHeader>
            <CardContent>
              {airlines.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune compagnie pour l&apos;instant. Elles s&apos;ajoutent avec la saisie des vols, à la prochaine étape.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Compagnie</TableHead>
                      <TableHead>Vérification</TableHead>
                      <TableHead>Prochain vol</TableHead>
                      <TableHead>Vols connus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {airlines.map((ra) => (
                      <TableRow key={ra.id}>
                        <TableCell>
                          <span title={ra.airline.name}>
                            <AirlineMark code={ra.airline.code} />
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {ROUTE_AIRLINE_STATUS[ra.status]} · {ra.isPublished ? "publiée" : "non publiée"}
                          </span>
                          {ra.airline.status !== "OPERATING" && (
                            <Badge variant="danger" className="mt-1">
                              Compagnie {ra.airline.status === "SUSPENDED" ? "suspendue" : "arrêtée"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <RouteFreshnessBadge freshness={ra.freshness} />
                          {ra.verifiedSourceUrl && (
                            <a href={ra.verifiedSourceUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-link underline">
                              {hostOf(ra.verifiedSourceUrl)}
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {ra.next ? (
                            <>
                              {formatDateShort(ra.next.date)} · {ra.next.departureTime}
                              <span className="block text-xs text-muted-foreground">{flightLabel(ra.airline.code, ra.next.flightNumber)}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {ra.flightsNext4Weeks > 0 ? `${ra.flightsNext4Weeks} sur 4 sem.` : <span className="text-muted-foreground">aucun à venir</span>}
                          {ra.knownUntil && (
                            <span className="block text-xs text-muted-foreground">
                              jusqu&apos;au {formatDayMonth(new Date(`${ra.knownUntil}T00:00:00Z`))}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prochains départs (14 jours)</CardTitle>
              <CardDescription>Heures locales. La saisie des vols (calendrier, horaire appliqué sur plusieurs semaines) arrive à la prochaine étape.</CardDescription>
            </CardHeader>
            <CardContent>
              {departures.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun vol connu sur les 14 prochains jours.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vol</TableHead>
                      <TableHead>Horaire</TableHead>
                      <TableHead>Escales</TableHead>
                      <TableHead className="hidden xl:table-cell">Appareil</TableHead>
                      <TableHead>
                        <span className="sr-only">État</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departures.map((f) => (
                      <TableRow key={f.id} className={cn(f.status === "CANCELLED" && "text-muted-foreground line-through")}>
                        <TableCell className="whitespace-nowrap text-sm">{formatDateShort(f.date)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-medium">
                          {flightLabel(airlineCode.get(f.routeAirlineId) ?? "", f.flightNumber)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {f.departureTime} → {f.arrivalTime}
                          {f.arrivalDayOffset > 0 && <sup className="ml-0.5 text-xs">+1</sup>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {f.via.length === 0 ? "Direct" : `via ${f.via.map((c) => stops[c] ?? c).join(", ")}`}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-sm xl:table-cell">{f.aircraft ?? "—"}</TableCell>
                        <TableCell>
                          {f.status === "CANCELLED" && <Badge variant="neutral">Annulé</Badge>}
                          {f.reviewStatus === "PENDING" && <Badge variant="warning">À valider</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prix observés</CardTitle>
              <CardDescription>Chaque prix vu, avec sa date et sa source. La saisie et la validation arrivent avec l&apos;étape des prix.</CardDescription>
            </CardHeader>
            <CardContent>
              {fares.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun prix relevé.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prix</TableHead>
                      <TableHead>Compagnie</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Observé le</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>État</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fares.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">
                          {formatPrice(f.amount.toString())}
                          {(f.fareName || f.cabin) && <span className="block text-xs font-normal text-muted-foreground">{f.fareName ?? f.cabin}</span>}
                        </TableCell>
                        <TableCell className="text-sm">{f.airline}</TableCell>
                        <TableCell className="text-sm">
                          {f.kind === "FROM_PRICE" ? "À partir de" : f.travelDate ? `Vol du ${formatDayMonth(f.travelDate)}` : "Pour une date"}
                          {f.tripType === "ROUND_TRIP" && <span className="block text-xs text-muted-foreground">aller-retour</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatDayMonthYear(f.observedAt)}</TableCell>
                        <TableCell className="text-sm">
                          {f.sourceUrl ? (
                            <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-link underline">
                              {hostOf(f.sourceUrl)}
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={REVIEW[f.reviewStatus].variant}>{REVIEW[f.reviewStatus].label}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-4">
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
