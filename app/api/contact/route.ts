import prisma from "@/lib/prisma";
import { ContactSchema, splitReply } from "@/lib/validations/contact";
import { ok, created, badRequest, internalError, generateRequestId } from "@/app/api/utils/http";
import { requireAdmin } from "@/lib/auth/session";

/**
 * GET /api/contact - contact messages, newest first (admin only)
 * POST /api/contact - send a message from the contact page (public)
 * Only the new id is returned so the endpoint never echoes stored records.
 */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const requestId = generateRequestId();
  try {
    const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
    return ok(messages, requestId);
  } catch (err) {
    return internalError("Failed to list messages", (err as Error)?.message ?? null, requestId);
  }
}

export async function POST(req: Request) {
  const requestId = generateRequestId();
  try {
    const parsed = ContactSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.format(), requestId);

    const { name, reply, topic, message, pageUrl, website } = parsed.data;
    // A filled honeypot is a bot: answer as if it worked, store nothing.
    if (website) return created({ id: "ok" }, requestId);

    const saved = await prisma.contactMessage.create({
      data: { name, topic, message, pageUrl: pageUrl || null, ...splitReply(reply) },
    });
    return created({ id: saved.id }, requestId);
  } catch (err) {
    return internalError("Failed to save message", (err as Error)?.message ?? null, requestId);
  }
}
