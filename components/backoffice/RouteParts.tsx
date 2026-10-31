import { Badge } from "@/components/ui/badge";
import { FreshnessBadge } from "@/components/ds/FreshnessBadge";
import { FRESH_DAYS, OLD_DAYS, type Freshness } from "@/lib/routeStatus";
import { cn } from "@/lib/utils/cn-utils";

// Small pieces shared by the network board and the route page (docs/ROUTE-MODEL.md §6).

export const ROUTE_STATUS = {
  DRAFT: { label: "Brouillon", variant: "neutral" },
  PUBLISHED: { label: "Publiée", variant: "success" },
  ARCHIVED: { label: "Archivée", variant: "outline" },
} as const;

export const ROUTE_AIRLINE_STATUS = {
  ACTIVE: "Active",
  SUSPENDED: "Suspendue",
  ENDED: "Ne dessert plus",
} as const;

export function RouteStatusBadge({ status }: { status: keyof typeof ROUTE_STATUS }) {
  const { label, variant } = ROUTE_STATUS[status];
  return <Badge variant={variant}>{label}</Badge>;
}

/** "P1": priority 1 is the brand colour, the others stay quiet. */
export function TierBadge({ tier }: { tier: number }) {
  return (
    <Badge variant={tier === 1 ? "brand" : "neutral"} title={`Priorité ${tier}`} className="font-mono">
      P{tier}
    </Badge>
  );
}

export function RouteFreshnessBadge({ freshness }: { freshness: Freshness }) {
  if (freshness.state === "none") return <span className="text-xs text-muted-foreground">Aucune compagnie</span>;
  if (freshness.state === "never") return <Badge variant="danger">Jamais vérifié</Badge>;
  return <FreshnessBadge verifiedAt={new Date(freshness.verifiedAt)} freshDays={FRESH_DAYS} staleDays={OLD_DAYS} />;
}

/** Airline codes on a route; suspended or ended ones are struck through. */
export function AirlineCodes({ airlines }: { airlines: { code: string; name: string; status: string; isPublished: boolean }[] }) {
  if (airlines.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {airlines.map((a) => (
        <span
          key={a.code}
          title={`${a.name} · ${ROUTE_AIRLINE_STATUS[a.status as keyof typeof ROUTE_AIRLINE_STATUS]}${a.isPublished ? " · publiée" : " · non publiée"}`}
          className={cn(
            "inline-flex h-6 min-w-8 items-center justify-center rounded-sm border bg-muted px-1 text-xs font-bold tracking-wide",
            a.status !== "ACTIVE" && "text-muted-foreground line-through",
          )}
        >
          {a.code}
        </span>
      ))}
    </span>
  );
}
