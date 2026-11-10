/**
 * Visit statistics (docs/ANALYTICS.md): source rules, first and last touch, periods, validation,
 * then storage, request attribution and the dashboard numbers against the local database, on
 * fixture rows dated January 2020 and removed afterwards.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";
import { classify, referrerHostOf, utmOf, type Touch, type TouchInput } from "../lib/analytics/channel";
import { advance, attributionOf, SESSION_TIMEOUT_MS, type VisitState } from "../lib/analytics/visit";
import { resolvePeriod } from "../lib/analytics/period";
import { BatchSchema, requestAttribution } from "../lib/analytics/server";
import type { Batch } from "../lib/analytics/events";

config({ path: [".env.local", ".env"], quiet: true });

const HOST = "lebourgeois.cd";
const none: TouchInput = { referrerHost: null, utmSource: null, utmMedium: null, utmCampaign: null, utmTerm: null, utmContent: null };
const from = (referrerHost: string | null, utm: Partial<TouchInput> = {}) => classify({ ...none, referrerHost, ...utm }, HOST);

test("no referrer and no tags is direct, never Google", () => {
  assert.equal(from(null), "direct");
});

test("referrers: search, AI, social, WhatsApp, e-mail, own site, other sites", () => {
  assert.equal(from("www.google.com"), "search");
  assert.equal(from("www.google.cd"), "search");
  assert.equal(from("www.google.co.uk"), "search");
  assert.equal(from("www.bing.com"), "search");
  assert.equal(from("com.google.android.googlequicksearchbox"), "search");
  assert.equal(from("gemini.google.com"), "ai");
  assert.equal(from("chatgpt.com"), "ai");
  assert.equal(from("www.perplexity.ai"), "ai");
  assert.equal(from("mail.google.com"), "email");
  assert.equal(from("l.facebook.com"), "social");
  assert.equal(from("t.co"), "social");
  assert.equal(from("com.whatsapp"), "whatsapp");
  assert.equal(from("web.whatsapp.com"), "whatsapp");
  assert.equal(from("lebourgeois.cd"), "internal");
  assert.equal(from("clerikaa.vercel.app"), "internal");
  assert.equal(from("lebourgeois-git-main-rajjys.vercel.app"), "internal");
  assert.equal(from("ss.ginksearch.com"), "referral"); // unknown engine: not guessed
  assert.equal(from("actualite.cd"), "referral");
});

test("UTM tags win over the referrer", () => {
  assert.equal(from(null, { utmSource: "whatsapp", utmMedium: "social" }), "whatsapp");
  assert.equal(from("l.facebook.com", { utmSource: "facebook", utmMedium: "cpc" }), "paid");
  assert.equal(from(null, { utmSource: "facebook" }), "social");
  assert.equal(from(null, { utmMedium: "newsletter" }), "email");
  assert.equal(from("www.google.com", { utmSource: "flyer", utmCampaign: "aeroport-ndjili" }), "campaign");
});

test("only the referrer's host is kept, and UTM values are trimmed", () => {
  assert.equal(referrerHostOf("https://www.google.com/search?q=prix+kinshasa+kalemie"), "www.google.com");
  assert.equal(referrerHostOf("android-app://com.whatsapp/"), "com.whatsapp");
  assert.equal(referrerHostOf(""), null);
  assert.equal(referrerHostOf("not a url"), null);
  assert.deepEqual(utmOf(new URLSearchParams("utm_source=%20whatsapp%20&utm_campaign=")), {
    utmSource: "whatsapp", utmMedium: null, utmCampaign: null, utmTerm: null, utmContent: null,
  });
});

describe("first and last touch", () => {
  let n = 0;
  const id = () => `id-${++n}`;
  const touch = (channel: Touch["channel"], extra: Partial<Touch> = {}): Touch => ({
    ...none, channel, landingPath: "/", at: "2026-11-10T10:00:00.000Z", ...extra,
  });
  const empty: VisitState = { visitorId: null, session: null, firstTouch: null, lastTouch: null };
  const t0 = Date.UTC(2026, 10, 10, 10);

  test("a direct return keeps Google as last touch; first touch never changes", () => {
    const google = touch("search", { referrerHost: "www.google.com" });
    const a = advance(empty, google, t0, id).state;
    assert.equal(a.session?.isNewVisitor, true);
    const b = advance(a, touch("direct"), t0 + SESSION_TIMEOUT_MS + 1, id);
    assert.equal(b.newSession, true);
    assert.equal(b.state.session?.isNewVisitor, false);
    assert.equal(b.state.visitorId, a.visitorId);
    assert.equal(b.state.firstTouch?.channel, "search");
    assert.equal(b.state.lastTouch?.channel, "search");
  });

  test("a known source later becomes last touch; first stays direct", () => {
    const a = advance(empty, touch("direct"), t0, id).state;
    assert.equal(a.lastTouch, null);
    const b = advance(a, touch("whatsapp", { utmSource: "whatsapp", utmCampaign: "groupe-lubumbashi" }), t0 + 60_000, id);
    assert.equal(b.newSession, true, "a new source starts a new visit even within 30 minutes");
    assert.equal(b.state.firstTouch?.channel, "direct");
    assert.equal(b.state.lastTouch?.utmCampaign, "groupe-lubumbashi");
  });

  test("pages inside one visit keep the session; 30 minutes idle ends it", () => {
    const a = advance(empty, touch("search", { referrerHost: "www.google.com" }), t0, id).state;
    const b = advance(a, null, t0 + 10 * 60_000, id);
    assert.equal(b.newSession, false);
    assert.equal(b.state.session?.id, a.session?.id);
    const c = advance(b.state, null, t0 + 10 * 60_000 + SESSION_TIMEOUT_MS, id);
    assert.equal(c.newSession, true);
    assert.equal(c.state.session?.touch.channel, "direct", "a visit that times out mid-page starts as direct");
    assert.equal(c.state.lastTouch?.channel, "search");
  });

  test("a reload from our own site is not a new source", () => {
    const a = advance(empty, touch("search", { referrerHost: "www.google.com" }), t0, id).state;
    const b = advance(a, touch("internal", { referrerHost: HOST }), t0 + 60_000, id);
    assert.equal(b.newSession, false);
  });

  test("a request carries both touches and the pages", () => {
    const a = advance(empty, touch("search", { referrerHost: "www.google.com", landingPath: "/vols/kinshasa-lubumbashi" }), t0, id).state;
    const r = attributionOf(a, "/vols/kinshasa-lubumbashi/caa");
    assert.equal(r?.landingPath, "/vols/kinshasa-lubumbashi");
    assert.equal(r?.conversionPath, "/vols/kinshasa-lubumbashi/caa");
    assert.equal(attributionOf(empty, "/"), null);
  });
});

test("periods: Kinshasa days, both ends included, the previous period just before", () => {
  const p = resolvePeriod({ periode: "7j" }, "2026-11-10");
  assert.deepEqual([p.from, p.to, p.days], ["2026-11-04", "2026-11-10", 7]);
  assert.equal(p.start.toISOString(), "2026-11-03T23:00:00.000Z"); // midnight in Kinshasa (UTC+1)
  assert.equal(p.end.toISOString(), "2026-11-10T23:00:00.000Z");
  assert.deepEqual([p.previous.from, p.previous.to], ["2026-10-28", "2026-11-03"]);
  const c = resolvePeriod({ periode: "dates", du: "2026-11-09", au: "2026-11-01" }, "2026-11-10");
  assert.deepEqual([c.from, c.to, c.days, c.previous.from], ["2026-11-01", "2026-11-09", 9, "2026-10-23"]);
  assert.equal(resolvePeriod({ periode: "nimporte" }, "2026-11-10").key, "7j");
  assert.equal(resolvePeriod({ periode: "dates", du: "2026-13-40", au: "x" }, "2026-11-10").key, "7j");
});

const batch = (over: Partial<Batch> = {}): Batch => ({
  visitorId: "visitor-test-0001",
  session: { id: "session-test-0001", isNewVisitor: true, landingPath: "/vols/kinshasa-lubumbashi", referrerHost: "www.google.com", utmSource: null, utmMedium: null, utmCampaign: null, utmTerm: null, utmContent: null },
  events: [{ id: "event-test-0001", name: "page_view", path: "/vols/kinshasa-lubumbashi", routeSlug: "kinshasa-lubumbashi" }],
  ...over,
});

test("the browser's batch is checked field by field", () => {
  assert.equal(BatchSchema.safeParse(batch()).success, true);
  assert.equal(BatchSchema.safeParse(batch({ events: [] })).success, false);
  const many = Array.from({ length: 21 }, (_, i) => ({ id: `event-many-${String(i).padStart(4, "0")}`, name: "page_view" as const, path: "/" }));
  assert.equal(BatchSchema.safeParse(batch({ events: many })).success, false, "at most 20 events");
  // The server writes the conversion itself; a browser cannot claim one.
  assert.equal(BatchSchema.safeParse(batch({ events: [{ id: "event-test-0002", name: "booking_request_submitted", path: "/" }] })).success, false);
  assert.equal(BatchSchema.safeParse(batch({ events: [{ id: "event-test-0003", name: "page_view", path: "https://evil.example/" }] })).success, false);
  assert.equal(BatchSchema.safeParse(batch({ visitorId: "x" })).success, false);
  assert.equal(BatchSchema.safeParse({ ...batch(), events: [{ id: "event-test-0004", name: "page_view", path: "/", props: { a: "x".repeat(101) } }] }).success, false);
});

test("device: a phone system without a device type is a phone (Opera Mini)", async () => {
  const { deviceOf } = await import("../lib/analytics/server");
  assert.equal(deviceOf("mobile"), "mobile");
  assert.equal(deviceOf("tablet", "Android"), "tablet");
  assert.equal(deviceOf(undefined, "Android"), "mobile");
  assert.equal(deviceOf(undefined, "Mac OS"), "desktop");
  assert.equal(deviceOf("smarttv"), "desktop");
});

test("a request with missing or broken attribution is still saved, as 'non mesurée'", () => {
  for (const raw of [undefined, null, "nonsense", { visitorId: "x" }]) {
    const r = requestAttribution(raw, HOST, "mobile");
    assert.equal(r.event, null);
    assert.equal(r.columns.firstChannel, null);
    assert.equal(r.columns.device, "mobile");
  }
  const t = { channel: "direct", referrerHost: "www.google.com", utmSource: null, utmMedium: null, utmCampaign: null, utmTerm: null, utmContent: null, landingPath: "/", at: "2026-11-10T10:00:00.000Z" };
  const ok = requestAttribution({ visitorId: "visitor-test-0001", sessionId: "session-test-0001", firstTouch: t, lastTouch: null, landingPath: "/", conversionPath: "/vols/a-b/caa" }, HOST, undefined);
  assert.equal(ok.columns.firstChannel, "search", "the server decides the channel again from the referrer, ignoring the browser's label");
  assert.equal(ok.columns.lastChannel, "search");
  assert.equal(ok.columns.device, "desktop");
});

const url = process.env.DATABASE_URL ?? "";
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url ? new URL(url).hostname : "");

describe("storage and dashboard numbers", { skip: isLocal ? false : "local database only" }, async () => {
  const { default: prisma } = await import("../lib/prisma");
  const { storeBatch, recordSubmitted } = await import("../lib/analytics/server");
  const { loadAnalytics } = await import("../lib/analytics/report");
  const PREFIX = "antest";
  const at = (iso: string) => new Date(iso);
  const visitor = { hostname: HOST, device: "mobile", browser: "Chrome", os: "Android", country: "CD" };
  const noFilter = { channel: null, campaign: null, route: null, device: null };
  let routeSlug = "";
  let routeId = "";

  const cleanup = async () => {
    await prisma.analyticsEvent.deleteMany({ where: { id: { startsWith: PREFIX } } });
    await prisma.analyticsEvent.deleteMany({ where: { sessionId: { startsWith: PREFIX } } });
    await prisma.analyticsSession.deleteMany({ where: { id: { startsWith: PREFIX } } });
    await prisma.request.deleteMany({ where: { clientName: `${PREFIX} fixture` } });
  };

  before(async () => {
    await cleanup();
    const route = await prisma.route.findFirstOrThrow({ orderBy: { slug: "asc" } });
    routeSlug = route.slug;
    routeId = route.id;
    const ev = (id: string, name: Batch["events"][number]["name"], extra: Partial<Batch["events"][number]> = {}) => ({ id: `${PREFIX}-${id}`, name, path: `/vols/${routeSlug}`, routeSlug, ...extra });
    const sess = (id: string, over: Partial<Batch["session"]> = {}) => ({ ...batch().session, id: `${PREFIX}-${id}`, ...over });
    // Visitor A: Google, two visits; route views, a search, a started and a sent request.
    await storeBatch(prisma, { visitorId: `${PREFIX}-va`, session: sess("s1"), events: [ev("e1", "page_view"), ev("e2", "route_view"), ev("e3", "flight_search")] }, visitor, at("2020-01-10T09:00:00Z"));
    await storeBatch(prisma, { visitorId: `${PREFIX}-va`, session: sess("s2", { isNewVisitor: false, referrerHost: null }), events: [ev("e4", "page_view"), ev("e5", "route_view"), ev("e6", "booking_request_started")] }, visitor, at("2020-01-11T09:00:00Z"));
    // Visitor B: WhatsApp campaign, one page, one WhatsApp click, on a desktop.
    await storeBatch(prisma, { visitorId: `${PREFIX}-vb`, session: sess("s3", { referrerHost: null, utmSource: "whatsapp", utmCampaign: "groupe-fbm" }), events: [ev("e7", "page_view", { routeSlug: null, path: "/" }), ev("e8", "whatsapp_click", { routeSlug: null, path: "/" })] }, { ...visitor, device: "desktop" }, at("2020-01-12T09:00:00Z"));
    // The same batch sent twice counts once.
    await storeBatch(prisma, { visitorId: `${PREFIX}-vb`, session: sess("s3", { referrerHost: null, utmSource: "whatsapp", utmCampaign: "groupe-fbm" }), events: [ev("e7", "page_view", { routeSlug: null, path: "/" })] }, { ...visitor, device: "desktop" }, at("2020-01-12T09:05:00Z"));
    // A's request (credited to Google) and one from before tracking.
    const tracked = requestAttribution({
      visitorId: `${PREFIX}-va`, sessionId: `${PREFIX}-s2`, landingPath: `/vols/${routeSlug}`, conversionPath: `/vols/${routeSlug}/caa`,
      firstTouch: { ...none, channel: "search", referrerHost: "www.google.com", landingPath: `/vols/${routeSlug}`, at: "2020-01-10T09:00:00.000Z" },
      lastTouch: { ...none, channel: "search", referrerHost: "www.google.com", landingPath: `/vols/${routeSlug}`, at: "2020-01-10T09:00:00.000Z" },
    }, HOST, "mobile");
    const base = { clientName: `${PREFIX} fixture`, flightNumber: "BU1611", originCity: "A", destinationCity: "B", travelDate: at("2020-02-01T00:00:00Z"), travelClass: "economy", travelers: 2, routeId };
    const r1 = await prisma.request.create({ data: { ...base, ...tracked.columns, status: "BOOKED", createdAt: at("2020-01-11T09:10:00Z") }, include: { route: { select: { slug: true } } } });
    await recordSubmitted(prisma, r1, tracked.event!);
    await prisma.analyticsEvent.update({ where: { id: `request-${r1.id}` }, data: { id: `${PREFIX}-request-${r1.id}`, occurredAt: at("2020-01-11T09:10:00Z") } });
    await prisma.request.create({ data: { ...base, createdAt: at("2020-01-12T10:00:00Z") } });
  });
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  const january = resolvePeriod({ periode: "dates", du: "2020-01-10", au: "2020-01-12" }, "2026-11-10");

  test("overview: visitors, sessions, page views, requests, bookings", async () => {
    const r = await loadAnalytics(prisma, january, noFilter);
    assert.equal(r.current.visitors, 2);
    assert.equal(r.current.newVisitors, 2);
    assert.equal(r.current.sessions, 3);
    assert.equal(r.current.pageViews, 3, "the batch sent twice was counted once");
    assert.equal(r.current.whatsapp, 1);
    assert.equal(r.current.requests, 2);
    assert.equal(r.current.booked, 1);
    assert.equal(r.current.requestsUnmeasured, 1);
    assert.equal(r.current.conversion, 1);
    assert.equal(r.previous.visitors, 0);
    assert.deepEqual(r.days.map((d) => d.day), ["2020-01-10", "2020-01-11", "2020-01-12"]);
    assert.deepEqual(r.days.map((d) => d.requests), [0, 1, 1]);
  });

  test("sources, funnel and routes", async () => {
    const r = await loadAnalytics(prisma, january, noFilter);
    assert.deepEqual(Object.fromEntries(r.channels.map((c) => [c.key, c.sessions])), { search: 1, direct: 1, whatsapp: 1 });
    assert.equal(r.requestsByLastChannel.get("search"), 1);
    assert.equal(r.requestsByLastChannel.get(null), 1, "the request from before tracking stays unmeasured");
    assert.deepEqual(r.funnel, { visitors: 2, routeViews: 1, searches: 1, started: 1, submitted: 1 });
    const route = r.routes.find((x) => x.slug === routeSlug);
    assert.deepEqual([route?.viewers, route?.views, route?.searches, route?.starts, route?.requests], [1, 2, 1, 1, 2]);
    assert.equal(r.campaigns[0]?.campaign, "groupe-fbm");
  });

  test("filters apply to visits and requests alike", async () => {
    const whatsapp = await loadAnalytics(prisma, january, { ...noFilter, channel: "whatsapp" });
    assert.deepEqual([whatsapp.current.visitors, whatsapp.current.requests], [1, 0]);
    const desktop = await loadAnalytics(prisma, january, { ...noFilter, device: "desktop" });
    assert.deepEqual([desktop.current.sessions, desktop.current.requests], [1, 0]);
    const route = await loadAnalytics(prisma, january, { ...noFilter, route: routeSlug });
    assert.deepEqual([route.current.sessions, route.current.requests], [2, 2]);
  });
});
