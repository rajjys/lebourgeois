import prisma from "@/lib/prisma";
import { FlightPatternSchema } from "@/lib/validations/flightPattern";
import { ok, created, badRequest, internalError, generateRequestId } from "@/app/api/utils/http";

/**
 * GET /api/flight-patterns
 * POST /api/flight-patterns
 * - GET: returns patterns with related airline/origin/destination
 * - POST: creates a flight pattern; validated by FlightPatternSchema
 */
export async function GET() {
  const requestId = generateRequestId();
  try {
    const patterns = await prisma.flightPattern.findMany({
     
    });
    return ok(patterns, requestId);
  } catch (err) {
    console.log(err);
    return internalError("Failed to list flight patterns", (err as Error)?.message ?? null, requestId);
  }
}

export async function POST(req: Request) {
  const requestId = generateRequestId();
  try {
    const body = await req.json();
    const parsed = FlightPatternSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid flight pattern payload", parsed.error.format(), requestId);
    }
    const data = parsed.data;
    const createdRow = await prisma.flightPattern.create({
      data: {
        airlineId: data.airlineId,
        originId: data.originId,
        destinationId: data.destinationId,
        flightNumber: data.flightNumber,
        departureTime: data.departureTime,
        arrivalTime: data.arrivalTime,
        daysOfWeek: data.daysOfWeek ?? [],
        startDate: data.startDate,
        endDate: data.endDate,
        price: data.price,
        currency: data.currency,
        aircraft: data.aircraft,
        capacity: data.capacity,
        active: data.active ?? true,
      },
    });
    return created(createdRow, requestId);
  } catch (err) {
    return internalError("Failed to create flight pattern", (err as Error)?.message ?? null, requestId);
  }
}
