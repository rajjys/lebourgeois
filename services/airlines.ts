import { AirlineInput } from "@/lib/validations/airline";
import type { Airline } from "@/lib/generated/prisma/client";
import { sendJson } from "@/services/http";

export async function fetchAirlines() {
  return fetch("/api/airlines").then((r) => r.json());
}

export async function fetchAirline(id: string) {
  return fetch(`/api/airlines/${id}`).then((r) => r.json());
}

export async function createAirline(data: AirlineInput) {
  return sendJson<Airline>("/api/airlines", "POST", data);
}

export async function updateAirline(id: string, data: AirlineInput) {
  return sendJson<Airline>(`/api/airlines/${id}`, "PUT", data);
}

export async function deleteAirline(id: string) {
  return sendJson<{ deleted: true }>(`/api/airlines/${id}`, "DELETE");
}
