import "server-only";
import type { Request as FlightRequest } from "@/lib/generated/prisma/client";

const WHATSAPP_API_URL = `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

/**
 * Sends the flight_request_alert template to every number in
 * WHATSAPP_ALERT_RECIPIENTS (comma-separated, international format without "+").
 * No-op when WhatsApp is not configured. Never throws.
 */
export async function notifyTeamOfRequest(request: FlightRequest) {
  const recipients = (process.env.WHATSAPP_ALERT_RECIPIENTS ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  if (!recipients.length || !process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_ID) return;

  const results = await Promise.allSettled(
    recipients.map((to) =>
      sendFlightRequestAlert({
        to,
        payload: {
          clientName: request.clientName,
          departureCity: request.originCity,
          arrivalCity: request.destinationCity,
          travelDate: request.travelDate.toDateString(),
          clientPhone: request.clientPhone || undefined,
          clientEmail: request.clientEmail || undefined,
          requestId: request.id,
        },
      })
    )
  );
  for (const r of results) {
    if (r.status === "rejected") console.error("WhatsApp notification failed:", r.reason);
  }
}

export async function sendFlightRequestAlert({
  to,
  payload,
}: {
  to: string;
  payload: {
    clientName: string;
    departureCity: string;
    arrivalCity: string;
    travelDate: string;
    clientPhone?: string;
    clientEmail?: string;
    requestId: string;
  };
}) {
  const res = await fetch(WHATSAPP_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: "flight_request_alert",
        //name:"hello_world",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: payload.clientName },
              { type: "text", text: payload.departureCity },
              { type: "text", text: payload.arrivalCity },
              { type: "text", text: payload.travelDate },
              { type: "text", text: payload.clientPhone || "-" },
              { type: "text", text: payload.clientEmail || "-" },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: payload.requestId }],
          },
        ],
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("WhatsApp API error:", data);
    throw new Error(JSON.stringify(data));
  }
  return data;
}
