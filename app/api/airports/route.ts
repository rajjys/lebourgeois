import prisma from "@/lib/prisma";
import { AirportSchema, airportData } from "@/lib/validations/airport";
import { slugify } from "@/lib/utils/slug";
import { ok, created, badRequest, conflict, internalError, generateRequestId } from "@/app/api/utils/http";
import { dbErrorKind, refreshPublicPages } from "@/app/api/utils/db";
import { currentActor, requireAdmin } from "@/lib/auth/session";
import { logChange, snapshot } from "@/lib/changeLog";

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
  const denied = await requireAdmin();
  if (denied) return denied;
  const requestId = generateRequestId();
  try {
    const body = await req.json();
    const parsed = AirportSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Champs invalides", parsed.error.format(), requestId);
    }

    const data = airportData(parsed.data);
    const actor = await currentActor();
    const airport = await prisma.$transaction(async (tx) => {
      const row = await tx.airport.create({ data: { ...data, slug: data.slug || slugify(data.city) } });
      await logChange(tx, { actor, entity: "Airport", entityId: row.id, action: "CREATE", summary: `Aéroport ${row.code} créé`, changes: snapshot(row) });
      return row;
    });
    refreshPublicPages();
    return created(airport, requestId);
  } catch (err) {
    if (dbErrorKind(err) === "duplicate") return conflict("Un aéroport avec ce code ou ce slug existe déjà", null, requestId);
    return internalError("Failed to create airport", (err as Error)?.message ?? null, requestId);
  }
}
