# Visit statistics and request attribution

> **Status:** AN-1 (collection), AN-2 (dashboard) and AN-3 (request outcomes) built on 2026-11-10; AN-5 (dashboard redesign) the same day. Plan items in [PLAN.md](PLAN.md#stage-6-capture).
> **Owner's brief (2026-11-10):** know where visitors come from, what they look at, which routes bring requests, and whether requests become bookings, from real data. Keep it basic and useful. Leave the domains alone.

**Contents**
1. [What is measured, and what is not](#1-what-is-measured-and-what-is-not)
2. [Events](#2-events)
3. [Sources and attribution](#3-sources-and-attribution)
4. [Booking requests](#4-booking-requests)
5. [The dashboard](#5-the-dashboard)
6. [Privacy and abuse](#6-privacy-and-abuse)
7. [Known limits](#7-known-limits)
8. [Checking that it works](#8-checking-that-it-works)
9. [Tagging the links we share (UTM)](#9-tagging-the-links-we-share-utm)
10. [Files](#10-files)

---

## 1. What is measured, and what is not

Our own, first-party statistics, stored in our database next to the requests. No analytics vendor, no cookie, no fingerprinting.

| Measured | Not measured |
|---|---|
| Public pages viewed, per visit | The back office and the login page |
| Where a visit came from (referrer host, UTM tags) | The referrer's page or query (search words) |
| Device type, browser, operating system | Screen size, fonts, anything used for fingerprinting |
| Country, from the host's IP lookup | The IP address itself |
| Searches, route and airline pages, booking form started / sent / failed, WhatsApp, e-mail and phone links | Names, phone numbers, anything typed into a form |

**Not counted:** a browser signed in to the back office; bots and headless browsers; browsers sending *Global Privacy Control* or *Do Not Track*; a phone where `?stats=off` was opened once (the team's own phones; `?stats=on` reverts it).

**Vercel Web Analytics** stays on, on public pages only (until 2026-11-10 it also counted `/dashboard` and `/login`, i.e. the team). Its numbers will not match ours exactly: different rules for visitors, bots and blocked scripts.

## 2. Events

One table, `AnalyticsEvent`; names in `lib/analytics/events.ts`. Each event belongs to a visit (`sessionId`) and a browser (`visitorId`), with the page path (no query string).

| Event | When | Extra fields |
|---|---|---|
| `page_view` | every public page | route, airline (on `/vols/...` pages) |
| `route_view` | a route page or one airline on it (`/vols/a-b`, `/vols/a-b/caa`) | route, airline, `?date=` |
| `flight_search` | the search form is sent | origin, destination (airport codes), route, date |
| `flight_search_results_view` | the route page reached from that search | route, date |
| `flight_option_view` | one airline on a route, with its departures | route, airline, date, `?heure=` |
| `booking_request_started` | first touch of the booking form (on phones, opening it) | route, airline, origin, destination, date |
| `booking_request_submitted` | **written by the server** once the request is saved | route, airline, date, passengers |
| `booking_request_failed` | the browser could not send the request | route, airline, passengers |
| `whatsapp_click` | any `wa.me` link (navbar, footer, contact, about) | placement: header, footer or main |
| `contact_click` | `mailto:` or `tel:` link, or the contact form sent | kind: email, phone or form |

**No double counting:** each event has a random id made in the browser; a batch sent twice is stored once. A page is counted once per address (React's double rendering and re-renders do not add views). A failed request is never a conversion: conversions are rows in `Request`.

**Sending:** events wait in the page and leave in batches of up to 20, three seconds after the first one, or at once when the page is hidden or a WhatsApp/e-mail/phone link is followed (`sendBeacon`). Nothing waits for the answer.

## 3. Sources and attribution

**A visit** starts on the first page and ends after **30 minutes** without activity. Arriving again through a *different known source* (another campaign link, a Google result) starts a new visit even within 30 minutes.

**A visit's source** (`lib/analytics/channel.ts`), decided again by the server from the raw facts:
1. **UTM tags first**: someone tagged the link on purpose. `utm_source`/`utm_medium` containing *whatsapp* → WhatsApp; `cpc`, `paid`… → paid; `email`/`newsletter` → e-mail; `social` or a social network as source → social; anything else tagged → "Lien tagué (UTM)".
2. **Then the referrer's host**: search engines (Google in every country, Bing, DuckDuckGo…), AI assistants (ChatGPT, Perplexity, Gemini, Copilot, Claude…), social networks, WhatsApp, webmail, our own addresses (internal), any other site (referral). An unknown engine (e.g. `ss.ginksearch.com`) is a referral: **we do not guess**.
3. **Nothing at all → "Direct / inconnu".** The browser did not say where the visitor came from: typed address, bookmark, or an app that hides the link's origin (WhatsApp usually does). **It is never counted as Google.**

**First touch:** how this browser first arrived. Never replaced.
**Last touch:** the latest arrival with a known source. **A direct visit never replaces it**: a traveller who found us on Google and returns by typing the address still counts for Google.

Both are kept in the browser (`localStorage`, key `clerikaa.visit`), so they survive between visits on the same phone, and travel with a booking request.

**Domains:** `lebourgeois.cd`, `clerikaa.vercel.app` and `lebourgeois.vercel.app` all serve the site, with no redirect (owner, 2026-11-10: leave them alone). Each visit records its address (dashboard: *Adresse du site*). Moving from one to another is "internal", never a new source; but browsers keep storage per address, so **the same person on two addresses counts as two visitors**.

## 4. Booking requests

Sent with each request (`requestAttribution()` in `lib/analytics/browser.ts`): visitor and visit ids, first and last touch, landing page, the page the request was sent from, the airline. The server:
- re-checks every field and decides the channels again; **anything missing or malformed gives nulls, and the request is saved anyway**;
- stores `visitorId`, `sessionId`, `firstChannel`, `lastChannel`, `device` and `attribution` (JSON) on the request;
- records `booking_request_submitted` **after** answering the browser (`after()`), so the traveller never waits for statistics.

Requests made before 2026-11-10, or from a browser that keeps nothing, have null attribution: shown as **"Non mesurée"**. Nothing was back-filled or guessed.

**Outcomes (AN-3):** a request's status is set in the back office (*Demandes → a request → Suivi*): Nouvelle → Voyageur rappelé → **Réservée (billet émis)** or **Sans suite**. "Réservée" is what the dashboard counts as a booking. Each change is in the change log.

## 5. The dashboard

`/dashboard/analytics` (*Statistiques* in the sidebar), server-rendered, admin only. Redesigned in AN-5 (2026-11-10) so the team needs no other tool for day-to-day questions.

**Header:** title, **visitors online** (active in the last 30 minutes), the period and what it is compared with, "Comment c'est compté" (the definitions, one click away), and one line of controls:
- **Period:** Aujourd'hui (hour by hour), 7 j, 30 j, 90 j, or **Dates** (a range calendar, a year at most). Kinshasa days (UTC+1).
- **Filtres:** one button opening source, campaign, route and device. Active filters show as chips that remove themselves ("Tout effacer" for several). A click on a source, a route or a device in any list filters the page too.
- Everything is in the address (`?periode=`, `du`, `au`, `source`, `campagne`, `trajet`, `appareil`, `vue`): a view can be bookmarked or shared.

**Comparison:** the same number of days just before. A period that ends **today** is compared up to the same time (today until 20:15 against yesterday until 20:15), not with a whole day; the chart still draws the previous period in full, and today's hours not yet reached are left empty.

**Five views** (tabs):
| View | What it holds |
|---|---|
| Vue d'ensemble | Six headline figures that also choose the chart (visitors, visits, page views, bounce rate, average visit, requests), each with its change and the previous value; the chart with the previous period in grey; request rate, bookings, WhatsApp clicks, pages per visit; top sources, top routes, the visitors' path, devices, countries; the latest requests |
| Acquisition | Sources (visitors, visits, bounce, requests by last and first source, bookings, rate), referring sites, UTM campaigns with their requests, new and returning visitors, site addresses |
| Trajets et pages | Routes (visitors, page views, searches, requests started, requests, bookings, rate), airlines (CAA, Air Congo…), **demand we do not cover** (searched routes with no published airline), most frequent searches, entry pages (visits, bounce, requests), most viewed pages with readable names |
| Demandes | Requests, bookings, booking rate, request rate, forms started, send failures, unmeasured requests; the path; requests by status and by source; contact clicks (WhatsApp by place, e-mail, phone, contact form); the latest requests |
| Audience | Devices (with requests), new and returning, countries, browsers, systems, site addresses |

| Figure | Definition |
|---|---|
| Visiteurs | distinct `visitorId` among visits started in the period |
| Visites | visits started in the period |
| Pages vues | `page_view` events of those visits |
| Taux de rebond | visits with one page view **and nothing done** (no search, booking form, WhatsApp or contact click), as GA4 counts engagement |
| Durée moyenne | last activity − arrival, averaged over visits. The time spent on a visit's last page is unknown, so it reads short, as in every analytics tool |
| En ligne | visitors with activity in the last 30 minutes (not filtered) |
| Nouveaux / connus | first visit on this browser / already came with it |
| Demandes | rows in `Request` created in the period: complete, measured or not |
| Réservées | of those, status "Réservée" |
| Clics WhatsApp | `whatsapp_click` events, and how many visitors made them |
| Taux de demande | requests ÷ visitors. Unmeasured requests count in the numerator, so it can read slightly high |
| Parcours | visitors who reached each step, **not necessarily in order** (most arrive from Google straight on a route page); the drop from the step before is shown |
| Trajets | visitors who saw the route or one of its airlines, page views, searches, requests started, requests (all, from `Request`) |
| Compagnies | visitors of the airline's pages; requests by the airline code at the start of the request's flight number (`BU…` CAA, `4H…` Air Congo) |
| Demande non couverte | searched pairs with no published airline on that route |
| Pages d'entrée | first page of each visit; "Demandes" = visits that sent a request |

Queries: `lib/analytics/report.ts` (plain SQL on indexed columns; at a few hundred visitors a week no summary tables are needed). Interface: `components/backoffice/analytics/`.

**Not here, and why:** search queries and Google rankings (Search Console, F-5: Google does not pass search words to sites); page speed (Vercel Speed Insights, not set up). Vercel Web Analytics stays on as a cross-check.

**Demo data (local only):** `npx tsx scripts/seed-dev-analytics.ts` fills the local database with 90 days of invented visits and requests (ids `demo-…`, requests named "DÉMO statistiques") to review the page; `--clear` removes them. It refuses any database that is not local.

## 6. Privacy and abuse

- **Anonymous:** two random ids in the visitor's browser, no cookie. No name, phone, e-mail or free text in any event; the request's own fields stay in `Request` as before.
- **No IP stored:** the country comes from Vercel's `x-vercel-ip-country` header. The rate limiter holds the address in memory for a minute.
- **Referrer:** the host only; paths and queries can carry search words or personal data.
- **Respecting refusals:** Global Privacy Control and Do Not Track turn collection off entirely. Ad blockers are **not** worked around: the endpoint is plainly `/api/analytics`.
- **Public notice:** one line on `/about` (*Nos limites*), French and English.
- **The endpoint** (`app/api/analytics/route.ts`): same-origin only (`Origin`/`Sec-Fetch-Site`), 16 KB at most, every field validated (lengths, formats, at most 20 events and 8 properties), the browser cannot send `booking_request_submitted`, bots and headless browsers ignored, signed-in admins ignored, 60 batches a minute per address and server instance. It always answers quickly and never with an error body.
- **Who sees the data:** the dashboard and the request page are behind the admin login (proxy and page both check).
- **Legal:** the DRC's rules on this (Code du numérique, 2023) were not checked by us. The design keeps to what is needed; a lawyer should confirm before advertising campaigns.

## 7. Known limits

| Limit | Effect |
|---|---|
| Ad blockers and privacy settings | Their visits are missing. Their requests still count (from `Request`), as "Non mesurée" if the browser kept nothing. |
| WhatsApp, Facebook and other in-app browsers | Often send no referrer: untagged shares land in "Direct / inconnu". **Tag the links we share** (§9). |
| Safari (iPhone) | Clears storage written by scripts after 7 days without a visit: a returning visitor can look new, and lose first touch. |
| Private browsing, cleared storage | Each visit looks like a new visitor. |
| Several addresses (`lebourgeois.cd`, `*.vercel.app`) | One person on two addresses = two visitors. |
| Country | IP-based. Opera Mini (extreme mode) and VPNs show their servers' country. Missing locally. |
| Several devices | A phone and a laptop are two visitors; nothing links them (on purpose). |
| Server instances | The rate limit is per instance, so best effort. |
| History | Visits start on the deployment day. Earlier requests stay "Non mesurée". |

## 8. Checking that it works

After a deployment:
1. In a private window, open `https://lebourgeois.cd/vols/kinshasa-lubumbashi?utm_source=test&utm_campaign=verification`. Open one airline from the page, click the WhatsApp number in the footer.
2. Wait 10 seconds, sign in, open *Statistiques*, period *Aujourd'hui*: one more visitor; source "Lien tagué (UTM)"; campaign `verification`; the route in *Trajets*.
3. Booking request (only if you want a test row): send one from the airline page, open it in *Demandes*. *Suivi* should show "Lien tagué (UTM) (test / verification)", the landing page and the airline page. Delete it afterwards.
4. Signed in, browse a public page: it must **not** add a visitor.
5. Your phones: open any page once with `?stats=off`.

Browser checks (DevTools → Network): `POST /api/analytics` answers **204**; `localStorage["clerikaa.visit"]` holds the ids and touches.

Automated: `npm test` (`tests/analytics.test.ts`: source rules, first/last touch, periods, validation, and storage, attribution and dashboard numbers on the local database).

## 9. Tagging the links we share (UTM)

Add tags to every link the team posts, so the visit and any request are credited correctly:

```
https://lebourgeois.cd/vols/lubumbashi-kalemie?utm_source=whatsapp&utm_medium=social&utm_campaign=groupe-lubumbashi
```

| Where | `utm_source` | `utm_medium` | `utm_campaign` |
|---|---|---|---|
| WhatsApp group or status | `whatsapp` | `social` | the group or the post, e.g. `groupe-lubumbashi` |
| Facebook page post | `facebook` | `social` | the post, e.g. `kalemie-nov` |
| Paid post or ad | `facebook` (or other) | `cpc` | the campaign |
| E-mail to a partner | `email` | `email` | the partner |
| Flyer, poster, QR code | `flyer` | `print` | the place, e.g. `aeroport-ndjili` |

Lower case, hyphens, no spaces. The dashboard's *Campagnes* table and campaign filter read `utm_campaign`.

## 10. Files

| File | Role |
|---|---|
| `prisma/schema.prisma` | `AnalyticsSession`, `AnalyticsEvent`, the attribution columns on `Request`, status `BOOKED` |
| `lib/analytics/channel.ts` | source rules (shared by browser and server) |
| `lib/analytics/visit.ts` | visits, first and last touch (pure) |
| `lib/analytics/browser.ts` | ids, queue, `track()`, `requestAttribution()` |
| `lib/analytics/events.ts` | event names and payload types |
| `lib/analytics/server.ts` | validation, storage, request attribution, rate limit |
| `lib/analytics/period.ts`, `report.ts` | dashboard periods and queries |
| `components/analytics/Tracker.tsx` | page views and contact links, in the public layout |
| `app/api/analytics/route.ts` | the collection endpoint |
| `app/(app)/dashboard/analytics/page.tsx`, `components/backoffice/AnalyticsView.tsx` | the dashboard |
| `components/backoffice/RequestFollowUp.tsx`, `PATCH /api/requests/[id]` | request status and source |

No new environment variable. The migration runs on deploy like the others.
