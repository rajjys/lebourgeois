import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FlightDetailView } from "@/components/search/FlightDetailView";
import { loadFlight } from "@/lib/search";
import { formatDateShort } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const flight = await loadFlight((await params).id);
  if (!flight) return { title: "Vol introuvable" };
  const date = formatDateShort(new Date(`${flight.date}T00:00:00Z`));
  return {
    title: `${flight.airline.name} ${flight.origin.city} – ${flight.destination.city}, ${date}`,
    description: `Départ ${flight.departureTime}, arrivée ${flight.arrivalTime} (heures locales). Horaires et prix indicatifs.`,
  };
}

/**
 * One departure: what the result card leaves out (number, aircraft, stops, other dates, sources).
 * Rendered on the server; keyed by the flight's id until RW-5 gives each airline on a route its own
 * page (/vols/{route}/{airline}), so it stays out of search indexes (see layout.tsx).
 */
export default async function FlightPage({ params }: Props) {
  const flight = await loadFlight((await params).id);
  if (!flight) notFound();
  return <FlightDetailView flight={flight} />;
}
