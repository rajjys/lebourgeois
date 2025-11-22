import prisma from "@/lib/prisma";
import { FlightPatternSchema } from "@/lib/validations/flightPattern";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const pattern = await prisma.flightPattern.findUnique({
    where: { id },
    include: { airline: true, origin: true, destination: true },
  });
  return new Response(JSON.stringify(pattern), { status: pattern ? 200 : 404 });
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json();
  const parsed = FlightPatternSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.format()), { status: 400 });
  }
  const data = parsed.data;

  try {
    const updated = await prisma.flightPattern.update({
      where: { id },
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
        price: Number(data.price),
        currency: data.currency,
        aircraft: data.aircraft,
        capacity: Number(data.capacity),
        durationInMin: Number(data.durationInMin),
        distanceInKm: Number(data.distanceInKm),
        active: data.active ?? true,
      },
    });
    return new Response(JSON.stringify(updated), { status: 200 });
  } catch (err) {
    return new Response("Not found", { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.flightPattern.delete({ where: { id } });
    return new Response(JSON.stringify({ deleted: true }), { status: 200 });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
