/**
 * Visit statistics in the browser (docs/ANALYTICS.md). Anonymous: two random ids kept in this
 * browser's localStorage (visitor, session), first and last touch, nothing else. No cookie, no third
 * party, nothing typed into a form.
 *
 * Off when the browser asks not to be tracked (Global Privacy Control or Do Not Track), and on the
 * team's own phones after visiting any page with ?stats=off (?stats=on turns it back on).
 * Every storage or network failure is swallowed: statistics never break a page.
 */
import { classify, referrerHostOf, utmOf, type Touch } from "./channel";
import { MAX_EVENTS_PER_BATCH, type Batch, type BrowserEvent, type EventFields, type EventName } from "./events";
import { advance, attributionOf, type RequestAttribution, type VisitState } from "./visit";

const KEY = "clerikaa.visit";
const OFF_KEY = "clerikaa.stats-off";
const ENDPOINT = "/api/analytics";

const isBrowser = () => typeof window !== "undefined";

function read<T>(storage: () => Storage, key: string): T | null {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(storage: () => Storage, key: string, value: unknown) {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage full: this page load still counts, the next one starts over.
  }
}
const local = () => window.localStorage;
const session = () => window.sessionStorage;

export function newId() {
  try {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

let disabled: boolean | null = null;
/** Whether this browser is counted at all. Decided once per page load. */
export function isDisabled() {
  if (!isBrowser()) return true;
  if (disabled !== null) return disabled;
  const params = new URLSearchParams(window.location.search);
  if (params.get("stats") === "off") write(local, OFF_KEY, true);
  if (params.get("stats") === "on") write(local, OFF_KEY, null);
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  disabled = nav.globalPrivacyControl === true || nav.doNotTrack === "1" || read<boolean>(local, OFF_KEY) === true;
  return disabled;
}

let state: VisitState | null = null;
let booted = false;

/** The visit as of now: the first call of a page load reads the referrer and tags; later ones only keep the session alive. */
function currentVisit(): VisitState {
  const stored = state ?? read<VisitState>(local, KEY) ?? { visitorId: null, session: null, firstTouch: null, lastTouch: null };
  let arrival: Touch | null = null;
  if (!booted) {
    booted = true;
    const fields = { referrerHost: referrerHostOf(document.referrer), ...utmOf(new URLSearchParams(window.location.search)) };
    arrival = { ...fields, channel: classify(fields, window.location.host), landingPath: window.location.pathname, at: new Date().toISOString() };
  }
  state = advance(stored, arrival, Date.now(), newId).state;
  write(local, KEY, state);
  return state;
}

let queue: BrowserEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function send(useBeacon: boolean) {
  if (timer) clearTimeout(timer);
  timer = null;
  const visit = state;
  if (!visit?.visitorId || !visit.session || queue.length === 0) return;
  const t = visit.session.touch;
  while (queue.length) {
    const batch: Batch = {
      visitorId: visit.visitorId,
      session: {
        id: visit.session.id, isNewVisitor: visit.session.isNewVisitor, landingPath: t.landingPath, referrerHost: t.referrerHost,
        utmSource: t.utmSource, utmMedium: t.utmMedium, utmCampaign: t.utmCampaign, utmTerm: t.utmTerm, utmContent: t.utmContent,
      },
      events: queue.splice(0, MAX_EVENTS_PER_BATCH),
    };
    const body = JSON.stringify(batch);
    try {
      // text/plain: a simple request, accepted by sendBeacon everywhere; the server parses the JSON.
      if (useBeacon && navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "text/plain" }))) continue;
      void fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => {});
    } catch {
      // Blocked or offline: these events are lost, nothing else happens.
    }
  }
}

/** Sends what is waiting; `leaving` when the page may be closing (only a beacon survives that). */
export function flush(leaving = false) {
  if (!isBrowser() || isDisabled()) return;
  send(leaving);
}

/** Records one event. Sent in small batches a few seconds later, or when the page is hidden. */
export function track(name: EventName, fields: EventFields = {}) {
  if (!isBrowser() || isDisabled()) return;
  try {
    currentVisit();
    queue.push({ id: newId(), name, path: window.location.pathname.slice(0, 300), ...fields });
    if (!timer) timer = setTimeout(() => send(false), 3000);
  } catch {
    // Never let a statistic break the page.
  }
}

/** Sent with a booking request so it can be credited to a source; null when nothing is known. */
export function requestAttribution(extra: { airline?: string | null } = {}): (RequestAttribution & { airline?: string | null }) | null {
  if (!isBrowser() || isDisabled()) return null;
  try {
    const visit = attributionOf(currentVisit(), window.location.pathname);
    return visit && { ...visit, airline: extra.airline ?? null };
  } catch {
    return null;
  }
}

// A search sends the visitor to its route page; that page view is then a search result.
const SEARCH_KEY = "clerikaa.pending-search";
export function markSearch() {
  write(session, SEARCH_KEY, Date.now());
}
export function takeSearch() {
  const at = read<number>(session, SEARCH_KEY);
  write(session, SEARCH_KEY, null);
  return at !== null && Date.now() - at < 30_000;
}
