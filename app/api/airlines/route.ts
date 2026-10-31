import prisma from "@/lib/prisma";
import { AirlineSchema, airlineData } from "@/lib/validations/airline";
import { slugify } from "@/lib/utils/slug";
import { ok, created, badRequest, conflict, internalError, generateRequestId } from "@/app/api/utils/http";
import { dbErrorKind, refreshPublicPages } from "@/app/api/utils/db";
import { requireAdmin } from "@/lib/auth/session";

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
  const denied = await requireAdmin();
  if (denied) return denied;
  const requestId = generateRequestId();
  try {
    const body = await req.json();
    const parsed = AirlineSchema.safeParse(body);
    if (!parsed.success) return badRequest("Champs invalides", parsed.error.format(), requestId);
    const data = airlineData(parsed.data);
    const airline = await prisma.airline.create({ data: { ...data, slug: data.slug || slugify(data.name) } });
    refreshPublicPages();
    return created(airline, requestId);
  } catch (err) {
    if (dbErrorKind(err) === "duplicate") return conflict("Une compagnie avec ce code ou ce slug existe déjà", null, requestId);
    return internalError("Failed to create airline", (err as Error)?.message ?? null, requestId);
  }
}
