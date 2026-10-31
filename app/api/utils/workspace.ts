import type { z } from "zod";
import { badRequest, conflict, generateRequestId, internalError, notFound, ok } from "@/app/api/utils/http";
import { dbErrorKind } from "@/app/api/utils/db";
import { currentActor, requireAdmin } from "@/lib/auth/session";
import { WorkspaceError } from "@/lib/workspace";

/**
 * One handler shape for the route workspace actions: admin only, validated body, and refusals
 * returned as one French sentence the back office shows as is.
 */
export function workspaceAction<S extends z.ZodTypeAny>(
  schema: S,
  run: (id: string, data: z.output<S>, actor: string) => Promise<unknown>,
) {
  return async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const denied = await requireAdmin();
    if (denied) return denied;
    const requestId = generateRequestId();
    try {
      const parsed = schema.safeParse(await req.json().catch(() => ({})));
      if (!parsed.success) {
        return badRequest(parsed.error.issues[0]?.message ?? "Champs invalides", parsed.error.format(), requestId);
      }
      const { id } = await context.params;
      return ok(await run(id, parsed.data, await currentActor()), requestId);
    } catch (err) {
      if (err instanceof WorkspaceError) return conflict(err.message, null, requestId);
      const kind = dbErrorKind(err);
      if (kind === "duplicate") {
        return conflict("Cette compagnie a déjà un vol à cette date avec ce numéro ou à cette heure.", null, requestId);
      }
      if (kind === "notFound") return notFound("Introuvable", null, requestId);
      return internalError("Workspace action failed", (err as Error)?.message ?? null, requestId);
    }
  };
}
