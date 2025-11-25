"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useFlightPatterns } from "@/hooks/useFlightPatterns";
import { FlightPatternResponse } from "@/lib/validations/flightPattern";

export default function FlightPatternsPage() {
  const { patterns, isLoading } = useFlightPatterns();

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Flight Patterns</h1>
        <Button asChild>
          <Link href="/dashboard/flight-patterns/new">Add Flight</Link>
        </Button>
      </div>

      <table className="w-full border">
        <thead className="bg-muted">
          <tr>
            <th className="p-2 text-left">Flight</th>
            <th className="p-2 text-left">Airline</th>
            <th className="p-2 text-left">Route</th>
            <th className="p-2 text-left">Days</th>
            <th className="p-2 text-left">Time</th>
            <th className="p-2 text-left">Price</th>
            <th className="p-2 text-left"></th>
          </tr>
        </thead>

        <tbody>
          {patterns?.map((p: FlightPatternResponse) => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.flightNumber}</td>
              <td className="p-2">{p.airline?.name}</td>
              <td className="p-2">{p.origin?.code} → {p.destination?.code}</td>
              <td className="p-2">{p.departureTime} - {p.arrivalTime}</td>
              <td className="p-2">{p.price ? `${p.price} ${p.currency || "USD"}` : "-"}</td>
              <td className="p-2 text-right">
                <Link className="text-blue-600 underline" href={`/dashboard/flight-patterns/${p.id}`}>
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
