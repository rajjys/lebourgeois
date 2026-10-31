import prisma from "@/lib/prisma";
import { AirportSchema, airportData } from "@/lib/validations/airport";
import { ok, badRequest, conflict, notFound, internalError, generateRequestId } from "@/app/api/utils/http";
import { dbErrorKind, refreshPublicPages } from "@/app/api/utils/db";
import { currentActor, requireAdmin } from "@/lib/auth/session";
import { changedFields, logChange, snapshot } from "@/lib/changeLog";

/**
 * GET /api/airports/:id
 * PUT /api/airports/:id
 * DELETE /api/airports/:id
 * - GET: returns airport or 404
 * - PUT: validates payload and returns updated airport
 * - DELETE: deletes the airport, unless routes or schedules still use it (409)
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    const airport = await prisma.airport.findUnique({ where: { id } });
    if (!airport) return notFound(`Airport not found for id=${id}`, null, requestId);
    return ok(airport, requestId);
  } catch (err) {
    return internalError("Failed to retrieve airport", (err as Error)?.message ?? null, requestId);
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
    const parsed = AirportSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Champs invalides", parsed.error.format(), requestId);
    }

    const actor = await currentActor();
    const airport = await prisma.$transaction(async (tx) => {
      const before = await tx.airport.findUniqueOrThrow({ where: { id } });
      const after = await tx.airport.update({ where: { id }, data: airportData(parsed.data) });
      const changes = changedFields(before, after);
      if (Object.keys(changes).length > 0) {
        await logChange(tx, { actor, entity: "Airport", entityId: id, action: "UPDATE", summary: `Aéroport ${after.code} modifié`, changes });
      }
      return after;
    });
    refreshPublicPages();
    return ok(airport, requestId);
  } catch (err) {
    const kind = dbErrorKind(err);
    if (kind === "notFound") return notFound("Aéroport introuvable", null, requestId);
    if (kind === "duplicate") return conflict("Un aéroport avec ce code ou ce slug existe déjà", null, requestId);
    return internalError("Failed to update airport", (err as Error)?.message ?? null, requestId);
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
      const airport = await tx.airport.delete({ where: { id } });
      await logChange(tx, { actor, entity: "Airport", entityId: id, action: "DELETE", summary: `Aéroport ${airport.code} supprimé`, changes: snapshot(airport) });
    });
    refreshPublicPages();
    return ok({ deleted: true }, requestId);
  } catch (err) {
    const kind = dbErrorKind(err);
    if (kind === "notFound") return notFound("Aéroport introuvable", null, requestId);
    if (kind === "inUse") {
      return conflict("Des routes ou des programmes de vol utilisent cet aéroport. Changez plutôt son statut.", null, requestId);
    }
    return internalError("Failed to delete airport", (err as Error)?.message ?? null, requestId);
  }
}
