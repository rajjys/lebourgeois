import prisma from "@/lib/prisma";
import { FlightPatternSchema } from "@/lib/validations/flightPattern";
import { ok, created, badRequest, internalError } from "@/app/api/utils/http";

/**
 * GET /api/flight-patterns
 * POST /api/flight-patterns
 * - GET: returns patterns with related airline/origin/destination
 * - POST: creates a flight pattern; validated by FlightPatternSchema
 */
export async function GET() {
  console.log("API Route: GET /api/flight-patterns called");
  try {
    const patterns = await prisma.flightPattern.findMany({
      include: { airline: true, origin: true, destination: true },
      orderBy: { createdAt: "desc" },
    });
    return ok(patterns);
  } catch (err) {
    console.error("Error listing flight patterns:", err);
    return internalError("Failed to list flight patterns", (err as Error)?.message ?? null);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = FlightPatternSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid flight pattern payload", parsed.error.format());
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
    return created(createdRow);
  } catch (err) {
    return internalError("Failed to create flight pattern", (err as Error)?.message ?? null);
  }
}
