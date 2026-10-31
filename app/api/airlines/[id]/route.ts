import prisma from "@/lib/prisma";
import { AirlineSchema, airlineData } from "@/lib/validations/airline";
import { ok, badRequest, conflict, notFound, internalError, generateRequestId } from "@/app/api/utils/http";
import { dbErrorKind, refreshPublicPages } from "@/app/api/utils/db";
import { requireAdmin } from "@/lib/auth/session";

/**
 * GET /api/airlines/:id
 * PUT /api/airlines/:id
 * DELETE /api/airlines/:id (409 while flights or fares still use it)
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
    const airline = await prisma.airline.update({ where: { id }, data: airlineData(parsed.data) });
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
    await prisma.airline.delete({ where: { id } });
    refreshPublicPages();
    return ok({ deleted: true }, requestId);
  } catch (err) {
    const kind = dbErrorKind(err);
    if (kind === "notFound") return notFound("Compagnie introuvable", null, requestId);
    if (kind === "inUse") {
      return conflict("Des programmes de vol ou des prix utilisent cette compagnie. Changez plutôt son statut, ou retirez-la du site.", null, requestId);
    }
    return internalError("Failed to delete airline", (err as Error)?.message ?? null, requestId);
  }
}
