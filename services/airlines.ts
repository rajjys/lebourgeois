import { AirlineInput } from "@/lib/validations/airline";

export async function fetchAirlines() {
  return fetch("/api/airlines").then((r) => r.json());
}

export async function fetchAirline(id: string) {
  return fetch(`/api/airlines/${id}`).then((r) => r.json());
}

export async function createAirline(data: AirlineInput) {
  return fetch("/api/airlines", {
    method: "POST",
    body: JSON.stringify(data),
  }).then((r) => r.json());
}

export async function updateAirline(id: string, data: AirlineInput) {
  return fetch(`/api/airlines/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }).then((r) => r.json());
}

export async function deleteAirline(id: string) {
  return fetch(`/api/airlines/${id}`, { method: "DELETE" }).then((r) =>
    r.json()
  );
}
