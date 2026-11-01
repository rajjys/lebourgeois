import type { Metadata } from "next";
import { RouteBoard, type Filter } from "@/components/backoffice/RouteBoard";
import { loadRouteBoard } from "@/lib/routeBoard";

export const metadata: Metadata = { title: "Routes" };

type Props = { searchParams: Promise<{ a?: string; p?: string }> };

// ?a=todo|empty|prices and ?p=1|2|3 open the board filtered (links from the dashboard home).
const ATTENTION = new Set(["todo", "empty", "prices"]);
const TIERS = new Set(["1", "2", "3"]);

// Read on every visit: the values are computed from today's date and the latest flights.
export default async function RoutesPage({ searchParams }: Props) {
  const { a, p } = await searchParams;
  const initial: Partial<Filter> = {
    ...(a && ATTENTION.has(a) ? { attention: a } : {}),
    ...(p && TIERS.has(p) ? { tier: p } : {}),
  };
  const routes = await loadRouteBoard();
  return <RouteBoard routes={routes} initial={initial} />;
}
