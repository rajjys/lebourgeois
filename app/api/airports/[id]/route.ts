import prisma from "@/lib/prisma";
import { AirportSchema } from "@/lib/validations/airport";
import { ok, badRequest, notFound, internalError, generateRequestId } from "@/app/api/utils/http";

/**
 * GET /api/airports/:id
 * PUT /api/airports/:id
 * DELETE /api/airports/:id
 * - GET: returns airport or 404
 * - PUT: validates payload and returns updated airport
 * - DELETE: deletes the airport
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const { id } = await context.params; // 👈 await here
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
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = AirportSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid airport payload", parsed.error.format(), requestId);
    }

    const airport = await prisma.airport.update({ where: { id }, data: parsed.data });
    return ok(airport, requestId);
  } catch (err) {
    return internalError("Failed to update airport", (err as Error)?.message ?? null, requestId);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    await prisma.airport.delete({ where: { id } });
    return ok({ deleted: true }, requestId);
  } catch (err) {
    return internalError("Failed to delete airport", (err as Error)?.message ?? null, requestId);
  }
}
