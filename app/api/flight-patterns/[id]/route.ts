import prisma from "@/lib/prisma";
import { FlightPatternSchema } from "@/lib/validations/flightPattern";
import { ok, badRequest, notFound, internalError, generateRequestId } from "@/app/api/utils/http";
import { withNextDepartureDate } from "@/lib/flightPatterns/nextDeparture";

/**
 * Handlers for /api/flight-patterns/:id
 * - GET: returns flight pattern (200) or 404
 * - PUT: validates body and updates pattern
 * - DELETE: deletes pattern
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    const pattern = await prisma.flightPattern.findUnique({
      where: { id },
      include: { airline: true, origin: true, destination: true },
    });
    if (!pattern) return notFound(`Flight pattern not found for id=${id}`, null, requestId);
    return ok(withNextDepartureDate(pattern), requestId);
  } catch (err) {
    return internalError("Failed to retrieve flight pattern", (err as Error)?.message ?? null, requestId);
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = FlightPatternSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid flight pattern payload", parsed.error.format(), requestId);
    }
    const data = parsed.data;

    const updated = await prisma.flightPattern.update({
      where: { id },
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
        price: Number(data.price),
        currency: data.currency,
        aircraft: data.aircraft,
        capacity: Number(data.capacity),
        durationInMin: Number(data.durationInMin),
        distanceInKm: Number(data.distanceInKm),
        active: data.active ?? true,
      },
      include: { airline: true, origin: true, destination: true },
    });
    return ok(withNextDepartureDate(updated), requestId);
  } catch (err) {
    // Prisma throws when not found; surface as 404 where appropriate
    const msg = (err as Error)?.message ?? null;
    if (msg?.includes("Record to update not found")) {
      return notFound(`Flight pattern not found for id`, null, requestId);
    }
    return internalError("Failed to update flight pattern", msg, requestId);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    await prisma.flightPattern.delete({ where: { id } });
    return ok({ deleted: true }, requestId);
  } catch (err) {
    const msg = (err as Error)?.message ?? null;
    if (msg?.includes("Record to delete does not exist")) {
      return notFound(`Flight pattern not found for id`, null, requestId);
    }
    return internalError("Failed to delete flight pattern", msg, requestId);
  }
}
