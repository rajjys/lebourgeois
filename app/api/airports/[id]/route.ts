import prisma from "@/lib/prisma";
import { AirportSchema } from "@/lib/validations/airport";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // 👈 await here

  const airport = await prisma.airport.findUnique({
    where: { id },
  });

  return Response.json(airport);
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json();
  const parsed = AirportSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error), { status: 400 });
  }

  const airport = await prisma.airport.update({
    where: { id },
    data: parsed.data,
  });

  return Response.json(airport);
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await prisma.airport.delete({
    where: { id },
  });

  return Response.json({ success: true });
}
