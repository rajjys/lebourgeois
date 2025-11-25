import prisma from "@/lib/prisma";
import { AirportSchema } from "@/lib/validations/airport";
import { ok, created, badRequest, internalError } from "@/app/api/utils/http";

/**
 * GET /api/airports
 * - Returns a list of airports sorted by name
 *
 * POST /api/airports
 * - Accepts body validated by AirportSchema
 * - Returns created airport with 201
 */
export async function GET() {
  try {
    const airports = await prisma.airport.findMany({ orderBy: { name: "asc" } });
    return ok(airports);
  } catch (err) {
    return internalError("Failed to list airports", (err as Error)?.message ?? null);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = AirportSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid airport payload", parsed.error.format());
    }

    const airport = await prisma.airport.create({ data: parsed.data });
    return created(airport);
  } catch (err) {
    return internalError("Failed to create airport", (err as Error)?.message ?? null);
  }
}
