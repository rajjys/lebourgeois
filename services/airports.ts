import { AirportInput } from "@/lib/validations/airport";
import type { Airport } from "@/lib/generated/prisma/client";
import { sendJson } from "@/services/http";

export async function fetchAirports() {
  return fetch("/api/airports").then((r) => r.json());
}

export async function fetchAirport(id: string) {
  return fetch(`/api/airports/${id}`).then((r) => r.json());
}

export async function createAirport(data: AirportInput) {
  return sendJson<Airport>("/api/airports", "POST", data);
}

export async function updateAirport(id: string, data: AirportInput) {
  return sendJson<Airport>(`/api/airports/${id}`, "PUT", data);
}

export async function deleteAirport(id: string) {
  return sendJson<{ deleted: true }>(`/api/airports/${id}`, "DELETE");
}
