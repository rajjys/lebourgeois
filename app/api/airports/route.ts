import prisma from "@/lib/prisma";
import { AirportSchema } from "@/lib/validations/airport";

export async function GET() {
  const airports = await prisma.airport.findMany({
    orderBy: { name: "asc" },
  });

  return Response.json(airports);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = AirportSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error), { status: 400 });
  }

  const airport = await prisma.airport.create({
    data: parsed.data,
  });

  return Response.json(airport);
}
