import prisma from "@/lib/prisma";
import { notFound, ok } from "../../utils/http";

export async function GET(_: Request, { params }: any) {
  const pattern = await prisma.flightPattern.findUnique({
    where: { id: Number(params.id) },
    include: {
      airline: true,
      origin: true,
      destination: true,
    },
  });

  if (!pattern) return notFound("Flight pattern not found.");

  return ok(pattern);
}

export async function PUT(request: Request, { params }: any) {
  const data = await request.json();

  try {
    const pattern = await prisma.flightPattern.update({
      where: { id: Number(params.id) },
      data,
    });
    return ok(pattern);
  } catch {
    return notFound("Flight pattern not found.");
  }
}

export async function DELETE(_: Request, { params }: any) {
  try {
    await prisma.flightPattern.delete({
      where: { id: Number(params.id) },
    });
    return ok({ deleted: true });
  } catch {
    return notFound("Flight pattern not found.");
  }
}
