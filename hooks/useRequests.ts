import useSWR from "swr";
import { Request } from "@/lib/generated/prisma/client";
import {
  fetchRequests,
  fetchRequest
} from "@/services/requests";

export function useRequests() {
  const { data, error, isLoading, mutate } = useSWR<Request[]>(
    "/api/requests",
    fetchRequests
  );

  return { requests: data, error, isLoading, mutate };
}

export function useRequest(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Request>(
    id ? `/api/requests/${id}` : null,
    () => fetchRequest(id)
  );

  return { request: data, error, isLoading, mutate };
}