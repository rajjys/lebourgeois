import { badRequest, generateRequestId, internalError, notFound, ok } from "@/app/api/utils/http";
import { searchRoute } from "@/lib/search";

/**
 * GET /api/flights/search?from=FIH&to=FBM[&date=YYYY-MM-DD]
 * Public. Services (one per airline flight and timetable) for the next four weeks, or flying on
 * the date given; see lib/search.ts. Sorting happens in the page, so switching tabs costs nothing.
 */
export async function GET(req: Request) {
  const requestId = generateRequestId();
  try {
    const params = new URL(req.url).searchParams;
    const from = params.get("from")?.toUpperCase() ?? "";
    const to = params.get("to")?.toUpperCase() ?? "";
    const date = params.get("date") || null;
    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) return badRequest("from and to must be airport codes", null, requestId);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return badRequest("date must be YYYY-MM-DD", null, requestId);

    const result = await searchRoute(from, to, date);
    if (!result) return notFound("Unknown airport", null, requestId);
    return ok(result, requestId);
  } catch (err) {
    return internalError("Failed to search flights", (err as Error)?.message ?? null, requestId);
  }
}
