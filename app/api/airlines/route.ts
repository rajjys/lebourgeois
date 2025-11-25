import prisma from "@/lib/prisma";
import { AirlineSchema } from "@/lib/validations/airline";
import { ok, created, badRequest, internalError } from "@/app/api/utils/http";

/**
 * GET /api/airlines - list airlines
 * POST /api/airlines - create airline (validated)
 */
export async function GET() {
  try {
    const airlines = await prisma.airline.findMany({ orderBy: { name: "asc" } });
    return ok(airlines);
  } catch (err) {
    return internalError("Failed to list airlines", (err as Error)?.message ?? null);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = AirlineSchema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid airline payload", parsed.error.format());
    const airline = await prisma.airline.create({ data: parsed.data });
    return created(airline);
  } catch (err) {
    return internalError("Failed to create airline", (err as Error)?.message ?? null);
  }
}
