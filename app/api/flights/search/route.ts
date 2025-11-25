import { Weekday } from "@/lib/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { badRequest, notFound, ok, internalError } from "@/app/api/utils/http";

function toWeekdayEnum(date: Date): Weekday {
  // returns "MON"..."SUN"
  const map = ["SUN","MON","TUE","WED","THU","FRI","SAT"] as Weekday[];
  return map[date.getUTCDay()]; // JS 0=Sun
}

/**
 * GET /api/flights/search
 * Query params:
 * - from: origin airport code (string)
 * - to: destination airport code (string)
 * - date: ISO date (YYYY-MM-DD)
 *
 * Responses:
 * - 200: array of matching flight patterns
 * - 400: missing/invalid params
 * - 500: internal error
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const dateStr = url.searchParams.get("date");

    if (!from || !to || !dateStr) {
      return badRequest("Missing query params: from, to and date are required");
    }

    const searchDate = new Date(dateStr + "T00:00:00Z");
    if (isNaN(searchDate.getTime())) {
      return badRequest("Invalid date: expected format YYYY-MM-DD");
    }

    const weekday = toWeekdayEnum(searchDate); // e.g. "WED"

    const patterns = await prisma.flightPattern.findMany({
      where: {
        origin: { code: from },
        destination: { code: to },
        active: true,
        OR: [
          {
            daysOfWeek: { has: weekday }, // recurring
            startDate: { lte: searchDate },
            endDate: { gte: searchDate },
          },
          {
            startDate: { lte: searchDate },
            endDate: { gte: searchDate },
          },
        ],
      },
      include: { airline: true, origin: true, destination: true },
      orderBy: [
        { price: "asc" },
        { departureTime: "asc" }
      ],
    });

    return ok(patterns);
  } catch (err) {
    return internalError("Failed to search flights", (err as Error)?.message ?? null);
  }
}
