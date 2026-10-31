import { NextRequest } from "next/server";
import { RequestSchema } from "@/lib/validations/request";
import { ok, created, badRequest, internalError, generateRequestId } from "../utils/http";
import { notifyTeamOfRequest } from "@/services/notifications";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { routeIdForCities } from "@/lib/routes";

/**
 * GET /api/requests - List all requests (admin only)
 * Returns requests sorted by most recent first
 */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const requestId = generateRequestId();

  try {
    const requests = await prisma.request.findMany({
      orderBy: { createdAt: "desc" },
    });

    return ok(requests, requestId);
  } catch (err) {
    return internalError("Failed to fetch requests", (err as Error)?.message ?? null, requestId);
  }
}

/**
 * POST /api/requests - Create a new request (public)
 * Creates a request and notifies the team on WhatsApp.
 * Only the new id is returned so the endpoint never echoes stored records.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();

    const validationResult = RequestSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequest("Validation failed", validationResult.error.format(), requestId);
    }

    const data = validationResult.data;
    // Counts as demand for a route when both cities match one (ROUTE-MODEL §9).
    const routeId = await routeIdForCities(prisma, data.originCity, data.destinationCity);
    const newRequest = await prisma.request.create({
      data: { ...data, routeId },
    });

    // Notification failures are logged but never fail the submission.
    await notifyTeamOfRequest(newRequest);

    return created({ id: newRequest.id }, requestId);
  } catch (err) {
    return internalError("Failed to create request", (err as Error)?.message ?? null, requestId);
  }
}
