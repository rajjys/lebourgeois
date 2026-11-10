import { NextRequest, userAgent } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { BatchSchema, deviceOf, storeBatch, withinRate } from "@/lib/analytics/server";

/**
 * POST /api/analytics: visit statistics from the site's own pages (docs/ANALYTICS.md).
 * Public, so it trusts nothing: same-origin only, 16 KB at most, validated field by field, bots and
 * signed-in admins ignored, a per-address rate limit. The browser does not wait for the answer;
 * nothing here can affect what a visitor sees.
 */
const MAX_BYTES = 16_000;
const done = (status = 204) => new Response(null, { status });

function sameOrigin(req: NextRequest) {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === req.headers.get("host");
    } catch {
      return false;
    }
  }
  return site === "same-origin";
}

export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return done(403);
    if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return done(413);
    const text = await req.text();
    if (text.length > MAX_BYTES) return done(413);

    const ua = userAgent(req);
    // Bots, scripts (curl, python…: no browser name) and headless browsers, which Next's list misses.
    if (ua.isBot || !ua.browser.name || /HeadlessChrome|Lighthouse|PhantomJS|puppeteer|playwright/i.test(ua.ua)) return done();
    // The team's own browsing, signed in to the back office, is not a visitor.
    if (await getSession()) return done();
    const address = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!withinRate(address)) return done(429);

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return done(400);
    }
    const parsed = BatchSchema.safeParse(body);
    if (!parsed.success) return done(400);

    await storeBatch(prisma, parsed.data as Parameters<typeof storeBatch>[1], {
      hostname: (req.headers.get("host") ?? "unknown").toLowerCase(),
      device: deviceOf(ua.device.type, ua.os.name),
      browser: ua.browser.name ?? null,
      os: ua.os.name ?? null,
      // Vercel's own IP lookup, country only. Missing locally and behind some proxies (Opera Mini).
      country: req.headers.get("x-vercel-ip-country")?.slice(0, 2) || null,
    });
    return done();
  } catch (err) {
    console.error("[analytics] batch not stored:", (err as Error)?.message);
    return done();
  }
}
