import { workspaceAction } from "@/app/api/utils/workspace";
import { FareDeleteSchema } from "@/lib/validations/schedule";
import { deleteFare } from "@/lib/workspace";

/** POST: deletes a price entered by mistake (an outdated price is kept as history). */
export const POST = workspaceAction(FareDeleteSchema, (id, { id: fareId }, actor) => deleteFare(id, fareId, actor));
