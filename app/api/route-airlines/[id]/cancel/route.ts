import { workspaceAction } from "@/app/api/utils/workspace";
import { CancelSchema } from "@/lib/validations/schedule";
import { cancelFlights } from "@/lib/workspace";

/** POST: "Annuler des vols" between two dates, optionally on some weekdays or one flight number. */
export const POST = workspaceAction(CancelSchema, (id, { mode, ...input }, actor) => cancelFlights(id, input, actor, mode === "apply"));
