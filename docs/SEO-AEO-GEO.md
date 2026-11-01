# Search, answer-engine and AI visibility guideline (SEO · AEO · GEO)

> **Status:** binding for every public page, from 2026-10-30. Plan stage 5 ([PLAN.md](PLAN.md#stage-5-get-found)).
> **What the terms mean:**
> - **SEO:** ranking in Google and Bing.
> - **AEO** (answer engines): being the source behind direct answers.
> - **GEO** (generative engines): being cited by AI assistants (Google AI Overviews and AI Mode, ChatGPT search, Perplexity, Copilot, Claude, Gemini).
>
> **How to read it:** **MUST** rules are checked in review; **SHOULD** rules need a reason to skip. Every fact is sourced in [§13](#13-sources), verified on 2026-10-30 (sources 26–30 on 2026-10-31). Re-check sources marked *changed recently* before relying on them.

**Contents**
1. [What we are optimising for](#1-what-we-are-optimising-for)
2. [The core idea](#2-the-core-idea)
3. [URLs and site structure](#3-urls-and-site-structure)
4. [What every page must have](#4-what-every-page-must-have)
5. [Structured data](#5-structured-data)
6. [Languages](#6-languages)
7. [Crawling and indexing](#7-crawling-and-indexing)
8. [AI engines specifically](#8-ai-engines-specifically)
9. [Content rules (and spam policies)](#9-content-rules-and-spam-policies)
10. [Performance](#10-performance)
11. [Links from other sites](#11-links-from-other-sites)
12. [Measuring](#12-measuring)
13. [Sources](#13-sources)
14. [Page checklist](#14-page-checklist)

---

## 1. What we are optimising for

**The market.** StatCounter figures for the DRC, September 2026:

| Measure | Figure |
|---|---|
| Google's share of searches (all platforms) | 97.5% |
| Google's share of searches (mobile) | 99.3% |
| Bing's share of searches | 2.0% |
| Traffic from mobile | 77.6% (noisy: 55% in August, 69–86% across 2025) |
| Android share of mobile | 87% |
| Chrome / Opera / Safari share of browsing | 76% / 9.5% / 8% |

**So:** Google on an Android phone is the main channel. Bing matters mainly because it feeds Copilot and ChatGPT search.

**The searches.** People search in French, in a few repeated shapes:
- price + route + airline: "prix kinshasa kalemie caa", "prix avion bunia beni"
- flight + route: "vol kinshasa goma", "horaire vol kinshasa kisangani"
- airline + topic: "air congo prix", "caa horaires"
- general: "vols intérieurs rdc"

The tracked list lives in [PLAN.md](PLAN.md#stage-5-get-found).

**The competition.** Global travel sites rank with template pages: prices in EUR, monthly averages, grounded airlines, closed airports. We win on **accuracy, dates and sources for DRC domestic routes**, not on volume.

## 2. The core idea

Google's AI guidance (May 2026, updated July 2026) says optimising for generative AI "is… still SEO". It says there is no need to break content into small chunks, and that what counts is **"non-commodity content"**: unique, first-hand information.

Our dated, sourced observations of DRC schedules and prices are exactly that. Every rule below exists to:
1. put those facts in the HTML;
2. make them easy to find and to trust;
3. never dilute them with thin pages.

There is **no special file or markup** for AI features. Google: "There are no additional requirements to appear in AI Overviews or AI Mode… You don't need to create new machine readable files, AI text files, or markup."

## 3. URLs and site structure

Decided by the owner on 2026-10-30: **all public URLs in French**. Google says "it's fine to use localized words in the URL".

| Page | URL |
|---|---|
| Home | `/` |
| Routes hub | `/vols` |
| Route | `/vols/kinshasa-lubumbashi` |
| Route + airline | `/vols/kinshasa-lubumbashi/caa`. One per airline published on the route, even when it is the only one (owner, 2026-10-31). Different content from the route page: [ROUTE-MODEL.md §7](ROUTE-MODEL.md#7-what-the-public-site-shows). |
| Airline | `/compagnies/caa` |
| Airport | `/aeroports/kinshasa` |
| Network status | `/etat-du-reseau` |
| Methodology | `/methodologie`: how we collect, date and verify data |
| About | `/a-propos` |
| Contact | `/contact` (live since P-12; the same word in French and English) |
| Request form | `/demande` |
| English (later, F-1) | `/en/flights/kinshasa-lubumbashi`, `/en/airlines/caa`… with English slugs |

**MUST**
- Slugs are lower case, without accents, hyphenated, and built from **city names, not airport codes**: `mbuji-mayi`, not `mjm`.
- Routes are **directional**: `kinshasa-lubumbashi` ≠ `lubumbashi-kinshasa`.
- **A published URL never changes without a permanent (301) redirect.** Old URLs (`/explore`, `/about`, `/request`) get 301s when their French replacements launch (RW-7).
- There is no trailing slash, and every page has a single canonical URL.
- Every page sits at most 3 clicks from the home page. Pages link to each other (map below).
- **A page is never removed or redirected because service changed** (suspension, end of a route, closed airport). It stays online and says what changed. Redirects are only for URLs that change ([ROUTE-MODEL.md §7](ROUTE-MODEL.md#7-what-the-public-site-shows)).
- **Until RW-5:** `/explore` is the search page and `/explore/[id]` (one departure, keyed by its database id, server-rendered since P-13) is `noindex`. Both are replaced by `/vols/...` with 301 redirects in RW-7. Route links in the code all go through `lib/links.ts`, so switching them is one change.

### 3.1 Internal links (owner priority, 2026-10-31)

Links only help search engines when they point at **indexable pages with content**. Links to search results (`/explore?from=…`) help visitors, not rankings. So the map fills in as the pages ship:

| From | Links to | When |
|---|---|---|
| Home | Search (hero), tracked routes, next departures, airport statuses | ✅ now (to search results until RW-5) |
| Home | Route pages, airline pages, airport pages, network status | RW-5, E-1, E-2, E-3 |
| Navbar | "Rechercher un vol" button; À propos, Contact; then Vols (route index), Compagnies, Aéroports, État du réseau | As each page ships; today À propos and Contact |
| Footer | Busiest routes, airlines, airports, À propos, Méthodologie, Contact, help | As each page ships |
| Route | Return route; each route + airline page; both airports; the airlines; routes from the same departure city | RW-5 |
| Route + airline | Route page ("comparer"); the airline page; the airline's other routes from the same airport | RW-5 |
| Airport | Every route from and to it; airlines serving it; nearby airports; network status | E-1 |
| Airline | Every route it flies (route + airline pages); its status; its booking channels | E-2 |
| Network status | Every closed or restricted airport and suspended airline | E-3 |
| Every data page | "Signaler une erreur" → `/contact?sujet=erreur&page=<path>` (the form opens on that subject and keeps the page) | RW-5, E-1, E-2 |

**MUST:** link text names the place ("Vols Kinshasa → Lubumbashi"), never "cliquez ici".

## 4. What every page must have

**MUST**
1. **The facts in the server HTML.** None of the major AI crawlers runs JavaScript (Vercel's study of AI crawlers). Schedules, prices, dates and sources must be in the HTML the server sends, never loaded in the browser afterwards. This is the default with Next.js server components; client-only data fetching is forbidden for these blocks.
2. **A unique `<title>` and meta description**, built from the data:
   - Title: `Vols Kinshasa – Lubumbashi : horaires et prix (CAA, Air Congo) | Clerikaa`
   - Description: `2 compagnies, 9 vols par semaine, dès 244 $ (prix observé le 30 oct. 2026). Jours, horaires et escales vérifiés.`
   - If only one airline flies the route, name it in the title. That captures "… caa" searches without a duplicate page.
3. **One `<h1>`** that matches the search: "Vols Kinshasa → Lubumbashi" (the arrow is an icon; see [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md#5-typography)).
4. **The answer first.** The first block states who flies, how often, from what price, and as of when, in a plain sentence. Then the details.
5. **Dates, visible and honest.**
   - Google asks for a prominent date with a label such as "Mis à jour le".
   - Visible dates and structured-data dates must match.
   - The page date must describe the page, not the events it covers.
   - So we keep three dates apart:
     - **page update date** ("Mis à jour le")
     - **data verification date** ("Vérifié le")
     - **price observation date** ("observé le")
   - No future dates.
6. **Sources.** Each price and schedule links to where it came from (airline site, timetable PDF, agency quote). Airport and airline statuses link to their source.
7. **A canonical tag**, plus **`hreflang`** links once English pages exist ([§6](#6-languages)).
8. **Breadcrumbs**: Accueil › Vols › Kinshasa → Lubumbashi.

**SHOULD**
- Add a short, human-written note per top-tier route: airports, time difference, practical notes.
- Add a FAQ block **written from our data** (e.g. "Quels jours vole CAA entre Kinshasa et Lubumbashi ?"). It helps readers and AI answers. There is **no rich result for it** (see [§5](#5-structured-data)).

## 5. Structured data

Google's gallery lists 25 rich-result types as of October 2026. It changed a lot in 2025–2026:

| Type | Status | Our use |
|---|---|---|
| `BreadcrumbList` | Supported; shown on **desktop only** since Jan 2025 | **MUST** on every page below home |
| `Organization` | Supported | **MUST** on home (name, logo, url; `sameAs` only for real profiles) |
| `WebSite` | Site name | Already on every page |
| `FAQPage` | **Removed** from Google Search on 7 May 2026 | **Don't add** expecting a rich result. A visible FAQ is still fine. |
| `HowTo` | Removed in 2023 | Don't use |
| `Event` | Physical, public, bookable events only | **Never** mark flights as events |
| `Dataset` | Since Nov 2025, only used by Google Dataset Search | Optional, for the future price archive (F-8) |
| `Flight` (schema.org) | Exists on schema.org; Google documents it only for Gmail booking emails; no rich result | **Not in v1.** No Google benefit, and a mismatch risk. Revisit if an AI engine documents using it. |

**MUST:** structured data describes only what is **visible on the page**. Google's guidance on AI features repeats this.

## 6. Languages

Google's rules:
- Each language version lists itself and all the others (`hreflang`).
- If two pages don't point at each other, the tags are ignored.
- `x-default` is the fallback.
- Use separate URLs per language, not cookies or browser settings.
- Never redirect automatically based on the browser's language; link to the other version instead.
- Googlebot usually crawls from the USA without a language preference, so content that changes by language on the same URL may never be seen.

**Today:** the site switches language in the browser on the same URL. **Only the French version can be indexed.** That's acceptable while French is the priority.

**MUST (F-1):**
- English pages get their own URLs under `/en/` with English slugs.
- `hreflang="fr"`, `hreflang="en"` and `x-default` → French, reciprocal on every page.
- `lang` is set correctly on `<html>`.

**MUST NOT:** publish machine-translated pages without a human review. Since June 2025, Google treats scaled machine translation under its **scaled content abuse** policy.

## 7. Crawling and indexing

**MUST**
- **Sitemap generated from the database:** only pages that pass the publication rules ([ROUTE-MODEL.md §7](ROUTE-MODEL.md#7-what-the-public-site-shows)).
  - `lastmod` is the date the **data** last changed, not the build date. Google uses `lastmod` only when it is "consistently and verifiably" accurate.
  - Google ignores `priority` and `changefreq`, so drop them.
- **robots.txt** (generated in `app/robots.ts`): keep the back office, API and login blocked. Explicitly allow search and AI-search crawlers ([§8](#8-ai-engines-specifically)).
- Register the site in **Google Search Console** and **Bing Webmaster Tools** (F-5).
  - Leave Search Console's new "Search generative AI control" on **Include**. Excluding removes us from AI Overviews and AI Mode.
- **IndexNow** (F-5): notify Bing (also Yandex, Seznam, Naver, Yep, Internet Archive, Amazonbot) whenever a route's data changes. Google does not use IndexNow; it relies on the sitemap.
- **Stale pages stay indexed and say so** (changed 2026-10-31; this rule used to say `noindex`). A route whose data has gone stale hides its "next departures", shows the last known schedule with its dates, and keeps its URL ([ROUTE-MODEL.md §7](ROUTE-MODEL.md#7-what-the-public-site-shows)). Why:
  - "URLs that are already indexed and return a `4xx` status code are removed from the index." A 301 is "a **strong** signal that the redirect target should be processed" (Google, HTTP status codes, updated 2026-02-04).
  - When Google sees `noindex` on an indexed page, it "will drop that page entirely from Google Search results", and "it may take months for Googlebot to revisit a page" (Google, block indexing, updated 2025-12-10).
  - So switching `noindex`, errors or redirects on and off as data ages or service pauses makes pages vanish and come back slowly. An honest date doesn't.

## 8. AI engines specifically

### Which crawlers to allow
| Token | What it does | Rule |
|---|---|---|
| Googlebot | Google Search, including AI Overviews and AI Mode | **Allow** |
| Bingbot | Bing and Copilot | **Allow** |
| OAI-SearchBot | Shows sites in ChatGPT search results | **Allow**. OpenAI says to allow it. Robots changes take about 24 h. |
| ChatGPT-User | Fetches pages when a user asks; "robots.txt rules may not apply" | Allow |
| PerplexityBot | Perplexity's search index; "not used to crawl content for AI foundation models" | **Allow** |
| Perplexity-User | User-triggered fetches; "generally ignores robots.txt" | Allow |
| Claude-SearchBot / Claude-User | Anthropic's search indexing / user-requested fetches | **Allow** |
| Applebot | Siri and Spotlight | Allow |
| GPTBot, ClaudeBot, Google-Extended, Applebot-Extended | **Model training.** Google-Extended also controls grounding in the Gemini apps, but not Google Search. | ❓ **Owner decision.** Recommendation: **allow** for now, because being known to the models helps citations and the data is public anyway. Revisit before licensing data to agencies (M8), when the data itself becomes the product. |

Bing announced on 2026-10-30 a new `ai-training` preference and page-level `ai-grounding` controls, honoured from 2027-02-01. We leave both at their default (allowed).

### What makes AI engines cite us
- **Facts in text, in the HTML**: prices, dates, days, times, flight numbers, airport status. Not in images, and not loaded later by JavaScript.
- **The same names everywhere.**
  - Airlines: "Compagnie Africaine d'Aviation (CAA)", "Air Congo".
  - Airports: "Aéroport international de N'Djili (FIH)".
  - Our brand: "Clerikaa".
  - Inconsistent naming splits our identity in AI engines.
- **Every claim dated and sourced.** AI answers prefer content they can attribute. "Selon Clerikaa, prix observé le 30 oct." is the citation we want.
- **A methodology page** (`/methodologie`) explaining how data is collected, verified and dated. It answers "can I trust this?" for readers and for AI engines.
- **The network status page** (`/etat-du-reseau`): closed airports and suspended airlines with sources. Global sites get this wrong, and it is exactly what assistants are asked about.

### What doesn't matter (don't spend time on it)
- **`llms.txt`.** Google: it will "neither harm nor help your site's visibility or rankings in Google Search, as Google Search ignores them". No major AI crawler documents reading it. Optional and low priority.
- **Splitting content into tiny pieces "for AI"**: Google says it is not needed.

## 9. Content rules (and spam policies)

| Google policy | What it targets | Our rule |
|---|---|---|
| **Scaled content abuse** | "Many pages generated for the primary purpose of manipulating search rankings", "regardless of how it's created", including generative AI "without adding value" | Pages are generated **only** when they carry real data (the publication rules). No page per city pair "just in case". |
| **Doorway abuse** | Pages "created to rank for specific, similar search queries", including "substantially similar pages" | The route page is a comparison summary; the route + airline page is the full breakdown for one airline. They must keep different content ([ROUTE-MODEL.md §7](ROUTE-MODEL.md#7-what-the-public-site-shows)). |
| **Scraping** | "Republishing content from other sites without adding any original content or value", "copying content from other sites, modify it only slightly" (updated 2026-08-28) | Airport and airline pages use **our own content**, entered in the back office. Nothing is copied from Wikipedia or other sites. Their value is our own data: schedules, prices, statuses, routes. |
| **AI-generated content** | Allowed, but Google asks you to "manually factcheck and review all AI-generated content", including titles, descriptions, structured data and alt text | Any generated text is reviewed by a person before publishing. Templates fill in **data**, not padding. |

*Changed recently:* since May 2026 Google applies its spam policies to generative AI answers too, and since April 2026 spam reports can trigger manual actions.

**Airport and airline pages (E-1, E-2): where content may come from**
- **Our own structure, written by us** (owner, 2026-10-31): facts, notes and practical information are entered and customised in the back office (B-2, B-3 in [PLAN.md](PLAN.md#stage-4-publish)). No import from Wikipedia or Wikidata: duplicated content adds nothing.
- **No Wikipedia text**, ever. It is CC BY-SA 4.0: reuse needs attribution and puts our copy under the same licence, and copied paragraphs are the "scraping" pattern above. AI engines already have Wikipedia; they quote us for what it doesn't have.
- Checking a fact (an IATA code, coordinates) against a public reference is fine; republishing its text is not.
- **Photos:** our own, or Wikimedia Commons files under their stated licence, credited next to the image.
- **Testimonials and reviews:** only real, moderated submissions with a date. Never written by us, never invented. Later (E-5).

**MUST**
- No invented numbers, ever. A missing price shows "Prix non relevé", not an estimate.
- No hidden text, no keyword lists, no "best price guaranteed" claims.
- French typography and spelling are checked; place names follow official spelling (Mbuji-Mayi, Kalemie, Kisangani).

## 10. Performance

Core Web Vitals, at the 75th percentile of real visits, measured separately for mobile and desktop:

| Metric | Good | Poor |
|---|---|---|
| LCP (largest content shown) | ≤ 2.5 s | > 4 s |
| INP (response to a tap) | ≤ 200 ms | > 500 ms |
| CLS (layout shift) | ≤ 0.1 | > 0.25 |

**MUST** (P-5):
- Route pages are server-rendered, with little JavaScript.
- No hero photos on data pages. Today's home page hero photo is flagged by Next.js as the LCP element; it goes when the home page is rebuilt.
- One font file (27 KB).
- Test on a mid-range Android phone on a throttled 3G profile, in Chrome **and Opera**.

## 11. Links from other sites

**SHOULD:**
- links from the airlines (part of partnership talks, C-7)
- links from partner agencies
- links from local press (actualite.cd, Radio Okapi), earned by publishing useful data: the network status page and the monthly price archive

**MUST NOT:** buy links or join link schemes.

## 12. Measuring

- **Search Console:** impressions, clicks and position per tracked query; indexing report; Core Web Vitals report.
- **Bing Webmaster Tools:** the same, for Bing and Copilot.
- **Visits referred by AI engines**, as a monthly figure: chatgpt.com, perplexity.ai, copilot.microsoft.com, gemini.google.com, claude.ai.
- **Requests per route**, from the request form, linked to routes in RW-5.

## 13. Sources

All accessed 2026-10-30. "Changed recently" marks 2025–2026 changes.

1. Google spam policies (updated 2026-08-28): https://developers.google.com/search/docs/essentials/spam-policies
2. Google, using generative AI content (updated 2026-10-01): https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
3. Google, AI features and your website (updated 2025-12-10): https://developers.google.com/search/docs/appearance/ai-features
4. Google, AI optimization guide (changed recently; includes the llms.txt statement): https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
5. Search Console "Search generative AI control" (changed recently, rolled out 2026-08-31): https://support.google.com/webmasters/answer/16908024
6. Google structured data gallery (updated 2026-10-16): https://developers.google.com/search/docs/appearance/structured-data/search-gallery
7. Google Search updates log (FAQ removal 2026-05-07; spam-policy changes): https://developers.google.com/search/updates
8. Breadcrumbs desktop-only (2025-01): https://developers.google.com/search/blog/2025/01/simplifying-breadcrumbs
9. Dataset structured data change (2025-11): https://developers.google.com/search/blog/2025/11/update-on-our-efforts
10. Event structured data (updated 2026-09-08): https://developers.google.com/search/docs/appearance/structured-data/event
11. schema.org Flight: https://schema.org/Flight
12. hreflang (updated 2026-09-21): https://developers.google.com/search/docs/specialty/international/localized-versions
13. Multi-regional and multilingual sites (updated 2025-12-10): https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
14. IndexNow engines and FAQ: https://www.indexnow.org/searchengines.json and https://www.indexnow.org/faq
15. OpenAI crawlers: https://developers.openai.com/api/docs/bots
16. Perplexity crawlers: https://docs.perplexity.ai/guides/bots
17. Anthropic crawlers: https://support.claude.com/en/articles/8896518
18. Google common crawlers (Google-Extended): https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers
19. Applebot-Extended: https://support.apple.com/en-us/119829
20. Bing training and grounding preferences (2026-10-30): https://blogs.bing.com/search/2026/10/your-content-your-choice-clearer-preferences-for-training-and-grounding/
21. Vercel, AI crawlers and JavaScript (2024-12-17): https://vercel.com/blog/the-rise-of-the-ai-crawler
22. Core Web Vitals: https://web.dev/articles/defining-core-web-vitals-thresholds and https://developers.google.com/search/docs/appearance/core-web-vitals
23. Sitemaps (updated 2026-07-08): https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
24. Publication dates (updated 2025-12-10): https://developers.google.com/search/docs/appearance/publication-dates
25. StatCounter, DRC (search engines, platforms, browsers, Sept 2026): https://gs.statcounter.com/search-engine-market-share/all/democratic-republic-of-the-congo
26. HTTP status codes and Google Search (updated 2026-02-04): https://developers.google.com/search/docs/crawling-indexing/http-network-errors
27. Block indexing with noindex (updated 2025-12-10): https://developers.google.com/search/docs/crawling-indexing/block-indexing
28. Spam policies, scraping (updated 2026-08-28): https://developers.google.com/search/docs/essentials/spam-policies
29. Wikidata licensing (CC0): https://www.wikidata.org/wiki/Wikidata:Licensing
30. Wikimedia terms of use, CC BY-SA 4.0 FAQ: https://meta.wikimedia.org/wiki/Terms_of_use/Creative_Commons_4.0/FAQ

## 14. Page checklist

Copy this into the PR description for any new or changed public page.

```
- [ ] Facts (schedules, prices, dates, sources) are in the server HTML (check with curl / view-source)
- [ ] Unique <title> and meta description built from data; airline named in title if it is the only one
- [ ] One <h1>; answer-first summary sentence
- [ ] "Mis à jour le", "Vérifié le", "observé le" dates visible and correct
- [ ] Sources linked
- [ ] Canonical set; hreflang reciprocal (once English exists)
- [ ] BreadcrumbList matches visible breadcrumbs; no structured data for invisible content
- [ ] Page passes the publication rules (ROUTE-MODEL §7); stale → dated notice, stays indexed; never removed or redirected for a service change
- [ ] In the sitemap with lastmod = data change date
- [ ] Internal links follow the map in §3.1 (return route, airline pages, airports, hub); route links built with lib/links.ts
- [ ] No invented numbers; any generated text reviewed by a person
- [ ] Mobile check on Android Chrome and Opera; LCP ≤ 2.5 s on throttled 3G
```
