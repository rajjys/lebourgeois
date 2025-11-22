import useSWR from "swr";
import { 
  fetchAirlines, 
  fetchAirline 
} from "@/services/airlines";

export function useAirlines() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/airlines",
    fetchAirlines
  );

  return { airlines: data, error, isLoading, mutate };
}

export function useAirline(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/airlines/${id}` : null,
    () => fetchAirline(id)
  );

  return { airline: data, error, isLoading, mutate };
}
