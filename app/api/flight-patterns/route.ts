import prisma from "@/lib/prisma";
import { FlightPatternSchema } from "@/lib/validations/flightPattern";

export async function GET() {
  const patterns = await prisma.flightPattern.findMany({
    include: { airline: true, origin: true, destination: true },
    orderBy: { createdAt: "desc" },
  });
  return new Response(JSON.stringify(patterns), { status: 200 });
}
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = FlightPatternSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.format()), { status: 400 });
  }
  const data = parsed.data;
  const created = await prisma.flightPattern.create({
    data: {
      airlineId: data.airlineId,
      originId: data.originId,
      destinationId: data.destinationId,
      flightNumber: data.flightNumber,
      departureTime: data.departureTime,
      arrivalTime: data.arrivalTime,
      daysOfWeek: data.daysOfWeek ?? [],
      startDate: data.startDate,
      endDate: data.endDate,
      price: data.price,
      currency: data.currency,
      aircraft: data.aircraft,
      capacity: data.capacity,
      active: data.active ?? true,
    },
  });
  return new Response(JSON.stringify(created), { status: 201 });
}
