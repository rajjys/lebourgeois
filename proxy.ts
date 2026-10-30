import { NextRequest, NextResponse } from "next/server";
import { decryptSession, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Optimistic auth checks only. Every protected route handler and the dashboard
 * layout verify the session again, so a proxy bypass does not open anything.
 */

// Write endpoints the public is allowed to call.
const PUBLIC_WRITES = new Set(["POST /api/requests", "POST /api/auth/login", "POST /api/auth/logout"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await decryptSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/dashboard")) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const isRead = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
  const isPrivateRead = pathname.startsWith("/api/requests");
  const isPublicWrite = PUBLIC_WRITES.has(`${req.method} ${pathname}`);

  if ((isRead && isPrivateRead) || (!isRead && !isPublicWrite)) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
