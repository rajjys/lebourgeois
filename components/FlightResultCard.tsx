import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Clock, Plane } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

type RouteItem = {
  airline: { code: string; name: string; logo: string; color: string };
  origin: { city: string; country: string; iataCode: string };
  destination: { city: string; country: string; iataCode: string };
  price: number;
  duration: number;
  departureDate: string;
  ata: string;
  arrivalDate: string;
  eta: string;
  airPlane: string;
  noPax: number;
  classConfig: string;
  flightNumber: string;
  stops: number;
};

type FlightResultCardProps = {
  route: RouteItem;
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins}m`;
}

export default function FlightResultCard({ route }: FlightResultCardProps) {
  const routeId = route.flightNumber;
  const routeTitle = `${route.origin.city} (${route.origin.iataCode}) → ${route.destination.city} (${route.destination.iataCode})`;

  return (
    <Link href={`/explore/${encodeURIComponent(routeId)}`} className="block">
      <Card className="hover:shadow-hover transition-all duration-300 border-border bg-card">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Airline & Route Info */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              {/* Airline Badge */}
              <div
                className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: route.airline.color }}
                aria-label={route.airline.name}
                title={route.airline.name}
              >
                {route.airline.code}
              </div>

              {/* Route Details */}
              <div className="min-w-0 flex-1">
                <h3 className="text-base md:text-lg font-semibold text-foreground mb-1 truncate">
                  {routeTitle}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(route.duration)}</span>
                  </div>
                  <span className="hidden sm:inline">•</span>
                  <span>{route.ata} — {route.eta}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{route.airPlane}</span>
                  {route.stops > 0 && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">{route.stops} stop{route.stops > 1 ? "s" : ""}</span>
                    </>
                  )}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {format(new Date(route.departureDate), "PPP")}
                </div>
              </div>
            </div>

            {/* Price & CTA */}
            <div className="flex items-center justify-end sm:justify-between sm:flex-col sm:items-end gap-4 sm:gap-2">
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">
                  {formatMoney(route.price)}
                </div>
                <div className="text-xs text-muted-foreground">per person</div>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <span className="text-sm font-medium hidden sm:inline">View Details</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

