import { NextRequest } from "next/server";
import { RequestSchema } from "@/lib/validations/request";
import { created, badRequest, internalError, generateRequestId } from "../utils/http";
import { sendFlightRequestAlert } from "@/services/whatsapp";
import prisma from "@/lib/prisma";

const TEAM_NUMBERS = [
  "243975092470",
  //"243973020687"
];

/**
 * GET /api/requests - List all requests
 * Returns requests sorted by most recent first
 */
export async function GET() {
  const requestId = generateRequestId();

  try {
    const requests = await prisma.request.findMany({
      orderBy: { createdAt: "desc" },
    });

    return created(requests, requestId);
  } catch (err) {
    return internalError("Failed to fetch requests", (err as Error)?.message ?? null, requestId);
  }
}

/**
 * POST /api/requests - Create a new request
 * Creates a request and sends WhatsApp notifications to team
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();

    // Validate input
    const validationResult = RequestSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Request validation failed:", validationResult.error);
      return badRequest("Validation failed", validationResult.error.format(), requestId);
    }

    const validatedData = validationResult.data;

    // Create the request
    const newRequest = await prisma.request.create({
      data: validatedData,
    });

    // Send WhatsApp notifications to team (fire and forget)
    try {
      await Promise.allSettled(
        TEAM_NUMBERS.map(number =>
          sendFlightRequestAlert({
            to: number,
            payload: {
              clientName: newRequest.clientName,
              departureCity: newRequest.originCity,
              arrivalCity: newRequest.destinationCity,
              travelDate: newRequest.travelDate.toDateString(),
              clientPhone: newRequest.clientPhone || undefined,
              clientEmail: newRequest.clientEmail || undefined,
              requestId: newRequest.id,
            },
          })
        )
      );
    } catch (whatsappError) {
      // Log WhatsApp errors but don't fail the request
      console.error("WhatsApp notification failed:", whatsappError);
    }

    return created(newRequest, requestId);
  } catch (err) {
    return internalError("Failed to create request", (err as Error)?.message ?? null, requestId);
  }
}
