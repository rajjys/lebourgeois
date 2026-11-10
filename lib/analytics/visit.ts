/**
 * Visits and attribution, as the browser keeps them (docs/ANALYTICS.md §3). Pure: the browser
 * code (lib/analytics/browser.ts) stores the state; the rules live here so they can be tested.
 *
 * - A session ends after 30 minutes without activity, or when the visitor arrives again through a
 *   different known source (a new campaign link, a Google result…) while one is open.
 * - First touch: how this browser first arrived. Never replaced.
 * - Last touch: the latest arrival with a known source. A direct visit never replaces it, so a
 *   visitor who found us on Google and comes back by typing the address still counts for Google.
 */
import { isKnownSource, type Touch } from "./channel";

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export type SessionState = { id: string; startedAt: number; lastSeen: number; isNewVisitor: boolean; touch: Touch };

export type VisitState = {
  visitorId: string | null;
  session: SessionState | null;
  firstTouch: Touch | null;
  lastTouch: Touch | null;
};

const sameSource = (a: Touch, b: Touch) =>
  a.channel === b.channel &&
  a.referrerHost === b.referrerHost &&
  a.utmSource === b.utmSource &&
  a.utmMedium === b.utmMedium &&
  a.utmCampaign === b.utmCampaign;

/**
 * The state after an arrival or a page change.
 * `arrival`: what the page load says (referrer and tags) when this is a full page load; null for a
 * navigation inside the site, which carries no new information about the source.
 */
export function advance(
  state: VisitState,
  arrival: Touch | null,
  now: number,
  newId: () => string,
): { state: VisitState; newSession: boolean } {
  const visitorId = state.visitorId ?? newId();
  const isNewVisitor = state.visitorId === null;
  const open = state.session && now - state.session.lastSeen < SESSION_TIMEOUT_MS ? state.session : null;
  const changedSource = !!(open && arrival && isKnownSource(arrival.channel) && !sameSource(arrival, open.touch));

  if (open && !changedSource) {
    return { state: { ...state, visitorId, session: { ...open, lastSeen: now } }, newSession: false };
  }

  // A session that times out during a visit (no page load) starts as direct: nothing new is known.
  const touch: Touch = arrival ?? {
    channel: "direct", referrerHost: null, utmSource: null, utmMedium: null, utmCampaign: null, utmTerm: null, utmContent: null,
    landingPath: state.session?.touch.landingPath ?? "/", at: new Date(now).toISOString(),
  };
  const session: SessionState = { id: newId(), startedAt: now, lastSeen: now, isNewVisitor, touch };
  return {
    state: {
      visitorId,
      session,
      firstTouch: state.firstTouch ?? touch,
      lastTouch: isKnownSource(touch.channel) ? touch : state.lastTouch,
    },
    newSession: true,
  };
}

/** What a booking request carries, so it can be credited to a source. */
export type RequestAttribution = {
  visitorId: string;
  sessionId: string;
  firstTouch: Touch;
  lastTouch: Touch | null; // null: no known source yet (only direct visits)
  landingPath: string; // the session's first page
  conversionPath: string; // the page the request was sent from
};

export function attributionOf(state: VisitState, conversionPath: string): RequestAttribution | null {
  if (!state.visitorId || !state.session || !state.firstTouch) return null;
  return {
    visitorId: state.visitorId,
    sessionId: state.session.id,
    firstTouch: state.firstTouch,
    lastTouch: state.lastTouch,
    landingPath: state.session.touch.landingPath,
    conversionPath,
  };
}
