"use client";

import { useParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AirlineForm } from "@/components/backoffice/AirlineForm";
import { useAirline } from "@/hooks/useAirlines";

export default function EditAirlinePage() {
  const { id } = useParams<{ id: string }>();
  const { airline, isLoading } = useAirline(id);

  if (isLoading) return <LoadingSpinner message="Chargement de la compagnie…" />;
  if (!airline?.id) return <p className="text-muted-foreground">Compagnie introuvable.</p>;
  // Keyed so the form starts from this airline's saved values.
  return <AirlineForm key={airline.id} airline={airline} />;
}
