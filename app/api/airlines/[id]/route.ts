import prisma from "@/lib/prisma";
import { AirlineSchema } from "@/lib/validations/airline";
import { ok, badRequest, notFound, internalError, generateRequestId } from "@/app/api/utils/http";

/**
 * GET /api/airlines/:id
 * PUT /api/airlines/:id
 * DELETE /api/airlines/:id
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
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = AirlineSchema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid airline payload", parsed.error.format(), requestId);
    const airline = await prisma.airline.update({ where: { id }, data: parsed.data });
    return ok(airline, requestId);
  } catch (err) {
    const msg = (err as Error)?.message ?? null;
    if (msg?.includes("Record to update not found")) return notFound(`Airline not found for id`, null, requestId);
    return internalError("Failed to update airline", msg, requestId);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    await prisma.airline.delete({ where: { id } });
    return ok({ deleted: true }, requestId);
  } catch (err) {
    const msg = (err as Error)?.message ?? null;
    if (msg?.includes("Record to delete does not exist")) return notFound(`Airline not found for id`, null, requestId);
    return internalError("Failed to delete airline", msg, requestId);
  }
}
