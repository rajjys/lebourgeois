import { workspaceAction } from "@/app/api/utils/workspace";
import { CopyWeekSchema } from "@/lib/validations/schedule";
import { copyWeek } from "@/lib/workspace";

/** POST: "Copier une semaine" on the next weeks, skipping days that already have flights. */
export const POST = workspaceAction(CopyWeekSchema, (id, { mode, ...input }, actor) => copyWeek(id, input, actor, mode === "apply"));
