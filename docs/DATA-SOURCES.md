# Data sources, OAG/Cirium and airline partnerships

> **Status:** research and plan, 2026-10-30. Covers plan stage 1 ([PLAN.md](PLAN.md#stage-1-collect)).
> **Labels:** **[V]** verified on a primary page · **[I]** our inference · **[U]** unverified. All sources were accessed on 2026-10-30.
> **Direction (owner, 2026-10-30):**
> 1. **Manual collection first**, through the route workspace ([ROUTE-MODEL.md](ROUTE-MODEL.md)).
> 2. Then **partnerships with the airlines**: permission, data feeds, maybe an API.
> 3. Scraping is deprioritised as too risky.

**Contents**
1. [Where data comes from today](#1-where-data-comes-from-today)
2. [OAG and Cirium: can they help?](#2-oag-and-cirium-can-they-help)
3. [Cheaper schedule data vendors](#3-cheaper-schedule-data-vendors)
4. [The airlines: what they run and who decides](#4-the-airlines-what-they-run-and-who-decides)
5. [Partnership plan](#5-partnership-plan)
6. [Decisions](#6-decisions)
7. [Sources](#7-sources)

---

## 1. Where data comes from today

### The CAA timetable
- **Page:** https://www.caacongo.com/horaires.html. It contains no content of its own and immediately redirects (meta refresh) to the current PDF.
- **Current PDF:** https://www.caacongo.com/horaires-20-oct.pdf ("valid from 20/10/2026", last modified 26/10/2026, 72 KB). **The file name changes every week**, so always start from `horaires.html`.
- **Allowed:** CAA's robots.txt allows crawling, with a 10-second delay.
- **Technical note:** caacongo.com sends an incomplete HTTPS certificate chain (the intermediate certificate is missing). Browsers cope, but scripts fail unless the intermediate certificate is supplied. A future importer must handle this.
- **Cross-check:** BU 1611 Kinshasa → Lubumbashi 13:45 → 17:15 appears both in the PDF and on Cirium's FlightStats on 30–31 Oct [V].

### Source register
| Source | Gives | Allowed? | Use now |
|---|---|---|---|
| CAA weekly timetable PDF | Flight numbers, days, local times, block times, aircraft | ✅ robots allows | **Manual reference** for the route workspace. An importer (C-2) is paused. |
| Air Congo homepage "From USD" fares | Lowest advertised fare per destination | ✅ no robots.txt, no terms found | Manual reference (5 fares recorded as pending) |
| Air Congo / CAA booking engines | Live fares and seats | ❌ CAA's booking host: robots `Disallow: /`. Air Congo's: bot protection (Akamai, Imperva). | **Never automated.** A person may look things up like any traveller and record what they see, with the date. |
| Kin Avia regular schedule page | Kinshasa (N'Dolo) – Bandundu – Nioki, Monday to Saturday | ✅ public page | Possible later route (P3) |
| News and official notices (ACP, actualite.cd, Radio Okapi, RVA) | Airport and airline status | ✅ | Manual status updates |
| Travel agencies and phone calls | Prices, last-minute changes | ✅ with the agency's consent | Manual, source recorded as "agence (tél.)" |
| OAG / Cirium | Schedules | Paid; see [§2](#2-oag-and-cirium-can-they-help) | **Not now** |
| AeroDataBox and others | Schedules | Paid tiers allow commercial use; see [§3](#3-cheaper-schedule-data-vendors) | Optional cross-check |
| Amadeus Self-Service | n/a | ❌ shut down July 2026 | Rejected |
| Duffel | n/a | ❌ contract forbids metasearch | Rejected |

## 2. OAG and Cirium: can they help?

**Short answer: not now, and not for free.**
- Neither offers a free licence that allows showing their data on a public website.
- Neither allows reselling their data. A future product licensed to agencies (M8) could not contain their data without a negotiated contract.
- They become relevant **after revenue**, or as a paid source in the agency phase.

### OAG
| Product | What | Price | Can we publish it? |
|---|---|---|---|
| Flight Info API (schedules and status) | JSON API, "900+ airlines", schedules up to 12 months ahead [V] | **Free tier: 1,000 requests per 30 days** [V]. Paid: a fixed fee per usage tier plus a charge per request over the limit; prices not public [V]. | **No.** The developer terms (4 Sep 2026) limit use to "personal and/or internal business purposes", forbid copying the data into "a secondary database", and forbid redistribution [V]. |
| Flight Info trial | 14-day evaluation [V] | Free | No: "internal evaluation and testing"; display on any website is forbidden [V]. |
| Schedules files (SSIM) and Schedules Analyser | Industry-standard files or a web analysis tool [V] | Quote only [V] | Negotiated |
| Start-up Accelerator | "Free or heavily discounted access" [V] | | We don't qualify yet. It requires Seed to Series B funding, **or** bootstrapped with "£50K+ ARR, 10+ paying customers, or 20%+ MoM growth", with aviation data core to the product [V]. |
| Airfares dataset | Prices "only collected from airlines (websites or APIs)", 500+ airlines, delivered as files or through Snowflake [V] | Quote only | Aimed at airline revenue teams. DRC coverage unknown [U]. |

### Cirium (owner of FlightStats)
| Item | Details |
|---|---|
| Schedules API (FlightStats "Flex" APIs, being replaced by "Cirium Sky") | Future scheduled flights [V] |
| Evaluation | Free for 30 days, 20,000 requests in total [V] |
| Paid plan | Usage-based; **price not published** (needs a login) [V] |
| Can we publish it? | **Yes, on the paid plan**: "integrate the Cirium Data into your applications, for presentation to third-party users". It must show a **"Powered by Cirium"** logo, cache data for 3 days at most, and not resell it. Cirium can end the contract "for any reason, with or without notice" [V]. |

### Do they have our airlines?
**How airlines get in:** filing schedules with OAG and Cirium is **free for airlines** [V].

**Cirium has both airlines** [V]. FlightStats pages for 30–31 Oct 2026 show:
- **Kinshasa → Lubumbashi:**
  - CAA BU 1611 13:45 → 17:15
  - Air Congo ET 60 08:00 → 11:30 and ET 62 15:00 → 18:30
  - Serve Air S2 33/35 at 04:00
- **Kinshasa → Kisangani:** BU 1641, ET 70.
- **Kinshasa departures:** BU to Kindu, Kananga and Kolwezi; ET to Lubumbashi, Mbuji-Mayi, Kisangani and Muanda.

**OAG: not verified.** Its public flight tracker loads its data with JavaScript only, so the data could not be read. One request on OAG's free tier would settle it.

**Important:** Air Congo's domestic flights carry **Ethiopian (ET) flight numbers**, not its own 4H code. Our data model stores flight numbers as written ([ROUTE-MODEL.md §3](ROUTE-MODEL.md#3-what-the-real-data-looks-like)).

**Fares:** neither OAG's nor Cirium's schedule APIs include prices [V]. Published airline fares normally live with ATPCO, which holds fare data "from over 440 airlines" [V]. Whether CAA or Air Congo file there is unknown [U].

### What we can do with them for free, now
- Use OAG's free tier and Cirium's 30-day evaluation **internally**, to audit our own data (do our flights match what airlines filed?).
- **Never publish anything they return.**
- This is optional, and only worth it once the route workspace holds data to compare against.

## 3. Cheaper schedule data vendors

| Vendor | Free tier | Cheapest commercial plan | Future schedules | Can we show it publicly? | DRC evidence |
|---|---|---|---|---|---|
| **AeroDataBox** | 400 units/month, non-commercial, attribution required | **Pro about $7.50/month** (API.Market) | Yes, 180–365 days ahead depending on plan | Paid plans allow commercial use without attribution; no resale or raw republishing; 7-day cache by default [V] | Its coverage table: Kinshasa **68% of scheduled flights**, 0% live status [V] |
| Aviationstack | 100 requests/month, non-commercial | $49.99/month | Paid plans only; reportedly 1–7 days ahead [U] | Terms unclear [U] | None found |
| AirLabs | 1,000 requests/month, personal use | $49/month | Live schedules up to 10 hours ahead; a "routes" database on paid plans | Not found [U] | None found |
| FlightAware AeroAPI | Personal plan, no business use | $100/month minimum (consumer apps; no raw data) | Yes, per-result pricing | Attribution required | Could not check (blocked) |
| Flightradar24 API | Sandbox only | $9/month | **No schedule endpoints** | n/a | n/a |
| Aviation Edge | Limited | $299/month after the first month | Yes | Own applications only; no redistribution [V] | None found |

**Verdict:** the only one worth considering is **AeroDataBox Pro at about $7.50/month**, as a **cross-check** that flags flights we may have missed. It is not a primary source: 68% coverage, no live status, "best effort". Zero budget means **not now**; revisit at the first revenue (decision O-9).

## 4. The airlines: what they run and who decides

### CAA (Compagnie Africaine d'Aviation, IATA BU)
- **Reservation system: Videcom** [V]. CAA's own site links to its Videcom booking pages. It also has a travel-agency login (`agents.html`) [V].
- **What Videcom offers partners** [V]:
  - an **XML API** for "affiliate / distribution partners", for bookings and for "retrieving data where authorised"
  - **agent accounts**, each with its own commission, negotiated fares and credit limit
  - **The airline sets up both.** Videcom will not give access directly [V/I].
- **Distribution:** sold through **Hahn Air (X1)** since June 2023, which puts it in the major GDSs on Hahn Air tickets [V]. Not an IATA member [V].
- **Network:** the weekly timetable is the reliable source. The destinations page still lists Goma, which has been closed since January 2025 [V/I].
- **Who decides:**
  - The **Direction Commerciale** (Boulevard du 30 juin n°124, Gombe, Kinshasa) [V].
  - The published contact is a phone line and social accounts.
  - Third-party pages give info@caacongo.com [V] and dircom@caacongo.com [U].

### Air Congo (IATA 4H; domestic flights sold as ET)
- **4H is correct** [V]. Its domestic flights are sold under **Ethiopian (ET) flight numbers** [V/I].
- **Booking** runs on air-congo.com, built on Ethiopian's platform [V/I]. Ethiopian uses Sabre's reservation system [U].
- **Selling through agencies:**
  - The site sends "travel agencies and commercial partners" to **Ethiopian's partner portal** (partners.ethiopianairlines.com) [V].
  - That portal serves IATA, non-IATA and NDC agencies, and mentions commissions [V].
  - Not an IATA member in its own name [V].
- **Since 1 July 2026, domestic flights earn ShebaMiles** (Ethiopian's frequent-flyer programme) [V].
- **Contact:**
  - Head office at 70 Tilapia Batetela, Gombe.
  - **info@air-congo.com**.
  - A Commercial department line is listed on the site [V].
- **No affiliate programme of its own** [V]. Ethiopian has one through CJ Affiliate: 1.3% commission, 30-day cookie, bookings on ethiopianairlines.com only [V].

### Context
- **EU Air Safety List** (updated 9 Jun 2026): all DRC-certified airlines are banned from EU airspace [V]. This is irrelevant to domestic information, but a fact partners will know.
- **Congo Airways:** no flights since 12 Apr 2025; aiming to restart in November 2026 with no published schedule as of 22 Oct [V].

## 5. Partnership plan

Plan item **C-7**, starting once milestone M3 (route workspace) is done and at least 10 routes are live with fresh data (M4).

### What we ask for, in order of ease
| Ask | What it gives us | Cost to the airline |
|---|---|---|
| 1. **Written permission** to republish their timetable and prices, with a source link | Legal certainty; we can cite "source : CAA" | None |
| 2. **The weekly timetable sent to us** (PDF, Excel, or SSIM file, the format they already send OAG and Cirium) | Fresh data without scraping | Near zero: they already produce it |
| 3. **A link from their site** to our route pages, or a mention | Trust and SEO | None |
| 4. **An agent account** (CAA through Videcom; Air Congo through Ethiopian's partner portal) | Real-time availability for our own lookups; commission on bookings we pass on | Their standard agency process |
| 5. **XML API access** (CAA through Videcom) | Automated, authorised data | Setup on their side; likely needs an agency or commercial agreement |

### What we offer
- **Neutral, accurate visibility** on the searches travellers actually make, in French. Their flights are shown correctly, with their booking link, next to the honest status of competitors.
- **Corrections in hours:** an airline contact can report a mistake and we fix it.
- **Demand data:** anonymous counts of requests per route ("Kinshasa → Kalemie: 40 requests in October"). Airlines rarely have this for the DRC.
- **Later:** passenger leads to the airline or its agents.

### How
1. **Prepare** the evidence:
   - live route pages with their flights
   - one page explaining Clerikaa (methodology, traffic once it exists)
   - a one-page proposal in French
2. **CAA:** contact the Direction Commerciale (Gombe), by letter and in person if possible, plus info@caacongo.com.
3. **Air Congo:** contact info@air-congo.com and the Commercial line. In parallel, register on Ethiopian's partner portal, since distribution decisions appear to be made at Ethiopian [I].
4. **Record everything** in this document under "Contacts log" (date, person, answer). Any agreement goes into the Decision log in PLAN.md.

### Contacts log
| Date | Airline | Who / channel | Outcome |
|---|---|---|---|
| (none yet) | | | |

## 6. Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-30 | Manual collection first; automated importers paused (C-2, C-3) | Owner: scraping is too risky. The route workspace is needed first anyway; imports later feed the same screen. |
| 2026-10-30 | No OAG or Cirium now | No free licence allows publishing; both forbid resale; pricing is quote-only. |
| 2026-10-30 | Partnerships (C-7) come after the route workspace and the first live routes | Airlines respond to a working product with their flights in it. |
| ❓ open | AeroDataBox Pro (~$7.50/month) as a cross-check | Needs budget; revisit at first revenue (O-9). |

## 7. Sources

All accessed 2026-10-30.

**CAA and Air Congo**
- CAA timetable: https://www.caacongo.com/horaires.html → https://www.caacongo.com/horaires-20-oct.pdf
- CAA site, agents login, destinations, contacts: https://caacongo.com/index.php · https://caacongo.com/agents.html · https://caacongo.com/destinations.html · https://caacongo.com/contacts.html
- Air Congo home, booking and head office: https://www.air-congo.com/en/home · https://www.air-congo.com/en/book/book-a-trip/book-a-flight · https://www.air-congo.com/en/corporate/call-us/head-office

**Videcom and Hahn Air**
- Videcom XML API, travel-agent booking engine, Galileo: https://www.videcom.com/xml-api.aspx · https://www.videcom.com/direct-travel-agent-booking-engine.aspx · https://www.videcom.com/galileo-gds.aspx
- Hahn Air and CAA: https://www.hahnair.com/en/press-release/8357/2023-06-12/hahn-air-adds-flycaa-to-its-leading-partner-network · https://www.hahnair.com/en/carrier/bu-x1

**Ethiopian Airlines**
- Partner portal: https://partners.ethiopianairlines.com
- ShebaMiles and Air Congo: https://shebamiles.ethiopianairlines.com/partners/airlines/air-congo
- Affiliate programme: https://corporate.ethiopianairlines.com/ethiopian-affiliate-program

**Other airlines**
- IATA member list: https://www.iata.org/en/about/members/airline-list/
- ch-aviation on Air Congo (Mar 2026): https://www.ch-aviation.com/news/164391-air-congo-expands-regional-network-amid-atr72-delays
- AeroRoutes: https://www.aeroroutes.com/eng/260317-8zapr26 · https://aeroroutes.com/eng/241111-et8zdec24
- Congo Airways restart: https://www.ecofinagency.com/news-services/2210-60018-after-several-failed-restarts-congo-airways-aims-to-resume-flights-in-november
- Kin Avia schedule: https://kinavia.com/en/destinations-et-horaires-des-vols-reguliers-english/
- EU Air Safety List: https://transport.ec.europa.eu/transport-themes/eu-air-safety-list_en

**OAG**
- https://www.oag.com/flight-info-api
- https://developers.oag.com/terms-and-conditions
- https://www.oag.com/flight-info-api-evaluation-license-agreement
- https://www.oag.com/airline-schedules-data
- https://www.oag.com/start-up-accelerator-program
- https://knowledge.oag.com/docs/about-airfares.md

**Cirium and FlightStats**
- https://developer.flightstats.com/getting-started/
- https://developer.flightstats.com/about/terms_for_paid_accounts
- https://www.cirium.com/data/flight-schedules
- FlightStats routes: https://www.flightstats.com/v2/flight-tracker/route/FIH/FBM (also FBM/FIH and FIH/FKI, 30–31 Oct 2026)

**Fares and schedule vendors**
- ATPCO: https://www.atpco.net/fare-filing
- AeroDataBox: https://www.aerodatabox.com/pricing/ · https://www.aerodatabox.com/data-coverage/
- Aviationstack: https://aviationstack.com/pricing
- AirLabs: https://airlabs.co/
- FlightAware AeroAPI: https://www.flightaware.com/commercial/aeroapi/
- Flightradar24 API: https://fr24api.flightradar24.com/subscriptions-and-credits
- Aviation Edge: https://aviation-edge.com/premium/ · https://aviation-edge.com/api-terms-of-service/
