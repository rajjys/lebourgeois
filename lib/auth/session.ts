import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/**
 * Admin session: a signed (HS256) JWT stored in an httpOnly cookie.
 * Interim single-admin gate until the user/role model lands with the V1 schema.
 * Fails closed: without AUTH_SECRET nothing verifies.
 */

export const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type Session = { sub: string; role: "admin" };

function getKey(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export async function encryptSession(session: Session): Promise<string> {
  const key = getKey();
  if (!key) throw new Error("AUTH_SECRET is missing or shorter than 32 characters");
  return new SignJWT({ role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);
}

export async function decryptSession(token: string | undefined): Promise<Session | null> {
  const key = getKey();
  if (!key || !token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (payload.role !== "admin" || typeof payload.sub !== "string") return null;
    return { sub: payload.sub, role: "admin" };
  } catch {
    return null;
  }
}

export async function createSession(sub: string) {
  const token = await encryptSession({ sub, role: "admin" });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  return decryptSession(cookieStore.get(SESSION_COOKIE)?.value);
}

/**
 * For route handlers: returns a 401 Response when the caller is not an admin,
 * or null when the request may proceed.
 */
export async function requireAdmin(): Promise<Response | null> {
  const session = await getSession();
  if (session) return null;
  return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
}
