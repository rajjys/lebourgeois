import { FlightPatternInput } from "@/lib/validations/flightPattern";

export async function fetchFlightPatterns() {
  console.log("Fetching flight patterns from API Inside Service");
  return fetch("/api/flight-patterns").then((r) => r.json());
}

export async function fetchFlightPattern(id: string) {
  return fetch(`/api/flight-patterns/${id}`).then((r) => r.json());
}

export async function createFlightPattern(data: FlightPatternInput) {
  return fetch("/api/flight-patterns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());
}

export async function updateFlightPattern(id: string, data: FlightPatternInput) {
  return fetch(`/api/flight-patterns/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());
}

export async function deleteFlightPattern(id: string) {
  return fetch(`/api/flight-patterns/${id}`, { method: "DELETE" }).then((r) =>
    r.json()
  );
}

export async function searchFlights(fromIata: string, toIata: string, date: string) {
  const q = new URLSearchParams({ from: fromIata, to: toIata, date });
  return fetch(`/api/flights/search?${q.toString()}`).then((r) => r.json());
}
