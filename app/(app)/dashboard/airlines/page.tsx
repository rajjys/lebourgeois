"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AirlineMark } from "@/components/ds/AirlineMark";
import { AIRLINE_STATUS_LABEL, airlineStatusVariant } from "@/components/backoffice/AirlineForm";
import { useAirlines } from "@/hooks/useAirlines";
import { formatDayMonthYear } from "@/lib/format";
import type { Airline } from "@/lib/generated/prisma/client";

export default function AirlinesPage() {
  const { airlines, isLoading } = useAirlines();

  if (isLoading) return <LoadingSpinner message="Chargement des compagnies…" />;
  const rows: Airline[] = Array.isArray(airlines) ? airlines : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compagnies</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} compagnies · {rows.filter((a) => a.isPublished).length} affichées sur le site
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/airlines/new">
            <Plus className="size-4" aria-hidden="true" />
            Ajouter une compagnie
          </Link>
        </Button>
      </header>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Compagnie</TableHead>
              <TableHead className="hidden md:table-cell">Site officiel</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-0"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <AirlineMark code={a.code} name={a.name} />
                </TableCell>
                <TableCell className="hidden max-w-56 truncate md:table-cell">
                  {a.website ? (
                    <a href={a.website} target="_blank" rel="noopener noreferrer" className="text-sm text-link underline">
                      {a.website.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={airlineStatusVariant[a.status]}>{AIRLINE_STATUS_LABEL[a.status]}</Badge>
                    {!a.isPublished && <Badge variant="neutral">Masquée</Badge>}
                  </div>
                  {a.status !== "OPERATING" && a.statusSince && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      depuis le {formatDayMonthYear(new Date(a.statusSince))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/airlines/${a.id}`} aria-label={`Modifier ${a.name}`}>
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
