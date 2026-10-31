import type { Metadata } from "next";
import { RouteBoard } from "@/components/backoffice/RouteBoard";
import { loadRouteBoard } from "@/lib/routeBoard";

export const metadata: Metadata = { title: "Routes" };

// Read on every visit: the values are computed from today's date and the latest flights.
export default async function RoutesPage() {
  const routes = await loadRouteBoard();
  return <RouteBoard routes={routes} />;
}
