import "server-only";
import type { Request as FlightRequest } from "@/lib/generated/prisma/client";
import { sendRequestAlertEmail } from "./email";
import { sendRequestAlertWhatsApp } from "./whatsapp";

/**
 * Tells the team about a new request on every configured channel.
 * Each channel is optional and swallows its own errors.
 */
export async function notifyTeamOfRequest(request: FlightRequest) {
  await Promise.allSettled([sendRequestAlertEmail(request), sendRequestAlertWhatsApp(request)]);
}
