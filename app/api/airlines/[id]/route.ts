import prisma from "@/lib/prisma";
import { notFound, ok } from "../../utils/http";

export async function GET(_: Request, { params }: any) {
  const airline = await prisma.airline.findUnique({
    where: { id: params.id },
  });

  if (!airline) return notFound("Airline not found.");

  return ok(airline);
}

export async function PUT(request: Request, { params }: any) {
  const data = await request.json();

  try {
    const airline = await prisma.airline.update({
      where: { id: params.id },
      data,
    });
    return ok(airline);
  } catch {
    return notFound("Airline not found.");
  }
}

export async function DELETE(_: Request, { params }: any) {
  try {
    await prisma.airline.delete({
      where: { id: params.id },
    });
    return ok({ deleted: true });
  } catch {
    return notFound("Airline not found.");
  }
}
