import { workspaceAction } from "@/app/api/utils/workspace";
import { FareReviewSchema } from "@/lib/validations/schedule";
import { reviewFares } from "@/lib/workspace";

/** POST: validates or rejects prices waiting for review. */
export const POST = workspaceAction(FareReviewSchema, (id, input, actor) => reviewFares(id, input, actor));
