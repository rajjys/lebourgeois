'use client'
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAirlines } from "@/hooks/useAirlines";
import { useAirports } from "@/hooks/useAirports";
import { Airline, Airport } from "@/lib/generated/prisma/client";

export default function DashboardPage() {
    const { airlines } = useAirlines();
    const { airports } = useAirports();

  return (
    <div className="p-8">
  <h1 className="text-3xl font-bold">Dashboard</h1>

  <div className=" my-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {/* ---------------------------------------------------------
        AIRLINES
    --------------------------------------------------------- */}
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Compagnies</CardTitle>
        <Link href="/dashboard/airlines/new">
          <Button>Nouvelle compagnie</Button>
        </Link>
      </CardHeader>

      <CardContent className="flex flex-col flex-1">
        {airlines?.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Aucune compagnie disponible.
          </div>
        )}

        <ul className="divide-y">
          {airlines?.slice(0, 6).map((a: Airline) => (
            <li key={a.id} className="py-3 flex justify-between">
              <span>
                <span className="font-medium">{a.name}</span> ({a.code})
              </span>
              <Link href={`/dashboard/airlines/${a.id}`}>
                <Button variant="outline" size="sm">Modifier</Button>
              </Link>
            </li>
          ))}
        </ul>

        {/* Footer link pinned at bottom */}
        <div className="border-t border-neutral-200 flex justify-center mt-auto">
          <Link
            href={`/dashboard/airlines`}
            className="pt-4 text-neutral-500 hover:text-neutral-600 font-medium"
          >
            Toutes les compagnies
          </Link>
        </div>
      </CardContent>
    </Card>

    {/* ---------------------------------------------------------
        AIRPORTS
    --------------------------------------------------------- */}
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Aéroports</CardTitle>
        <Link href="/dashboard/airports/new">
          <Button>Nouvel Aéroport</Button>
        </Link>
      </CardHeader>

      <CardContent className="flex flex-col flex-1">
        {airports?.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Aucun aéroport disponible.
          </div>
        )}

        <ul className="divide-y">
          {airports?.slice(0, 6).map((ap: Airport) => (
            <li key={ap.id} className="py-3 flex justify-between">
              <span>
                <span className="font-medium">{ap.code}</span> - {ap.city},{" "}
                {ap.countryCode}
              </span>
              <Link href={`/dashboard/airports/${ap.id}`}>
                <Button variant="outline" size="sm">Modifier</Button>
              </Link>
            </li>
          ))}
        </ul>

        <div className="border-t border-neutral-200 flex justify-center mt-auto">
          <Link
            href={`/dashboard/airports`}
            className="pt-4 text-neutral-500 hover:text-neutral-600 font-medium"
          >
            Tous les aéroports
          </Link>
        </div>
      </CardContent>
    </Card>

    {/* ---------------------------------------------------------
        ROUTES (the dashboard itself is rebuilt in B-1)
    --------------------------------------------------------- */}
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Routes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4">
        <p className="text-sm text-muted-foreground">
          Les vols se saisissent route par route : calendrier, horaires appliqués sur plusieurs semaines, vérification et retour en arrière.
        </p>
        <div className="mt-auto">
          <Link href="/dashboard/routes">
            <Button>Ouvrir les routes</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  </div>
</div>

  );
}
