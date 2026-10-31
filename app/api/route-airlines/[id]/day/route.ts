import { workspaceAction } from "@/app/api/utils/workspace";
import { DaySchema } from "@/lib/validations/schedule";
import { editDay } from "@/lib/workspace";

/** PUT: the flights of one date, as typed; replaces what was stored for that date. */
export const PUT = workspaceAction(DaySchema, (id, input, actor) => editDay(id, input, actor));
