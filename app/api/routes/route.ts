import prisma from "@/lib/prisma";
import { NewRouteSchema } from "@/lib/validations/route";
import { badRequest, conflict, created, generateRequestId, internalError } from "@/app/api/utils/http";
import { currentActor, requireAdmin } from "@/lib/auth/session";
import { logChange, snapshot } from "@/lib/changeLog";
import { routeSlug } from "@/lib/routes";

/**
 * POST /api/routes: creates a route between two airports, and its return route unless withReturn is false.
 * Directions that already exist are left as they are; 409 when nothing was created.
 */
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const requestId = generateRequestId();
  try {
    const parsed = NewRouteSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Champs invalides", parsed.error.format(), requestId);
    const { originCode, destinationCode, tier, withReturn } = parsed.data;

    const airports = await prisma.airport.findMany({ where: { code: { in: [originCode, destinationCode] } } });
    const origin = airports.find((a) => a.code === originCode);
    const destination = airports.find((a) => a.code === destinationCode);
    if (!origin || !destination) return badRequest("Aéroport inconnu", null, requestId);

    const actor = await currentActor();
    const directions = withReturn ? [[origin, destination], [destination, origin]] : [[origin, destination]];
    const result = await prisma.$transaction(async (tx) => {
      const createdSlugs: string[] = [];
      const existing: string[] = [];
      for (const [from, to] of directions) {
        const found = await tx.route.findUnique({ where: { originId_destinationId: { originId: from.id, destinationId: to.id } } });
        if (found) {
          existing.push(found.slug);
          continue;
        }
        const route = await tx.route.create({
          data: { originId: from.id, destinationId: to.id, slug: routeSlug(from.slug, to.slug), tier },
        });
        await logChange(tx, {
          actor, entity: "Route", entityId: route.id, action: "CREATE", routeId: route.id,
          summary: `Route ${from.city} → ${to.city} créée`, changes: snapshot(route),
        });
        createdSlugs.push(route.slug);
      }
      return { created: createdSlugs, existing };
    });

    if (result.created.length === 0) {
      return conflict(withReturn ? "Ces deux routes existent déjà" : "Cette route existe déjà", result, requestId);
    }
    return created(result, requestId);
  } catch (err) {
    return internalError("Failed to create route", (err as Error)?.message ?? null, requestId);
  }
}
