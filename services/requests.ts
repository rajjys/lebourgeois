import { RequestInput } from "@/lib/validations/request";
import { Request } from "@/lib/generated/prisma/client";

export async function fetchRequests(): Promise<Request[]> {
  const response = await fetch("/api/requests");
  if (!response.ok) {
    throw new Error("Failed to fetch requests");
  }
  return response.json();
}

export async function fetchRequest(id: string): Promise<Request> {
  const response = await fetch(`/api/requests/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch request");
  }
  return response.json();
}

/** `attribution`: where the visitor came from (lib/analytics/browser.ts); optional, never required by the server. */
export async function createRequest(data: RequestInput, attribution: unknown = null): Promise<{ id: string }> {
  const response = await fetch("/api/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, attribution }),
  });
  if (!response.ok) {
    throw new Error("Failed to create request");
  }
  return response.json();
}

export async function deleteRequest(id: string): Promise<void> {
  const response = await fetch(`/api/requests/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Failed to delete request");
  }
}