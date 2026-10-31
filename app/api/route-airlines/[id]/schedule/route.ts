import { workspaceAction } from "@/app/api/utils/workspace";
import { ScheduleSchema } from "@/lib/validations/schedule";
import { applySchedule } from "@/lib/workspace";

/** POST: "Appliquer un horaire". mode "preview" returns the plan; "apply" saves it as one batch. */
export const POST = workspaceAction(ScheduleSchema, (id, { mode, ...input }, actor) => applySchedule(id, input, actor, mode === "apply"));
