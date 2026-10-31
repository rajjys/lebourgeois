import { workspaceAction } from "@/app/api/utils/workspace";
import { RouteAirlineSettingsSchema } from "@/lib/validations/schedule";
import { changedFields, logChange } from "@/lib/changeLog";
import { loadRouteAirline } from "@/lib/workspace";
import prisma from "@/lib/prisma";

const STATUS = { ACTIVE: "active", SUSPENDED: "suspendue", ENDED: "arrêtée" } as const;

/** PUT: the airline's status on this route and whether it is published. */
export const PUT = workspaceAction(RouteAirlineSettingsSchema, (id, input, actor) =>
  prisma.$transaction(async (tx) => {
    const before = await loadRouteAirline(tx, id);
    const after = await tx.routeAirline.update({ where: { id }, data: input });
    const changes = changedFields(
      { status: before.status, isPublished: before.isPublished },
      { status: after.status, isPublished: after.isPublished },
    );
    if (Object.keys(changes).length > 0) {
      await logChange(tx, {
        actor, entity: "RouteAirline", entityId: id, action: "UPDATE", routeId: before.routeId, changes,
        summary: `${before.airline.code} sur ${before.route.slug} : ${STATUS[after.status]}, ${after.isPublished ? "publiée" : "non publiée"}`,
      });
    }
    return after;
  }),
);
