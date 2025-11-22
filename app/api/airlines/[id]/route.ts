import prisma from "@/lib/prisma";
import { AirlineSchema } from "@/lib/validations/airline";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const airline = await prisma.airline.findUnique({
    where: { id },
  });

  return Response.json(airline);
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json();
  const parsed = AirlineSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error), { status: 400 });
  }

  const airline = await prisma.airline.update({
    where: { id },
    data: parsed.data,
  });

  return Response.json(airline);
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await prisma.airline.delete({
    where: { id },
  });

  return Response.json({ success: true });
}
