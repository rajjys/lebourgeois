import prisma from "@/lib/prisma";
import { AirlineSchema, airlineData } from "@/lib/validations/airline";
import { ok, badRequest, conflict, notFound, internalError, generateRequestId } from "@/app/api/utils/http";
import { dbErrorKind, refreshPublicPages } from "@/app/api/utils/db";
import { currentActor, requireAdmin } from "@/lib/auth/session";
import { changedFields, logChange, snapshot } from "@/lib/changeLog";

/**
 * GET /api/airlines/:id
 * PUT /api/airlines/:id
 * DELETE /api/airlines/:id (409 while routes or schedules still use it)
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    const airline = await prisma.airline.findUnique({ where: { id } });
    if (!airline) return notFound(`Airline not found for id=${id}`, null, requestId);
    return ok(airline, requestId);
  } catch (err) {
    return internalError("Failed to retrieve airline", (err as Error)?.message ?? null, requestId);
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
    const parsed = AirlineSchema.safeParse(body);
    if (!parsed.success) return badRequest("Champs invalides", parsed.error.format(), requestId);
    const actor = await currentActor();
    const airline = await prisma.$transaction(async (tx) => {
      const before = await tx.airline.findUniqueOrThrow({ where: { id } });
      const after = await tx.airline.update({ where: { id }, data: airlineData(parsed.data) });
      const changes = changedFields(before, after);
      if (Object.keys(changes).length > 0) {
        await logChange(tx, { actor, entity: "Airline", entityId: id, action: "UPDATE", summary: `Compagnie ${after.name} modifiée`, changes });
      }
      return after;
    });
    refreshPublicPages();
    return ok(airline, requestId);
  } catch (err) {
    const kind = dbErrorKind(err);
    if (kind === "notFound") return notFound("Compagnie introuvable", null, requestId);
    if (kind === "duplicate") return conflict("Une compagnie avec ce code ou ce slug existe déjà", null, requestId);
    return internalError("Failed to update airline", (err as Error)?.message ?? null, requestId);
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
      const airline = await tx.airline.delete({ where: { id } });
      await logChange(tx, { actor, entity: "Airline", entityId: id, action: "DELETE", summary: `Compagnie ${airline.name} supprimée`, changes: snapshot(airline) });
    });
    refreshPublicPages();
    return ok({ deleted: true }, requestId);
  } catch (err) {
    const kind = dbErrorKind(err);
    if (kind === "notFound") return notFound("Compagnie introuvable", null, requestId);
    if (kind === "inUse") {
      return conflict("Des routes ou des programmes de vol utilisent cette compagnie. Changez plutôt son statut, ou retirez-la du site.", null, requestId);
    }
    return internalError("Failed to delete airline", (err as Error)?.message ?? null, requestId);
  }
}
