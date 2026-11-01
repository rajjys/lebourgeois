import { workspaceAction } from "@/app/api/utils/workspace";
import { NoteSchema } from "@/lib/validations/schedule";
import { editNote } from "@/lib/workspace";

/** PUT: the airline's public note on this route (baggage, fare names, how to book). */
export const PUT = workspaceAction(NoteSchema, (id, input, actor) => editNote(id, input, actor));
