import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth/session";

/**
 * POST /api/auth/logout - clears the session cookie and returns to /login.
 */
export async function POST(req: NextRequest) {
  await deleteSession();
  return NextResponse.redirect(new URL("/login", req.url), 303);
}
