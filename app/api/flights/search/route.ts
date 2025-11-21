import prisma from "@/lib/prisma";
import { badRequest, ok } from "../../utils/http";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const date = searchParams.get("date");

  if (!from || !to || !date) {
    return badRequest("Missing query params: from, to, date");
  }

  const searchDate = new Date(date);
  const dayOfWeek = ((searchDate.getUTCDay() + 6) % 7) + 1;
  // Converts JS Sunday=0 → 7

  const flights = await prisma.flightPattern.findMany({
    where: {
      origin: { code: from },
      destination: { code: to },
      startDate: { lte: searchDate },
      endDate: { gte: searchDate },
      daysOfWeek: { has: dayOfWeek },
      active: true,
    },
    include: {
      airline: true,
      origin: true,
      destination: true,
    },
  });

  return ok(flights);
}
