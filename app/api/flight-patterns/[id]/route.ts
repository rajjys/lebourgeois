import prisma from "@/lib/prisma";
import { FlightPatternSchema } from "@/lib/validations/flightPattern";
import { ok, badRequest, notFound, internalError, generateRequestId } from "@/app/api/utils/http";
import { withNextDepartureDate } from "@/lib/flightPatterns/nextDeparture";
import { currentActor, getSession, requireAdmin } from "@/lib/auth/session";
import { PUBLIC_PATTERN_FILTER } from "@/lib/flightPatterns/visibility";
import { dbErrorKind, refreshPublicPages } from "@/app/api/utils/db";
import { ensureRouteAirline } from "@/lib/routes";
import { changedFields, logChange, snapshot } from "@/lib/changeLog";

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
    const isAdmin = !!(await getSession());
    const pattern = await prisma.flightPattern.findFirst({
      where: isAdmin ? { id } : { id, ...PUBLIC_PATTERN_FILTER },
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
  const denied = await requireAdmin();
  if (denied) return denied;
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = FlightPatternSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid flight pattern payload", parsed.error.format(), requestId);
    }
    const data = parsed.data;
    if (data.originId === data.destinationId) return badRequest("Départ et arrivée identiques", null, requestId);
    const actor = await currentActor();

    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.flightPattern.findUniqueOrThrow({ where: { id } });
      // Keeps the route model in step until schedules are managed per route (RW-3).
      const routeAirline = await ensureRouteAirline(tx, data);
      const after = await tx.flightPattern.update({
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
      });
      const changes = changedFields(before, after);
      if (Object.keys(changes).length > 0) {
        await logChange(tx, {
          actor, entity: "FlightPattern", entityId: id, action: "UPDATE", routeId: routeAirline.routeId,
          summary: `Programme ${after.flightNumber} modifié`, changes,
        });
      }
      return tx.flightPattern.findUniqueOrThrow({
        where: { id },
        include: { airline: true, origin: true, destination: true },
      });
    });
    refreshPublicPages();
    return ok(withNextDepartureDate(updated), requestId);
  } catch (err) {
    const msg = (err as Error)?.message ?? null;
    if (dbErrorKind(err) === "notFound") {
      return notFound(`Flight pattern not found for id`, null, requestId);
    }
    return internalError("Failed to update flight pattern", msg, requestId);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    const actor = await currentActor();
    await prisma.$transaction(async (tx) => {
      const pattern = await tx.flightPattern.delete({ where: { id } });
      const route = await tx.route.findUnique({
        where: { originId_destinationId: { originId: pattern.originId, destinationId: pattern.destinationId } },
        select: { id: true },
      });
      await logChange(tx, {
        actor, entity: "FlightPattern", entityId: id, action: "DELETE", routeId: route?.id,
        summary: `Programme ${pattern.flightNumber} supprimé`, changes: snapshot(pattern),
      });
    });
    refreshPublicPages();
    return ok({ deleted: true }, requestId);
  } catch (err) {
    const msg = (err as Error)?.message ?? null;
    if (dbErrorKind(err) === "notFound") {
      return notFound(`Flight pattern not found for id`, null, requestId);
    }
    return internalError("Failed to delete flight pattern", msg, requestId);
  }
}
