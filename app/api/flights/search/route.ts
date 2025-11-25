import { Weekday } from "@/lib/generated/prisma/enums";
import prisma from "@/lib/prisma";

function toWeekdayEnum(date: Date): Weekday {
  // returns "MON"..."SUN"
  const map = ["SUN","MON","TUE","WED","THU","FRI","SAT"] as Weekday[];
  return map[date.getUTCDay()]; // JS 0=Sun
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const dateStr = url.searchParams.get("date");

  if (!from || !to || !dateStr) {
    return new Response(JSON.stringify({ error: "Missing query params from,to,date" }), { status: 400 });
  }

  const searchDate = new Date(dateStr + "T00:00:00Z");
  if (isNaN(searchDate.getTime())) {
    return new Response(JSON.stringify({ error: "Invalid date" }), { status: 400 });
  }

  const weekday = toWeekdayEnum(searchDate); // e.g. "WED"

  // Search:
  // - patterns where daysOfWeek contains this weekday AND startDate <= date <= endDate
  // - OR patterns marked isOneOff with startDate == date (single run)
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

  return new Response(JSON.stringify(patterns), { status: 200 });
}
