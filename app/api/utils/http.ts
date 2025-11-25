/**
 * Lightweight HTTP response helpers for API routes.
 * Keep these minimal and safe to avoid leaking internal details.
 */

type ErrorDetails = Record<string, unknown> | string | null;

function respond(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export function ok(data: unknown) {
  return respond(data, 200);
}

export function created(data: unknown) {
  return respond(data, 201);
}

export function badRequest(message = "Bad Request", details: ErrorDetails = null) {
  return respond({ error: message, code: "BAD_REQUEST", details }, 400);
}

export function notFound(message = "Not Found", details: ErrorDetails = null) {
  return respond({ error: message, code: "NOT_FOUND", details }, 404);
}

export function conflict(message = "Conflict", details: ErrorDetails = null) {
  return respond({ error: message, code: "CONFLICT", details }, 409);
}

export function internalError(message = "Internal Server Error", details: ErrorDetails = null) {
  // Do not include sensitive details in production responses; details can be set during development.
  return respond({ error: message, code: "INTERNAL_ERROR", details }, 500);
}

export function validationError(message = "Validation Error", details: ErrorDetails = null) {
  return respond({ error: message, code: "VALIDATION_ERROR", details }, 400);
}
  