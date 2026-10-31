import prisma from "@/lib/prisma";
import { MessageStatusSchema } from "@/lib/validations/contact";
import { ok, badRequest, notFound, internalError, generateRequestId } from "@/app/api/utils/http";
import { dbErrorKind } from "@/app/api/utils/db";
import { requireAdmin } from "@/lib/auth/session";

/**
 * PATCH /api/contact/:id - change a message's status (admin only)
 * DELETE /api/contact/:id - delete a message, e.g. spam (admin only)
 */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    const parsed = MessageStatusSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Statut invalide", parsed.error.format(), requestId);
    const message = await prisma.contactMessage.update({ where: { id }, data: { status: parsed.data.status } });
    return ok(message, requestId);
  } catch (err) {
    if (dbErrorKind(err) === "notFound") return notFound("Message introuvable", null, requestId);
    return internalError("Failed to update message", (err as Error)?.message ?? null, requestId);
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    await prisma.contactMessage.delete({ where: { id } });
    return ok({ deleted: true }, requestId);
  } catch (err) {
    if (dbErrorKind(err) === "notFound") return notFound("Message introuvable", null, requestId);
    return internalError("Failed to delete message", (err as Error)?.message ?? null, requestId);
  }
}
