import prisma from "@/lib/prisma";
import { badRequest, ok } from "../utils/http";

export async function POST(request: Request) {
  const data = await request.json();

  if (!data.name || !data.code) {
    return badRequest("Name and code are required.");
  }

  const airline = await prisma.airline.create({ data });
  return ok(airline);
}

export async function GET() {
  const airlines = await prisma.airline.findMany();
  return ok(airlines);
}
