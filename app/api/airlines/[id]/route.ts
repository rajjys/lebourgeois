import prisma from "@/lib/prisma";
import { AirlineSchema } from "@/lib/validations/airline";
import { ok, badRequest, notFound, internalError } from "@/app/api/utils/http";

/**
 * GET /api/airlines/:id
 * PUT /api/airlines/:id
 * DELETE /api/airlines/:id
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const airline = await prisma.airline.findUnique({ where: { id } });
    if (!airline) return notFound(`Airline not found for id=${id}`);
    return ok(airline);
  } catch (err) {
    return internalError("Failed to retrieve airline", (err as Error)?.message ?? null);
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = AirlineSchema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid airline payload", parsed.error.format());
    const airline = await prisma.airline.update({ where: { id }, data: parsed.data });
    return ok(airline);
  } catch (err) {
    const msg = (err as Error)?.message ?? null;
    if (msg?.includes("Record to update not found")) return notFound(`Airline not found for id`);
    return internalError("Failed to update airline", msg);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.airline.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    const msg = (err as Error)?.message ?? null;
    if (msg?.includes("Record to delete does not exist")) return notFound(`Airline not found for id`);
    return internalError("Failed to delete airline", msg);
  }
}
