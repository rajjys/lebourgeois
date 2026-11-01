import { workspaceAction } from "@/app/api/utils/workspace";
import { FareSchema } from "@/lib/validations/schedule";
import { WorkspaceError, addFare } from "@/lib/workspace";

/** POST: "+ Prix observé" for this airline on this route; validated at once (operator entry). */
export const POST = workspaceAction(FareSchema, (id, input, actor) => {
  const today = new Date().toISOString().slice(0, 10);
  if (input.observedAt && input.observedAt > today) throw new WorkspaceError("Un prix ne peut pas être observé dans le futur.");
  return addFare(id, input, actor);
});
