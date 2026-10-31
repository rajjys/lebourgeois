"use client";

import { useParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AirportForm } from "@/components/backoffice/AirportForm";
import { useAirport } from "@/hooks/useAirports";

export default function EditAirportPage() {
  const { id } = useParams<{ id: string }>();
  const { airport, isLoading } = useAirport(id);

  if (isLoading) return <LoadingSpinner message="Chargement de l'aéroport…" />;
  if (!airport?.id) return <p className="text-muted-foreground">Aéroport introuvable.</p>;
  // Keyed so the form starts from this airport's saved values.
  return <AirportForm key={airport.id} airport={airport} />;
}
