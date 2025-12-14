import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const request = await prisma.request.create({
    data: {
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      clientPhone: body.clientPhone,
      prefersWhatsapp: body.prefersWhatsapp,
      flightNumber: body.flightNumber,
      originCity: body.originCity,
      destinationCity: body.destinationCity,
      travelDate: new Date(body.travelDate),
      travelClass: body.travelClass,
      travelers: body.travelers,
    },
  });

  return NextResponse.json(request);
}
