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

export async function createRequest(data: RequestInput): Promise<Request> {
  const response = await fetch("/api/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
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