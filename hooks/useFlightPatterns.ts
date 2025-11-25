import useSWR from "swr";
import { fetchFlightPatterns, fetchFlightPattern } from "@/services/flightPatterns";

export function useFlightPatterns() {
  console.log("Test api")
  const { data, error, isLoading, mutate } = useSWR("/api/flight-patterns", fetchFlightPatterns);
  console.log("test api end");
  return { patterns: data, error, isLoading, mutate };
}

export function useFlightPattern(id?: string) {
  const key = id ? `/api/flight-patterns/${id}` : null;
  const { data, error, isLoading, mutate } = useSWR(key, () => fetchFlightPattern(id!));
  return { pattern: data, error, isLoading, mutate };
}
