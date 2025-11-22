import prisma from "@/lib/prisma";
import { AirlineSchema } from "@/lib/validations/airline";

export async function GET() {
  const airlines = await prisma.airline.findMany({
    orderBy: { name: "asc" },
  });

  return Response.json(airlines);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = AirlineSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error), { status: 400 });
  }

  const airline = await prisma.airline.create({
    data: parsed.data,
  });

  return Response.json(airline);
}
