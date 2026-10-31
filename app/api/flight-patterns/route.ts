import prisma from "@/lib/prisma";
import { FlightPatternSchema } from "@/lib/validations/flightPattern";
import { ok, created, badRequest, internalError, generateRequestId } from "@/app/api/utils/http";
import { withNextDepartureDate, withNextDepartureDates } from "@/lib/flightPatterns/nextDeparture";
import { getSession, requireAdmin } from "@/lib/auth/session";
import { PUBLIC_PATTERN_FILTER } from "@/lib/flightPatterns/visibility";
import { refreshPublicPages } from "@/app/api/utils/db";

/**
 * GET /api/flight-patterns
 * POST /api/flight-patterns
 * - GET: returns patterns with related airline/origin/destination (public: visible ones only)
 * - POST: creates a flight pattern; validated by FlightPatternSchema
 */
export async function GET() {
  const requestId = generateRequestId();
  try {
    // Admins see everything (including expired/pending rows they need to fix);
    // the public sees only current, approved, published schedules.
    const isAdmin = !!(await getSession());
    const now = new Date();
    const patterns = await prisma.flightPattern.findMany({
      where: isAdmin ? {} : { ...PUBLIC_PATTERN_FILTER, startDate: { lte: now }, endDate: { gte: now } },
      include: { airline: true, origin: true, destination: true },
      orderBy: { createdAt: "desc" },
    });
    const enriched = withNextDepartureDates(patterns);

    const sorted = enriched.sort((a, b) => {
      // Handle nulls first
      if (!a.nextDepartureDate && !b.nextDepartureDate) return 0;
      if (!a.nextDepartureDate) return 1;
      if (!b.nextDepartureDate) return -1;

      // Compare by nextDepartureDate
      const diff =
        new Date(a.nextDepartureDate).getTime() -
        new Date(b.nextDepartureDate).getTime();

      if (diff !== 0) return diff;

      // If equal, compare by price (cheapest first)
      // Assuming you have a numeric field like `a.price` or `a.basePrice`
      const priceA = a.price ?? Infinity;
      const priceB = b.price ?? Infinity;
      return priceA - priceB;
    });

    return ok(sorted, requestId);
  } catch (err) {
    return internalError("Failed to list flight patterns", (err as Error)?.message ?? null, requestId);
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
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
      include: { airline: true, origin: true, destination: true },
    });
    refreshPublicPages();
    return created(withNextDepartureDate(createdRow), requestId);
  } catch (err) {
    return internalError("Failed to create flight pattern", (err as Error)?.message ?? null, requestId);
  }
}
