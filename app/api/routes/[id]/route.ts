import prisma from "@/lib/prisma";
import { RouteSettingsSchema, routeSettingsData } from "@/lib/validations/route";
import { badRequest, conflict, generateRequestId, internalError, notFound, ok } from "@/app/api/utils/http";
import { dbErrorKind } from "@/app/api/utils/db";
import { currentActor, requireAdmin } from "@/lib/auth/session";
import { changedFields, logChange, snapshot } from "@/lib/changeLog";

/**
 * PUT /api/routes/:id: status, priority and editorial note.
 * DELETE /api/routes/:id: only a draft with no airline and no request (a mistake); otherwise archive it.
 */
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    const parsed = RouteSettingsSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Champs invalides", parsed.error.format(), requestId);

    const actor = await currentActor();
    const route = await prisma.$transaction(async (tx) => {
      const before = await tx.route.findUniqueOrThrow({ where: { id } });
      const after = await tx.route.update({ where: { id }, data: routeSettingsData(parsed.data) });
      const changes = changedFields(before, after);
      if (Object.keys(changes).length > 0) {
        await logChange(tx, { actor, entity: "Route", entityId: id, action: "UPDATE", routeId: id, summary: `Route ${after.slug} modifiée`, changes });
      }
      return after;
    });
    return ok(route, requestId);
  } catch (err) {
    if (dbErrorKind(err) === "notFound") return notFound("Route introuvable", null, requestId);
    return internalError("Failed to update route", (err as Error)?.message ?? null, requestId);
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    const route = await prisma.route.findUnique({
      where: { id },
      include: { _count: { select: { airlines: true, requests: true } } },
    });
    if (!route) return notFound("Route introuvable", null, requestId);
    if (route.status !== "DRAFT" || route._count.airlines > 0 || route._count.requests > 0) {
      return conflict("Seule une route en brouillon, sans compagnie ni demande, peut être supprimée. Archivez-la plutôt.", null, requestId);
    }
    const actor = await currentActor();
    await prisma.$transaction(async (tx) => {
      const deleted = await tx.route.delete({ where: { id } });
      await logChange(tx, { actor, entity: "Route", entityId: id, action: "DELETE", routeId: id, summary: `Route ${deleted.slug} supprimée`, changes: snapshot(deleted) });
    });
    return ok({ deleted: true }, requestId);
  } catch (err) {
    const kind = dbErrorKind(err);
    if (kind === "notFound") return notFound("Route introuvable", null, requestId);
    if (kind === "inUse") return conflict("Des données utilisent cette route. Archivez-la plutôt.", null, requestId);
    return internalError("Failed to delete route", (err as Error)?.message ?? null, requestId);
  }
}
