/**
 * The events the site records (docs/ANALYTICS.md §2). One list, used by the browser to send them,
 * the server to validate them and the dashboard to read them. No event carries a name, a phone
 * number or anything a visitor typed into a form.
 */
export const EVENT_NAMES = [
  "page_view", // every public page
  "route_view", // a route page, or one airline on a route (/vols/a-b, /vols/a-b/caa)
  "flight_search", // the search form was sent
  "flight_search_results_view", // the route page that answered a search
  "flight_option_view", // one airline on a route, with its departures (/vols/a-b/caa)
  "booking_request_started", // first touch of the booking form (or the phone sheet opened)
  "booking_request_submitted", // written by the server once the request is saved, never by the browser
  "booking_request_failed", // the browser could not send the request
  "whatsapp_click", // a link to wa.me
  "contact_click", // e-mail or phone link, or the contact form sent
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/** Events the browser may send; the submitted request is the server's to record. */
export const BROWSER_EVENTS = EVENT_NAMES.filter((n) => n !== "booking_request_submitted");

/** Optional facts about an event. Strings are short codes or slugs, never free text. */
export type EventFields = {
  routeSlug?: string | null;
  airline?: string | null;
  origin?: string | null;
  destination?: string | null;
  travelDate?: string | null;
  passengers?: number | null;
  props?: Record<string, string | number | boolean | null>;
};

export type BrowserEvent = EventFields & { id: string; name: EventName; path: string };

/** What the browser posts to /api/analytics: who, which visit, and up to 20 events. */
export type Batch = {
  visitorId: string;
  session: {
    id: string;
    isNewVisitor: boolean;
    landingPath: string;
    referrerHost: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmTerm: string | null;
    utmContent: string | null;
  };
  events: BrowserEvent[];
};

export const MAX_EVENTS_PER_BATCH = 20;
