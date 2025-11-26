import prisma from "@/lib/prisma";
import { AirportSchema } from "@/lib/validations/airport";
import { ok, created, badRequest, internalError, generateRequestId } from "@/app/api/utils/http";

/**
 * GET /api/airports
 * - Returns a list of airports sorted by name
 *
 * POST /api/airports
 * - Accepts body validated by AirportSchema
 * - Returns created airport with 201
 */
export async function GET() {
  const requestId = generateRequestId();
  try {
    const airports = await prisma.airport.findMany({ orderBy: { name: "asc" } });
    return ok(airports, requestId);
  } catch (err) {
    return internalError("Failed to list airports", (err as Error)?.message ?? null, requestId);
  }
}

export async function POST(req: Request) {
  const requestId = generateRequestId();
  try {
    const body = await req.json();
    const parsed = AirportSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid airport payload", parsed.error.format(), requestId);
    }

    const airport = await prisma.airport.create({ data: parsed.data });
    return created(airport, requestId);
  } catch (err) {
    return internalError("Failed to create airport", (err as Error)?.message ?? null, requestId);
  }
}
