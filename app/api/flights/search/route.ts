import { Weekday } from "@/lib/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { badRequest, ok, internalError, generateRequestId } from "@/app/api/utils/http";
import { withNextDepartureDates } from "@/lib/flightPatterns/nextDeparture";
import { getWeekdayFromDate } from "@/lib/utils/datetime-utils";
import { Prisma } from "@/lib/generated/prisma/client";

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
    const whereClause: Prisma.FlightPatternWhereInput = {
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
      // If searchDate is provided, prioritize flights on that date
      if (dateStr) {
        const searchDate = new Date(dateStr + "T00:00:00Z");

        const dateA = a.nextDepartureDate ? new Date(a.nextDepartureDate) : null;
        const dateB = b.nextDepartureDate ? new Date(b.nextDepartureDate) : null;

        // Normalize to same calendar day
        const isSameDayA = dateA && dateA.toDateString() === searchDate.toDateString();
        const isSameDayB = dateB && dateB.toDateString() === searchDate.toDateString();

        if (isSameDayA && !isSameDayB) return -1;
        if (!isSameDayA && isSameDayB) return 1;

        if (isSameDayA && isSameDayB) {
          // Both on searchDate → sort by time then price
          const timeDiff = dateA.getTime() - dateB.getTime();
          if (timeDiff !== 0) return timeDiff;

          const priceA = a.price ?? Infinity;
          const priceB = b.price ?? Infinity;
          return priceA - priceB;
        }
        // If neither is on searchDate, fall back to global logic below
      }

      // Default global sort (soonest overall, then price)
      if (!a.nextDepartureDate && !b.nextDepartureDate) return 0;
      if (!a.nextDepartureDate) return 1;
      if (!b.nextDepartureDate) return -1;

      // Compare by nextDepartureDate
      const diff =
        new Date(a.nextDepartureDate).getTime() -
        new Date(b.nextDepartureDate).getTime();

      if (diff !== 0) return diff;

      // If equal, compare by price (cheapest first)
      // Assuming you have a numeric field like `a.price` or `a.basePrice`
      const priceA = a.price ?? Infinity;
      const priceB = b.price ?? Infinity;
      return priceA - priceB;
    });
    return ok(sortedPatterns, requestId);
  } catch (err) {
    return internalError("Failed to search flights", (err as Error)?.message ?? null, requestId);
  }
}
