import prisma from "@/lib/prisma";
import { workspaceAction } from "@/app/api/utils/workspace";
import { AddAirlineSchema } from "@/lib/validations/schedule";
import { logChange, snapshot } from "@/lib/changeLog";
import { WorkspaceError } from "@/lib/workspace";

/** POST: adds an airline to the route (active, not published yet). */
export const POST = workspaceAction(AddAirlineSchema, (routeId, { airlineId }, actor) =>
  prisma.$transaction(async (tx) => {
    const [route, airline] = await Promise.all([
      tx.route.findUnique({ where: { id: routeId } }),
      tx.airline.findUnique({ where: { id: airlineId } }),
    ]);
    if (!route || !airline) throw new WorkspaceError("Route ou compagnie introuvable.");
    if (await tx.routeAirline.findUnique({ where: { routeId_airlineId: { routeId, airlineId } } })) {
      throw new WorkspaceError(`${airline.name} est déjà sur cette route.`);
    }
    const ra = await tx.routeAirline.create({ data: { routeId, airlineId } });
    await logChange(tx, {
      actor, entity: "RouteAirline", entityId: ra.id, action: "CREATE", routeId,
      summary: `${airline.code} ajoutée sur ${route.slug}`, changes: snapshot(ra),
    });
    return ra;
  }),
);
