import prisma from "@/lib/prisma";
import { AirlineSchema } from "@/lib/validations/airline";
import { ok, created, badRequest, internalError, generateRequestId } from "@/app/api/utils/http";

/**
 * GET /api/airlines - list airlines
 * POST /api/airlines - create airline (validated)
 */
export async function GET() {
  const requestId = generateRequestId();
  try {
    const airlines = await prisma.airline.findMany({ orderBy: { name: "asc" } });
    return ok(airlines, requestId);
  } catch (err) {
    return internalError("Failed to list airlines", (err as Error)?.message ?? null, requestId);
  }
}

export async function POST(req: Request) {
  const requestId = generateRequestId();
  try {
    const body = await req.json();
    const parsed = AirlineSchema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid airline payload", parsed.error.format(), requestId);
    const airline = await prisma.airline.create({ data: parsed.data });
    return created(airline, requestId);
  } catch (err) {
    return internalError("Failed to create airline", (err as Error)?.message ?? null, requestId);
  }
}
