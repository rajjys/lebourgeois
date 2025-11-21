import { AirportInput } from "@/lib/validations/airport";

export async function fetchAirports() {
  return fetch("/api/airports").then((r) => r.json());
}

export async function fetchAirport(id: string) {
  return fetch(`/api/airports/${id}`).then((r) => r.json());
}

export async function createAirport(data: AirportInput) {
  return fetch("/api/airports", {
    method: "POST",
    body: JSON.stringify(data),
  }).then((r) => r.json());
}

export async function updateAirport(id: string, data: AirportInput) {
  return fetch(`/api/airports/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }).then((r) => r.json());
}

export async function deleteAirport(id: string) {
  return fetch(`/api/airports/${id}`, { method: "DELETE" }).then((r) =>
    r.json()
  );
}
