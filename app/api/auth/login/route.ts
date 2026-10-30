import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

/**
 * POST /api/auth/login - plain HTML form post (email, password, next).
 * Redirects to `next` on success, back to /login?error=1 on failure.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = safeNextPath(String(form.get("next") ?? ""));

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const emailMatches = !!adminEmail && email === adminEmail;
  // Always run the hash check so timing does not reveal whether the email matched.
  const passwordMatches = await verifyPassword(password, process.env.ADMIN_PASSWORD_HASH);

  if (!emailMatches || !passwordMatches) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "1");
    if (next !== "/dashboard") url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  }

  await createSession(adminEmail);
  return NextResponse.redirect(new URL(next, req.url), 303);
}

// Only allow same-origin relative paths to avoid open redirects.
function safeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/dashboard";
  return value;
}
