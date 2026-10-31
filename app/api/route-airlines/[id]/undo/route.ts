import { z } from "zod";
import { workspaceAction } from "@/app/api/utils/workspace";
import { undoLatest } from "@/lib/workspace";

/** POST: undoes the latest action on this airline and route that is not undone yet. */
export const POST = workspaceAction(z.object({}), (id, _input, actor) => undoLatest(id, actor));
