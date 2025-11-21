import prisma from "@/lib/prisma";
import { badRequest, ok } from "../utils/http";

export async function POST(request: Request) {
  const data = await request.json();

  const required = [
    "airlineId",
    "originId",
    "destinationId",
    "flightNumber",
    "startDate",
    "endDate",
    "departureTime",
    "arrivalTime",
  ];

  for (const field of required) {
    if (!data[field]) return badRequest(`Missing field: ${field}`);
  }

  const pattern = await prisma.flightPattern.create({ data });
  return ok(pattern);
}

export async function GET() {
  const patterns = await prisma.flightPattern.findMany({
    include: {
      airline: true,
      origin: true,
      destination: true,
    },
  });

  return ok(patterns);
}
