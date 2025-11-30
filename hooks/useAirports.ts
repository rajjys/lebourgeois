import useSWR from "swr";
import { Airport } from "@/lib/generated/prisma/client";
import {
  fetchAirports,
  fetchAirport,
} from "@/services/airports";

export function useAirports() {
  const { data, error, isLoading, mutate } = useSWR<Airport[]>(
    "/api/airports",
    fetchAirports
  );

  return { airports: data, error, isLoading, mutate };
}

export function useAirport(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Airport>(
    id ? `/api/airports/${id}` : null,
    () => fetchAirport(id)
  );

  return { airport: data, error, isLoading, mutate };
}
