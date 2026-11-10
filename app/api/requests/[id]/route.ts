import { NextRequest } from "next/server";
import { z } from "zod";
import { notFound, internalError, generateRequestId, ok, badRequest } from "../../utils/http";
import { REQUEST_STATUS_CHOICES } from "@/lib/constants";
import { currentActor } from "@/lib/auth/session";
import { logChange } from "@/lib/changeLog";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

/**
 * GET /api/requests/[id] - Get a single request by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const requestId = generateRequestId();
  const { id } = await params;

  try {
    const request = await prisma.request.findUnique({
      where: { id },
    });

    if (!request) {
      return notFound("Request not found", null, requestId);
    }

    return ok(request, requestId);
  } catch (err) {
    return internalError("Failed to fetch request", (err as Error)?.message ?? null, requestId);
  }
}

/**
 * DELETE /api/requests/[id] - Delete a request by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const requestId = generateRequestId();
  const { id } = await params;

  try {
    const existingRequest = await prisma.request.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return notFound("Request not found", null, requestId);
    }

    await prisma.request.delete({
      where: { id },
    });

    return ok({ success: true }, requestId);
  } catch (err) {
    return internalError("Failed to delete request", (err as Error)?.message ?? null, requestId);
  }
}

const StatusSchema = z.object({ status: z.enum(REQUEST_STATUS_CHOICES) });

/**
 * PATCH /api/requests/[id] - Sets where the request stands: called back, booked, or no booking (AN-3).
 * "Réservée" is what the analytics count as a booking.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const requestId = generateRequestId();
  const { id } = await params;

  try {
    const parsed = StatusSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Statut invalide", parsed.error.format(), requestId);
    const actor = await currentActor();
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.request.findUnique({ where: { id }, select: { status: true } });
      if (!before) return null;
      const after = await tx.request.update({ where: { id }, data: { status: parsed.data.status } });
      if (before.status !== after.status) {
        await logChange(tx, {
          actor, entity: "Request", entityId: id, action: "UPDATE",
          summary: `Demande : ${before.status} → ${after.status}`, changes: { status: [before.status, after.status] },
        });
      }
      return after;
    });
    if (!updated) return notFound("Request not found", null, requestId);
    return ok(updated, requestId);
  } catch (err) {
    return internalError("Failed to update request", (err as Error)?.message ?? null, requestId);
  }
}
