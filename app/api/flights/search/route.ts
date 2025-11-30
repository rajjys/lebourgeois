import { Weekday } from "@/lib/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { badRequest, ok, internalError, generateRequestId } from "@/app/api/utils/http";
import { withNextDepartureDates } from "@/lib/flightPatterns/nextDeparture";
import { getWeekdayFromDate } from "@/lib/utils/datetime-utils";

function toWeekdayEnum(date: Date): Weekday {
  // returns "MON"..."SUN"
  const map = ["SUN","MON","TUE","WED","THU","FRI","SAT"] as Weekday[];
  return map[date.getUTCDay()]; // JS 0=Sun
}

/**
 * GET /api/flights/search
 * Query params:
 * - from: origin airport code (string, required)
 * - to: destination airport code (string, required)
 * - date: ISO date (YYYY-MM-DD, optional) - if provided, filters by specific date
 *
 * Responses:
 * - 200: array of matching flight patterns with nextDepartureDate appended
 * - 400: missing/invalid params
 * - 500: internal error
 */
export async function GET(req: Request) {
  const requestId = generateRequestId();
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const dateStr = url.searchParams.get("date");

    if (!from || !to) {
      return badRequest("Missing query params: from and to are required", null, requestId);
    }

    // Build where clause - priority: find closest flights from origin to destination
    const whereClause: any = {
      origin: { code: from },
      destination: { code: to },
      active: true,
    };

    // If date is provided, filter by that specific date
    if (dateStr) {
      const searchDate = new Date(dateStr + "T00:00:00Z");
      if (isNaN(searchDate.getTime())) {
        return badRequest("Invalid date: expected format YYYY-MM-DD", null, requestId);
      }

      const weekday = toWeekdayEnum(searchDate);
      whereClause.OR = [
        {
          daysOfWeek: { has: weekday },
          startDate: { lte: searchDate },
          endDate: { gte: searchDate },
        },
        {
          startDate: { lte: searchDate },
          endDate: { gte: searchDate },
        },
      ];
    } else {
      // If no date, show all active patterns (will be sorted by nextDepartureDate)
      const now = new Date();
      whereClause.startDate = { lte: now };
      whereClause.endDate = { gte: now };
    }

    const patterns = await prisma.flightPattern.findMany({
      where: whereClause,
      include: { airline: true, origin: true, destination: true },
      orderBy: [
        { price: "asc" },
        { departureTime: "asc" }
      ],
    });

    // Add nextDepartureDate to each flight pattern
    // If a date is provided, use it as reference date for computing nextDepartureDate
    const patternsWithNextDeparture = withNextDepartureDates(patterns)
    // If date is provided, filter to only patterns that have a nextDepartureDate on that date
    let filteredPatterns = patternsWithNextDeparture;
    if (dateStr) {
      const searchDate = new Date(dateStr + "T00:00:00Z");
      filteredPatterns = patternsWithNextDeparture.filter((pattern) => {
        if (!pattern.nextDepartureDate) return false;
        const startDate = new Date(pattern.startDate);
        const endDate   = new Date(pattern.endDate);
        if(searchDate < startDate || searchDate > endDate) return false;
        const weekday = getWeekdayFromDate(searchDate);
        return pattern.daysOfWeek.includes(weekday);
      });
    }
    // Sort by nextDepartureDate (closest first), then by price
    const sortedPatterns = filteredPatterns.sort((a, b) => {
      if (a.nextDepartureDate && b.nextDepartureDate) {
        const dateA = new Date(a.nextDepartureDate).getTime();
        const dateB = new Date(b.nextDepartureDate).getTime();
        if (dateA !== dateB) return dateA - dateB;
      } else if (a.nextDepartureDate) return -1;
      else if (b.nextDepartureDate) return 1;
      
      const priceA = a.price ?? Infinity;
      const priceB = b.price ?? Infinity;
      return priceA - priceB;
    });
    return ok(sortedPatterns, requestId);
  } catch (err) {
    return internalError("Failed to search flights", (err as Error)?.message ?? null, requestId);
  }
}
