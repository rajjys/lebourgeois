import "server-only";
import type { Request as FlightRequest } from "@/lib/generated/prisma/client";
import { SITE } from "@/lib/site";

const RESEND_API_URL = "https://api.resend.com/emails";

/**
 * Emails a new request to every address in REQUEST_ALERT_EMAILS (comma-separated).
 * Without a verified domain, Resend's onboarding@resend.dev sender only delivers
 * to the Resend account owner's address. No-op when not configured. Never throws.
 */
export async function sendRequestAlertEmail(request: FlightRequest) {
  const to = (process.env.REQUEST_ALERT_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const apiKey = process.env.RESEND_API_KEY;
  if (!to.length || !apiKey) return;

  const email = buildRequestAlertEmail(request);
  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || `${SITE.name} <onboarding@resend.dev>`,
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(request.clientEmail ? { reply_to: request.clientEmail } : {}),
      }),
    });
    if (!res.ok) console.error("Request alert email failed:", res.status, await res.text());
  } catch (err) {
    console.error("Request alert email failed:", err);
  }
}

export function buildRequestAlertEmail(request: FlightRequest) {
  const date = request.travelDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const dashboardUrl = `${SITE.url}/dashboard/requests/${request.id}`;
  const rows: [string, string][] = [
    ["Client", request.clientName],
    ["Téléphone", request.clientPhone ? `${request.clientPhone}${request.prefersWhatsapp ? " (WhatsApp)" : ""}` : "-"],
    ["Email", request.clientEmail ?? "-"],
    ["Trajet", `${request.originCity} → ${request.destinationCity}`],
    ["Vol", request.flightNumber],
    ["Date", date],
    ["Classe", request.travelClass],
    ["Voyageurs", String(request.travelers)],
    ["Source", request.source],
  ];

  const subject = `Nouvelle demande : ${request.originCity} → ${request.destinationCity} (${date})`;
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${dashboardUrl}`;
  const html =
    `<h2 style="font-family:sans-serif">${escapeHtml(subject)}</h2>` +
    `<table style="font-family:sans-serif;border-collapse:collapse">` +
    rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#555">${escapeHtml(k)}</td><td style="padding:4px 0"><strong>${escapeHtml(v)}</strong></td></tr>`).join("") +
    `</table><p style="font-family:sans-serif"><a href="${escapeHtml(dashboardUrl)}">Ouvrir dans le tableau de bord</a></p>`;

  return { subject, html, text };
}

// Request fields are user input; never put them into HTML unescaped.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
