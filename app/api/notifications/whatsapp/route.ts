import prisma from "@/lib/prisma";
import { sendFlightRequestAlert } from "@/services/whatsapp";
import { NextResponse } from "next/server";

const TEAM_NUMBERS = [
  "243975092470",
  //"243973020687"
];

export async function POST(req: Request) {
  try {
    const { requestId } = await req.json();

    const request = await prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const results = [];

    for (const number of TEAM_NUMBERS) {
      const res = await sendFlightRequestAlert({
        to: number,
        payload: {
          clientName: request.clientName,
          departureCity: request.originCity,
          arrivalCity: request.destinationCity,
          travelDate: request.travelDate.toDateString(),
          clientPhone: request.clientPhone || undefined,
          clientEmail: request.clientEmail || undefined,
          requestId: request.id,
        },
      });

      results.push({ number, res });
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (err: unknown) {
      console.error("WhatsApp notification failed:", err);

      let message = "Unknown error";

      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      } else if (
        typeof err === "object" &&
        err !== null &&
        "message" in err
      ) {
        message = String((err as { message: unknown }).message);
      }

      return NextResponse.json(
        {
          error: "WhatsApp notification failed",
          details: message,
        },
        { status: 500 }
      );
    }
}

