"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AIRPORT_STATUS_LABEL } from "@/components/backoffice/AirportForm";
import { useAirports } from "@/hooks/useAirports";
import { formatDayMonthYear } from "@/lib/format";
import type { Airport } from "@/lib/generated/prisma/client";

const statusVariant = { OPEN: "success", RESTRICTED: "warning", CLOSED: "danger" } as const;

// Domestic airports first, then by city.
const byCountryThenCity = (a: Airport, b: Airport) =>
  Number(a.countryCode !== "CD") - Number(b.countryCode !== "CD") || a.city.localeCompare(b.city, "fr");

export default function AirportsPage() {
  const { airports, isLoading } = useAirports();

  if (isLoading) return <LoadingSpinner message="Chargement des aéroports…" />;
  const rows = Array.isArray(airports) ? [...airports].sort(byCountryThenCity) : [];
  const flagged = rows.filter((a) => a.status !== "OPEN").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Aéroports</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} aéroports · {flagged ? `${flagged} fermés ou en activité réduite` : "tous ouverts"}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/airports/new">
            <Plus className="size-4" aria-hidden="true" />
            Ajouter un aéroport
          </Link>
        </Button>
      </header>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aéroport</TableHead>
              <TableHead className="hidden md:table-cell">Province</TableHead>
              <TableHead className="hidden lg:table-cell">Fuseau</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-0"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div className="font-medium">
                    {a.city} <span className="font-mono text-xs text-muted-foreground">{a.code}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{a.name}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {a.countryCode === "CD" ? a.province ?? "—" : a.countryCode}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{a.timezone}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[a.status]}>{AIRPORT_STATUS_LABEL[a.status]}</Badge>
                  {a.status !== "OPEN" && a.statusSince && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      depuis le {formatDayMonthYear(new Date(a.statusSince))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/airports/${a.id}`} aria-label={`Modifier ${a.city}`}>
                      Modifier
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
