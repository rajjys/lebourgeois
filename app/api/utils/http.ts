/**
 * Lightweight HTTP response helpers for API routes.
 * Keep these minimal and safe to avoid leaking internal details.
 */

type ErrorDetails = Record<string, unknown> | string | null;

function respond(body: unknown, status = 200, requestId?: string) {
  const headers: Record<string, string> = {};
  if (requestId) headers["X-Request-Id"] = requestId;
  return Response.json(body, { status, headers });
}

export function ok(data: unknown, requestId?: string) {
  return respond(data, 200, requestId);
}

export function created(data: unknown, requestId?: string) {
  return respond(data, 201, requestId);
}

export function badRequest(message = "Bad Request", details: ErrorDetails = null, requestId?: string) {
  return respond({ error: message, code: "BAD_REQUEST", details }, 400, requestId);
}

export function notFound(message = "Not Found", details: ErrorDetails = null, requestId?: string) {
  return respond({ error: message, code: "NOT_FOUND", details }, 404, requestId);
}

export function conflict(message = "Conflict", details: ErrorDetails = null, requestId?: string) {
  return respond({ error: message, code: "CONFLICT", details }, 409, requestId);
}

export function internalError(message = "Internal Server Error", details: ErrorDetails = null, requestId?: string) {
  // Use provided requestId or generate a new one for correlation, then log the error server-side.
  const rid = requestId ?? generateRequestId();
  safeLogError({ requestId: rid, message, details });
  // Return minimal details to the client, include requestId so it can be reported back.
  const safeDetails = typeof details === "string" ? details : null;
  return respond({ error: message, code: "INTERNAL_ERROR", details: safeDetails, requestId: rid }, 500, rid);
}

export function validationError(message = "Validation Error", details: ErrorDetails = null, requestId?: string) {
  return respond({ error: message, code: "VALIDATION_ERROR", details }, 400, requestId);
}

export function generateRequestId() {
  try {
    // Use Web Crypto if available
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {}
  // Fallback
  return `rid_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

function safeLogError(payload: { requestId: string; message: string; details: ErrorDetails }) {
  try {
    const { requestId, message, details } = payload;
    // Keep logs structured and brief. Swap to a proper logger (pino/winston) later.
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", requestId, message, details }));
  } catch (err) {
    // If logging itself fails, avoid crashing the route.
    try { console.error("Failed to log error", err); } catch {}
  }
}
  