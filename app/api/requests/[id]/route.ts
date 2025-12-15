import { NextRequest } from "next/server";
import { notFound, internalError, generateRequestId, ok } from "../../utils/http";
import prisma from "@/lib/prisma";

/**
 * GET /api/requests/[id] - Get a single request by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const { id } = await params;

  try {
    const request = await prisma.request.findUnique({
      where: { id },
    });

    if (!request) {
      return notFound("Request not found", null, requestId);
    }

    return ok(request, requestId);
  } catch (err) {
    return internalError("Failed to fetch request", (err as Error)?.message ?? null, requestId);
  }
}

/**
 * DELETE /api/requests/[id] - Delete a request by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const { id } = await params;

  try {
    const existingRequest = await prisma.request.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return notFound("Request not found", null, requestId);
    }

    await prisma.request.delete({
      where: { id },
    });

    return ok({ success: true }, requestId);
  } catch (err) {
    return internalError("Failed to delete request", (err as Error)?.message ?? null, requestId);
  }
}