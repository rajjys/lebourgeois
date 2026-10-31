import { workspaceAction } from "@/app/api/utils/workspace";
import { VerifySchema } from "@/lib/validations/schedule";
import { verifyAll } from "@/lib/workspace";

/** POST: "Tout est vérifié" for this airline on this route and its next 7 days of flights. */
export const POST = workspaceAction(VerifySchema, (id, input, actor) => verifyAll(id, input, actor));
