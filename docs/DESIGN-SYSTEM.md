# Clerikaa design system (v1)

> **Status:** v1, 2026-10-30. Plan item **P-2** ([PLAN.md](PLAN.md#stage-4-publish)).
> **See it live:** `/dashboard/design` (log in first). It renders the real tokens and components, so it never drifts from the code.
> **Rule:** if the design changes, change this file and that page in the same PR.

**Contents**
1. [Where things live](#1-where-things-live)
2. [Principles](#2-principles)
3. [Brand](#3-brand)
4. [Colour](#4-colour)
5. [Typography](#5-typography)
6. [Space, shape and elevation](#6-space-shape-and-elevation)
7. [Icons and motion](#7-icons-and-motion)
8. [Data display rules](#8-data-display-rules)
9. [Components](#9-components)
10. [Public site vs back office](#10-public-site-vs-back-office)
11. [Writing](#11-writing)
12. [Accessibility checklist](#12-accessibility-checklist)
13. [Mobile app later](#13-mobile-app-later)
14. [Changing the system](#14-changing-the-system)
15. [Decisions and changelog](#15-decisions-and-changelog)

---

## 1. Where things live

| What | Where | Edit it? |
|---|---|---|
| Design tokens (colour, radius, shadow, font name) | [`design/tokens.json`](../design/tokens.json) | **Yes.** This is the source of truth. |
| Generated CSS variables for Tailwind | `app/tokens.css` | No. `npm run tokens` writes it. |
| Global styles (font, focus ring, reduced motion) | `app/globals.css` | Rarely. |
| Primitives (Button, Badge, Input, Table…) | `components/ui/` | Yes, following this document. |
| Product components (PriceTag, DayStrip…) | `components/ds/` | Yes. |
| Logo | `components/brand/Logo.tsx`, `app/icon.svg`, `app/apple-icon.tsx`, `app/favicon.ico` | Together only. |
| Formatting rules (prices, dates, flight numbers) | `lib/format.ts` | Yes. |
| Live reference page | `app/(app)/dashboard/design/page.tsx` | Yes, when adding components. |

The token file follows the [W3C Design Tokens (DTCG)](https://www.designtokens.org/) format, so a native app or a design tool can read the same file later.

## 2. Principles

These settle design arguments. Each one comes from the product's constraints in [PLAN.md](PLAN.md#4-principles).

1. **The data is the hero.** Schedules, prices and dates are the content. No stock photos or decorative illustrations on data pages. A page should be understandable with images turned off.
2. **Trust is visible.** Every price shows when it was observed. Every schedule shows when it was verified. Every status (closed airport, suspended airline) shows a source. Design never hides uncertainty.
3. **Fast on a cheap Android phone.** In the DRC, 87% of mobile visits come from Android and Opera has about 10% of mobile browsing (StatCounter, September 2026). One font file, HTML from the server, very little JavaScript.
4. **One action colour.** Pink means "you can act here". Status colours (green, amber, red, blue) only describe things. Colour is never the only signal: there is always a word or an icon too.
5. **Two surfaces, two densities.**
   - The public site is designed mobile-first and roomy.
   - The back office is designed for a desktop screen and is dense.

   They share the same tokens.

## 3. Brand

**Name:** Clerikaa. The wordmark is written in lower case (`clerikaa`) in the brand font at weight 800. In running text, write "Clerikaa".

**The mark:** a "c" drawn as a flight path that ends on its destination dot. It stands for the product: one route, followed to its end.
- Pink square with rounded corners (radius 8 on a 32 grid). White path and dot.
- Minimum size 16 px (favicon). It was tested at 16, 32 and 48 px.
- Leave clear space around it equal to the dot's diameter.
- Don't recolour, stretch, outline or put it on a photo.
- The geometry lives in `components/brand/Logo.tsx` (`MARK_PATH`, `MARK_DOT`) and is reused by the icons, so the logo is defined in one place.

**Colours:** in French, "rose" means pink, so the brand is **pink and white**. The pink was chosen to stay clearly apart from the red used for danger, as measured in OKLCH:
- brand pink hue ≈ 359°
- danger red hue ≈ 27°

Blue is used only for information, never for actions (see [Colour](#4-colour)).

## 4. Colour

### Scales
Six scales from 50 (lightest) to 950 (darkest). They were generated in OKLCH so that each step looks evenly spaced.

| Scale | Purpose | Key steps |
|---|---|---|
| `brand` (pink) | Actions, selection, brand moments | 600 `#d02c75` buttons · 700 `#b11f60` links and hover · 50 `#fff2f7` tinted backgrounds |
| `neutral` (mauve-tinted grey) | Text, borders, surfaces | 950 `#252023` text · 600 `#70686d` secondary text · 200 `#e3dee1` borders |
| `green` | Success, "vérifié", "opéré" | 700 text on 50 |
| `amber` | Warning, "à confirmer", "à revérifier" | 800 text on 50 |
| `red` | Danger, "fermé", "annulé", destructive actions | 600 buttons · 700 text on 50 |
| `blue` | Information only | 700 text on 50 |

The greys have a slight pink tint, following Radix Colors' advice to pair pink hues with "mauve" greys, so neutrals don't look cold next to the brand.

### Roles: what components use
Components never use a raw scale step. They use a **role**, so a role can be re-pointed in one place.

| Role | Value | Use |
|---|---|---|
| `background` / `foreground` | white / neutral 950 | Page and body text |
| `primary` / `primary-hover` / `primary-foreground` | brand 600 / 700 / white | The one action colour |
| `secondary` / `secondary-foreground` | neutral 100 / 900 | Secondary buttons, quiet surfaces |
| `muted` / `muted-foreground` | neutral 50 / 600 | Subtle backgrounds; metadata, captions, sources |
| `accent` / `accent-foreground` | brand 50 / 800 | Hover and selected backgrounds (menus, active nav) |
| `link` | brand 700 | Links inside text, always underlined |
| `border` | neutral 200 | Dividers, card borders (decorative) |
| `input` | neutral 500 | Form field borders (3:1, so fields are visible) |
| `ring` | brand 500 | Keyboard focus |
| `destructive` | red 600 | Delete buttons only |
| `success` · `warning` · `danger` · `info` · `brand` (+ `-subtle`, `-border`) | 700/800 on 50, border 200 | Badges and banners |

### Contrast: checked by machine
`npm run tokens` computes the WCAG contrast of every pair listed in `contrastChecks` in `tokens.json`. It **fails** if any pair falls below its minimum: 4.5:1 for text, 3:1 for field borders and focus rings. `npm run build` runs the same check, so an inaccessible colour cannot reach production.

The check has already done its job once. The first grey for secondary text was 4.35:1 on the `secondary` surface, so neutral 600 was darkened to `#70686d` (4.70:1).

Current results:

| Pair | Ratio |
|---|---|
| Body text on white | 16.0:1 |
| Secondary text on white | 5.4:1 |
| White on primary pink | 4.9:1 |
| Link on white | 6.5:1 |
| Field border on white | 3.4:1 |
| Focus ring on white | 3.5:1 |

### Rules
- **One primary (pink) button per view.** Everything else is secondary, outline or ghost.
- **Red is for danger and destruction only.** Never use it for emphasis.
- **Blue is for information only.** It is not a second action colour.
- **Status badges always carry a text label.** Colour alone is not enough.
- **Tailwind's default palette is switched off** (`--color-*: initial` in `app/tokens.css`). A class like `bg-sky-500` simply doesn't exist, so off-system colours can't creep back in.

## 5. Typography

**Font: Plus Jakarta Sans** (variable weight, latin subset), loaded with `next/font`, which self-hosts it and adds a size-matched fallback.

Five candidates were measured on 2026-10-30, using the latin subset served by Google Fonts:

| Font | Size | Tabular figures | All French glyphs |
|---|---|---|---|
| Figtree | 20 KB | ✅ | ✅ |
| Manrope | 24 KB | ✅ | ✅ |
| **Plus Jakarta Sans** | **27 KB** | ✅ | ✅ |
| Geist | 29 KB | ✅ | ✅ |
| Inter | 48 KB | ✅ | ✅ |

Plus Jakarta Sans gives the most character for a pink, warm brand. It is about half the weight of Inter and stays legible at small sizes. Figtree is the fallback choice if bytes ever matter more than character.

**Arrows:** none of the five fonts includes the "→" glyph in its latin subset. Typed arrows render in a different fallback font. **Always use the arrow icon** (`RouteTitle` does this). In `<title>` tags and plain-text contexts, write "Kinshasa – Lubumbashi" (en dash).

### Type scale
Headings and lead lines take their classes from **`TYPE`** in `components/ds/typography.ts`, never retyped by hand. Sizes are written phone first: the first number is the phone size, the next ones apply from 640 px (`sm`) and 1024 px (`lg`).

| Role | Where it comes from | Size (px) | Use |
|---|---|---|---|
| Display | `TYPE.display` | 30 → 48 → 60 | Home hero only |
| Page title (h1) | `TYPE.title` | 24 → 30 → 36 | One per page |
| Headline (h2, landing) | `TYPE.headline` | 20 → 24 → 30 | Section titles on the home and `/about` |
| Section (h2) | `TYPE.section` | 18 → 20 | Section titles on route, airline and hub pages |
| Lead | `TYPE.lead` | 16 → 18 | The answer or intro line under a title |
| Subhead | `text-base font-semibold` | 16 | Card titles, airline names |
| Body | `text-base` | 16 | Never smaller on the public site |
| Meta | `text-sm text-muted-foreground` | 14 | Sources, dates, captions, section subtitles on phones |
| Caption | `text-xs text-muted-foreground` | 12 | Table notes, timezone hints, labels inside search fields |

**Why phones get the smaller step** (P-17, owner 2026-11-02): at 390 px the v1 sizes wrapped the home title on three lines and the route answer on three, and pushed the search and the data below the first screen. Body text stays at 16 px: only headings and lead lines got smaller.

### Rules
- **Numbers line up.** Times, prices and flight numbers use tabular figures. `<time>` and `<data>` get this automatically, and elsewhere use `tabular-nums`.
- **Sentence case** for titles and buttons ("Voir les vols", not "Voir Les Vols").
- **French punctuation.** French uses a non-breaking space before `: ; ! ?` and inside `« »`, so "vol ?" never ends a line on "?". In `i18n/locales/fr.json` it is written `\u00a0` (P-17: the 55 plain spaces there were replaced); in code, write `{"\u00a0: "}`. The `Intl` formatters already handle numbers and currency.
- **Things that never break across lines:** dates in running text ("31 octobre 2026"), web addresses ("air-congo.com" broke at its hyphen) and hyphenated city names in narrow places ("Mbuji-Mayi"). Use `whitespace-nowrap` on them.

## 6. Space, shape and elevation

- **Spacing:** 4 px grid (Tailwind's default scale). Common steps:
  - 8 px inside controls
  - 16 px page gutter on phones
  - 24 px between blocks of a page on phones, 32 px from 640 px (route, airline, hub pages)
  - 40 px between home sections on phones, 64 px from 640 px
  - cards: 14–16 px padding on phones, 20 px from 640 px
- **Empty blocks take no space.** A wrapper that may render nothing (the alerts block) gets `empty:hidden`, so it does not add a gap of its own.
- **Radius:**
  - `sm` 6 px: day chips, airline codes
  - `md` 8 px: buttons, inputs
  - `lg` 12 px: cards, banners
  - `xl` 16 px: large panels
  - `full`: badges
- **Elevation:** borders do the structural work. There are only two shadows:
  - `shadow-card`: subtle, for cards that sit on a page
  - `shadow-popover`: for menus and dialogs
- **Breakpoints:** Tailwind defaults, used mobile-first: `sm` 640, `md` 768, `lg` 1024, `xl` 1280.
- **Line length:** text blocks max about 70 characters (`max-w-2xl`).
- **Dark mode:** not in v1. Roles make it possible later (see [Decisions](#15-decisions-and-changelog)).

## 7. Icons and motion

- **Icons: [Lucide](https://lucide.dev)**, already installed. The same set exists for React Native (`lucide-react-native`).
  - Sizes: 16 px in controls, 20 px in navigation, 24 px for standalone icons.
  - Stroke width: 2.
  - Decorative icons get `aria-hidden`. An icon-only button needs an `aria-label`.
- **Airline logos** (owner, 2026-10-31): shown when the airline has one (`Airline.logo`, a file in `public/logos/airlines/` or an https link), in a white tile of fixed size so times line up; otherwise the IATA code in a grey tile. Logo files are framed tight to the drawing. Air Congo is shown with Air Congo's logo, never Ethiopian's.
- **Motion:** at most 150–200 ms, used for state changes only (hover, open, close). `prefers-reduced-motion` turns all of it off (`app/globals.css`).
  - **Nothing moves on its own.** No auto-advancing carousels: the old home carousel moved every 3.5 s and was removed on 2026-10-31. On phones, a row of cards can be swiped; on larger screens it is a grid.
- **Surfaces.** The home hero (`.hero-surface` in `app/globals.css`) is the one decorated surface: brand glows in two corners, a faint grain, rounded bottom corners. Inspired by yesim.app's gradient hero (owner's reference). Text on it uses `foreground` or `neutral-700`, which pass AA on every stop from brand-50 to brand-200 (`muted-foreground` fails on brand-200 at 3.85:1, so it isn't used there). Other sections stay white, with `muted` panels and bordered cards.

## 8. Data display rules

This product is mostly data, so these rules matter more than anything visual. They are implemented in `lib/format.ts`, and nothing should format these values by hand.

| Data | Rule | Example | Helper |
|---|---|---|---|
| Price | Whole USD, `fr-CD` format, symbol after the number. Never shown without its observation date. "dès" when it is a lowest advertised fare. | `dès 244 $` · `observé le 30 oct.` | `formatPrice`, `<PriceTag>` |
| Date | French (DRC), weekday short when space is tight. | `mar. 3 nov.` · `mardi 3 novembre 2026` | `formatDateShort`, `formatDateLong` |
| Time | 24-hour **local time at the airport**, with the airport code next to it. Mention the timezone once per table. | `13:45 FIH → 17:15 FBM` · "Kinshasa UTC+1, Lubumbashi UTC+2" | `<time>` |
| Flight number | Airline code, space, number. | `BU 1611` | `formatFlightNumber` |
| Days of operation | Seven-day strip L M M J V S D, plus the full list for screen readers. | `L M M J V S D` | `<DayStrip>`, `formatWeekdays` |
| Duration | Hours and minutes. | `2 h 30` | |
| Stops | "Direct" or "1 escale (Kindu)". Never hide a stop. | | |
| Freshness | Days since verification. Under 7 days green, under 14 amber, otherwise red (provisional thresholds until **R-3**). | `Vérifié avant-hier` | `<FreshnessBadge>` |
| Route | Origin, arrow icon, destination. | Kinshasa → Lubumbashi | `<RouteTitle>` |

### Status vocabulary
The same word and colour mean the same thing everywhere.

| Data | Value | Label (FR) | Badge |
|---|---|---|---|
| Airport | OPEN / RESTRICTED / CLOSED | Ouvert / Restrictions / Fermé | success / warning / danger |
| Airline | OPERATING / SUSPENDED / CEASED | En activité / Suspendue / Arrêtée | success / warning / danger |
| Flight (planned) | SCHEDULED / CANCELLED | Prévu / Annulé | neutral / danger |
| Review | PENDING / APPROVED / REJECTED | À vérifier / Validé / Rejeté | warning / success / neutral |
| Request | NEW / CLAIMED / CONTACTED / CLOSED | Nouvelle / Prise en charge / Contacté / Clôturée | info / warning / success / neutral |

## 9. Components

### Primitives (`components/ui/`, based on shadcn/ui and Radix, restyled with tokens)

**Button**
- Variants:
  - `default`: primary pink, one per view
  - `secondary`
  - `outline`
  - `ghost`
  - `link`
  - `destructive`: always has a text label, and the action is confirmed in a dialog
- Sizes:
  - `sm`: 36 px
  - `default`: 40 px
  - `lg`: 48 px, for public calls to action and touch
  - `icon`: 40 × 40

**Badge**
- Variants: `neutral`, `brand`, `success`, `warning`, `danger`, `info`, `outline`.
- It is a `<span>`, so it can sit inside text.

**Alert (banner)**
- Variants: `info`, `warning`, `danger`, `success`, plus a plain `default`.

**Already themed through tokens:** Input, Label, Table, Card, Dialog, Select, Tabs, Popover, Command and the other primitives.

### Product components (`components/ds/`)
| Component | What it shows |
|---|---|
| `PriceTag` | Amount, "dès" when it is a lowest fare, and "observé le" with the date. |
| `FreshnessBadge` | How recently data was verified, coloured by age. |
| `RouteTitle` | Origin, arrow icon, destination (the screen reader hears "à"), as a heading or inline. |
| `AirlineMark` | IATA code chip and airline name. |
| `DayStrip` | Operating days L M M J V S D: flying days tinted, other days faded, one day solid (`highlight`: the date searched or the next departure). Letters and the spoken sentence can be passed in for English. |
| `Stepper` | A small count chosen with − and + (travellers, 1 to 9): two 40 px round buttons, the value between them, announced when it changes. Replaces a select for counts. |
| `Logo`, `LogoMark` | Brand (in `components/brand/`). |

**Search and home** (2026-10-31)
| Component | What it shows |
|---|---|
| `AirportCombobox` | Airport picker. Accepts a label or a bare IATA code (from a URL); each airport in the list shows the city, the airport name and province, and the code on the right; closed or restricted airports stay selectable with a badge (`AirportStatusBadge`). Two looks: `field` (label above a bordered field, in forms) and `segment` (a row of the search card). It can be opened from outside (`open`), leave one airport out (`exclude`) and report a pick (`onPick`). On a touch screen the list opens without focusing its search box, so the keyboard does not cover the list; typing is one tap away. |
| `AirportStatusNotice` (`components/search/`) | A danger or warning alert for each chosen airport that is closed or restricted: status, since when, note, source link. Shown on selection and stays visible when the search finds nothing. |
| `SearchForm` (`components/search/`) | **The search card** (P-17), used by the home, `/vols` and route pages. One white card; each field is a row 56 px tall (64 px from 1024 px) with an icon on the left (take-off, landing, calendar) and its label inside: empty, the row reads "Ville de départ"; filled, "Départ" sits small above "Kinshasa FIH". The swap button is a 36 px circle on the line between departure and arrival. The pink button closes the card, inside an 8 px margin. Phones and tablets stack the rows (178 px without the date, 237 px with it; the v1 form was 314 and 426 px); from 1024 px it is one row, the swap button on the line between the two cities (at 768 px the cities were cut short beside the date). **Choosing the departure opens the arrival list straight away**, on the arrival already chosen if there is one, otherwise on the first airport; the departure is left out of the arrival list, and choosing the current arrival as departure clears the arrival. Inspired by Skyscanner's compact form (owner's reference), not copied. |
| `HomeSearch` (`components/home/`) | The search card without a date, on the hero. **No date and no round-trip option**: results show the next days with flights, and the swap button is the return trip. |
| Home sections (`components/home/HomeSections.tsx`) | Hero, next departures (dated cards), tracked routes, airport status, how we work. Each data section is hidden when it has no data. |

### Planned (built with the route workspace, see [ROUTE-MODEL.md](ROUTE-MODEL.md))
- **Public:**
  - RouteCard
  - ScheduleTable
  - NextDepartures
  - FareHistory (sparkline)
  - StatusBanner, bound to airport and airline status
  - SourceList
- **Back office:**
  - RouteBoard row
  - CalendarGrid (weeks × days)
  - ApplyScheduleDialog
  - FareQuickEntry
  - ChangeHistory

## 10. Public site vs back office

| | Public site | Back office |
|---|---|---|
| Designed for | Android phone, slow and expensive data | Desktop or laptop, all day |
| Layout | Single column, 16 px gutters, cards | Left sidebar (240 px, docks to a 64 px icon rail), wide tables, side panels |
| Touch / click targets | 48 px for main actions | 36–40 px |
| Density | Roomy, one idea per block | Dense: table rows about 40 px, many columns |
| Input | Taps, few fields | Keyboard first (shortcuts planned), inline editing |
| Language | French first, English second | French |
| Images | None needed on data pages; OG image for sharing on WhatsApp | None |

The back office still works on a phone (simple menu), but it is not designed for one, as decided by the owner on 2026-10-30.

### Navigation

**Public navbar** (updated 2026-10-31, P-12; Accueil added in RW-2 at the owner's request):
- **Left:** logo (home). **Centre:** sections: Accueil, À propos, Contact. Compagnies, Aéroports and État du réseau join when their pages exist (E-1 → E-3 in [PLAN.md](PLAN.md#stage-4-publish)). **Right:** the **"Rechercher un vol"** button, then the language.
- The button is the one way to the search. No nav link may lead to the same page: since RW-5 the search and the route index are one page (`/vols`), so there is no "Vols" link.
- On a page with a search form (`id="recherche"`, from `SEARCH_ANCHOR` in `lib/links.ts`), the button scrolls back to the form and focuses "Départ", without motion if the visitor prefers reduced motion. Elsewhere it opens `/vols`.
- No request link: help is offered after a search finds nothing, on the contact page and in the footer.
- Height: 56 px on phones, 64 px from 640 px (P-17).
- On phones (P-16, owner 2026-11-02; below 640 px): logo, then a **round, light pink search icon** (40 px; light so the page's own pink button stays the one to press), then a **borderless round menu icon**. From 640 px the full "Rechercher un vol" button. On a page with a search card, the search icon scrolls to it and focuses "Départ".
- **Phone menu** (opens from the right, at most 20 rem): the logo and a close button in a 64 px header; the sections as large links with an icon, the current page on a light pink background; one full-width "Rechercher un vol" button (it closes the menu, then scrolls to the page's search if there is one); at the bottom, a **Français | English switch** (two buttons, `aria-pressed`), WhatsApp and "Signaler une erreur" (with the current page). The panel itself takes focus when it opens, so no control shows a focus ring after a tap.

**Back-office sidebar** (2026-10-31): grouped, with icons that match their meaning.
| Group | Items |
|---|---|
| (top) | Tableau de bord |
| Données de vol | Routes (route), Programmes de vol (calendar; goes in RW-7), Compagnies (plane), Aéroports (pin) |
| Clients | Demandes (inbox), Messages (speech bubble) |
| Administration | Système de design (palette); Utilisateurs and Paramètres when those pages exist (O-11, O-12) |

- **Docking:** the sidebar collapses to a 64 px icon rail with tooltips. Toggle with the button at the bottom or **Ctrl+B / ⌘B**. The choice is kept in the `bo_sidebar` cookie, so the server renders the right width with no flash.
- Groups show their label when expanded and a thin divider when docked.

**Back-office edit screens** (P-12; `components/backoffice/FormParts.tsx`):
- Header: back link to the list, the record's name, its status badge.
- Two columns on desktop: what the record *is* on the left (identity, position, links), what the public *sees* on the right (status, visibility), with a live preview where the public sees something (the airport warning).
- Every field has a label above it, "(facultatif)" when optional, and one line under it that shows the hint or, after a failed save, the error.
- A sticky action bar: Enregistrer (disabled until something changes), Annuler, and Supprimer on the far right behind a confirmation.
- Server errors appear at the top in a danger alert, in French, saying what to do instead (for example "changez plutôt son statut").

**Search results** (P-13; `components/search/`):
- **Card:** airline name on top; its logo in a tile on the left (the code when there is none); times large with airport codes under them; duration, a line and "Direct" or "1 escale" in the middle; price ("dès 244 $", "relevé le 30 oct.") and "Voir le vol" on the right. On phones, price and button move to a bar at the bottom. The whole card is one link target (the button's area is stretched over the card).
- **What stays off the card:** flight number, aircraft, stop names (in a tooltip) and sources. They are on the airline page. The date is not repeated when the visitor chose one; otherwise "Prochain vol : dim. 1 nov.".
- **Sort tabs:** four cells (two by two on phones), each with the value of its first result, so the trade-off shows before clicking. The selected tab is filled with the brand colour.

**Route pages** (RW-5; `components/vols/`, see [ROUTE-MODEL.md §7](ROUTE-MODEL.md#7-what-the-public-site-shows)):
- **Every page starts the same way:** breadcrumbs, one H1 ("Vols Kinshasa → Lubumbashi", "CAA : Kinshasa → Lubumbashi"), one answer line (airlines, flights this week, lowest price with its date). Warnings (closed airport, suspended airline or route) come next, above everything else.
- **Every page ends the same way** (`PageFacts`, owner 2026-11-02): "Mis à jour le · Horaires vérifiés le · Sources", then "Une information fausse ou dépassée ? Signalez-la" and the disclaimer. Dates are `<time>` elements. The link opens the contact form on "Signaler une erreur" with the **message started** ("Page : Kinshasa – Lubumbashi · CAA, mardi 10 novembre 2026, 08:00 / Ce qui est faux : ", cursor after it; `?sujet=erreur&page=…&titre=…`); the started text alone cannot be sent.
- **Route page** (`/vols/a-b`, order by the owner, 2026-11-02): the answer and alerts; the **search box** filled with the route; "Par compagnie", one card per airline that is a single link (days, flights this week, latest price; the departure times from 640 px only, so cards keep one height on phones); "Départs" and the results; the return trip; then "À propos de ce trajet" (airports, time difference) beside "Besoin d'aide pour ce trajet ?".
- **Airline card on phones** (P-17): the logo, then the name and the days beside it; under a line, the flights this week on the left and the price with a chevron on the right. "Tout sur … pour ce trajet" shows from 640 px (the whole card is the link). About 135–160 px tall instead of 190–230.
- **Search on a route page** (`RouteSearch`): the same search card as the home, filled with the route, plus the date (owner, 2026-11-02, P-17). It replaced the one-line summary of P-16, which existed only because the old form was 430 px tall: the card is 237 px at 390 px wide and the first airline card still ends on the first screen (at 663 px). From 1024 px it is one row. On phones the date hint ("Facultatif…") is for screen readers only: "Toutes les dates" already says it.
- **Airline page** (`/vols/a-b/caa`): the departure in full (times block, then duration, number, aircraft and flying days). Above it, when the airline flies the route more than once that day, the departure times as chips; under it, the next 14 dates as chips. Then the airline's services on the route, its note, and every validated price with its fare name, kind, travel date, source and the date it was seen. Beside it, "Réserver ce vol" (see Booking request below). Never a link to the airline's booking page.
  - **On phones** (P-17): the header is the logo with the full name in grey, the title, the answer and "Comparer les compagnies sur ce trajet". Time and date chips sit on one line that swipes (the 14 dates took five lines), the selected one brought into view. In the departure block, the times are the only large figures (28 px); airport codes 14 px, airport names and the stop line 12 px; the facts have sentence-case labels ("Numéro de vol", no capitals). Every row of "Vols et horaires" has the same shape: times and days on one line, then duration, stops and number.
- **Breadcrumbs** (P-17): always one line. When the trail is too long, the crumb before the current page (the route) ends with "…"; 13 px on phones.
- **Hub** (`/vols`): the search box, then the routes grouped by departure city, each with its airlines (sorted by name), flights this week and lowest price. On phones each city is one list with a line between rows (P-17); from 640 px, a grid of cards. Route names in lists are semibold, not bold.
- **Booking request** (`components/search/BookingRequest.tsx`, P-15): a header naming the departure ("CAA · lun. 9 nov. · 08:00 – 12:30 · BU 1633"); the price with its date when one was seen, otherwise one line saying the team gives it on the call; travellers (`Stepper`, 1 to 9) and class as two label-left rows; name; **phone only**, with "Nous vous rappelons à ce numéro, par appel ou sur WhatsApp"; errors under the field they concern; the button, then "Aucun paiement maintenant…". On phones: a bar fixed at the bottom with one centred button; it opens the form as a **sheet from the bottom**, fields scrolling and the button pinned to the bottom edge (safe-area aware).
- **Date in the search** (`components/vols/DateField.tsx`, P-15): a field like the airport pickers (calendar icon, "Toutes les dates" when empty, a clear button). It opens our calendar: weeks start Monday, past days off, today outlined, selected day filled pink; on a route page, the days with a known flight have a pink dot (white on the selected day) and the footer explains it. Phones: a sheet from the bottom with 44 px days. Wider screens: a popover. Never the browser's date input.
- **Text, not glyphs:** "–" between city names in running text and breadcrumbs; the arrow is the `RouteTitle` icon (the brand font has no "→").

**Back-office home** (B-1; `components/backoffice/DashboardHome.tsx`):
- A row of four figures first. Each is a label, a value in the body sans with proportional figures, and one line of context; the whole tile links to where the work is. No change arrows without a real earlier figure to compare with.
- One meter: the brand colour fills a lighter step of the same colour, with a tick at the target and the target written under it.
- Then what needs work, most important first, each panel with its count and "Tout voir" to the filtered list. An empty panel says what is fine ("Toutes les routes ont été vérifiées…"), it does not disappear.
- Recent activity last. On phones each line stacks: time and route, then what happened.

**Review queues** (RW-4): what waits for a decision sits in an amber box above the settled list, with the count and "importés ou repris, pas encore publics". Each row has *Valider* and *Rejeter*; the box has *Tout valider* / *Tout rejeter*, which turn into "… la sélection (n)" once rows are ticked. Rejected rows stay, faded, behind a "Afficher les rejetés" toggle.

**Bulk actions** (RW-3; `components/backoffice/workspace/`):
- **Preview before saving.** A bulk action shows a live preview as the form changes: what will be added, changed, already up to date, or skipped with the reason. The save button says how many records it writes ("Enregistrer (6 vols)") and stays disabled when there is nothing to write.
- **Name the action after it ran.** The toast and the "Dernière action" line give one French sentence ("Horaire ET 60 08:00–11:30 (lundi, mercredi et samedi) du 2 nov. au 8 nov. : 3 vols ajoutés").
- **"Défaire", not "Annuler".** "Annuler" cancels flights. Undoing asks for confirmation and shows what will be reverted.
- **Calendar:** weeks start on Monday, today is outlined, past days are dimmed but still editable. Cancelled flights stay visible, struck through; imported flights waiting for review get a dashed border.

## 11. Writing

- **French first.** Plain, factual, short sentences. Write as an informed friend, not an advert.
- **Say what we are and what we aren't.** "Nous ne vendons pas de billets." "Prix indicatifs."
- **Dates and sources beat adjectives.** Write "Prix observé le 30 oct. sur air-congo.com", not "Meilleurs prix garantis".
- **Same words everywhere.** Use these terms consistently:
  - vol
  - escale
  - compagnie
  - prix observé
  - dès
  - vérifié le
  - à revérifier
  - fermé
  - suspendu
- **Errors say how to fix them:** "Format attendu : code compagnie + numéro (BU 1611)."
- **Numbers as digits**, in the formats from [Data display rules](#8-data-display-rules).

## 12. Accessibility checklist

Target: **WCAG 2.2 AA**. Check every new screen against this list:
- [ ] Contrast pairs pass (`npm run tokens`).
- [ ] Everything works with the keyboard, and focus is visible (pink ring).
- [ ] Status is never shown by colour alone.
- [ ] Every input has a visible `<label>`; errors are linked with `aria-describedby`.
- [ ] Main touch targets on the public site are 48 px.
- [ ] Icons are either labelled or hidden (`aria-hidden`).
- [ ] Data tables use real `<table>` with header cells.
- [ ] Reduced motion is respected.
- [ ] `lang="fr"` on French pages; English pages get `lang="en"` (F-1).

## 13. Mobile app later

A native app is item **P-8** in the plan, and only if usage justifies it. The system is set up so that an app would not start from zero:
- **Tokens:** `design/tokens.json` is platform-neutral (DTCG). A second generator can write a React Native theme from the same file.
- **Font:** Plus Jakarta Sans is open source (OFL) and can be bundled in an app.
- **Icons:** Lucide exists for React Native.
- **Components:** this document defines each component by what it shows and how it behaves. That definition carries over to an app, even though the CSS does not.

## 14. Changing the system

1. Edit `design/tokens.json` (or a component).
2. Run `npm run tokens`. It regenerates `app/tokens.css` and checks contrast.
3. Open `/dashboard/design` and check the change visually.
4. Update this document (rules, tables, changelog).
5. Open a PR. The build fails if the tokens and the CSS are out of sync, or if a contrast pair fails.

## 15. Decisions and changelog

| Date | Decision | Why |
|---|---|---|
| 2026-10-30 | Brand Clerikaa, pink and white, blue for information only | Owner's direction. Pink kept apart from danger red (hue 359° vs 27°). |
| 2026-10-30 | Plus Jakarta Sans, one variable file | Measured: 27 KB, tabular figures, full French glyph coverage. |
| 2026-10-30 | Tokens in DTCG JSON, CSS generated, contrast checked in the build | One source for web and a future app; accessibility can't regress silently. |
| 2026-10-30 | Tailwind default palette removed | Stops off-system colours. |
| 2026-10-30 | Light theme only in v1 | Halves design and QA work. Phones are used outdoors in bright light. Roles make dark mode a later, contained change. |
| 2026-10-30 | Back office: desktop-first, French | Agencies work on computers all day (owner). French is the working language of DRC agencies. |
| 2026-10-30 | No airline logos | No permission yet; codes and names are neutral. Replaced 2026-10-31: logos shown (owner). |
| 2026-10-31 | Navbar lists sections, not actions; search lives in the home hero | Owner: the search link and the search button led to the same page, and the request form isn't our main job. |
| 2026-10-31 | Search asks for no date, one way only | Owner: show the next days with flights instead of "no flight on that date". |
| 2026-10-31 | Nothing moves on its own | Owner: the carousel moved too fast and showed no dates. |
| 2026-10-31 | Back-office sidebar grouped and dockable | Owner. |
| 2026-11-02 | Phones get sheets from the bottom, with the main button on the bottom edge (booking request, calendar); counts use − and +; forms ask for a phone, not an email | Owner: the centred dialog left empty space under its button; the native date input looked basic. |
| 2026-11-02 | Page dates and sources go at the bottom of route and airline pages | Owner. |
| 2026-11-02 | Route page: search box, then airlines, then departures; ~~on phones the search is one line that opens the form~~ (replaced in P-17 by the search card) | Owner chose the order; the one line kept the airlines on the first screen of a phone while the form was 430 px tall. |
| 2026-11-02 | Phone navbar: round search icon, borderless menu icon, a fuller menu (large links, one button, language switch, WhatsApp, report) | Owner: the navbar did not look premium on phones (review in P-15). |
| 2026-11-02 | Phones get a smaller step of the type scale for headings and lead lines (`TYPE`); tighter spacing between blocks; the search becomes one card of 56 px rows; choosing the departure opens the arrival list | Owner (P-17): text was larger than needed on phones, too much white space, the search form looked dated next to Skyscanner's compact one, and picking the arrival should follow picking the departure. Measured at 390 × 844: home search card 314 → 178 px, "Prochains départs" from 1027 → 629 px; route page results from 898 → 686 px. Body text stays 16 px. |
| 2026-11-02 | Route pages show the same search card as the home (with the date), on phones too; the one-line summary is gone | Owner (P-17): the route page's search should match the landing page's. The card is short enough to keep the first airline on the first screen. |
| 2026-11-02 | Airline page on phones: fewer type sizes, sentence-case labels, chips on one swipeable line, one shape for every schedule row; French punctuation with non-breaking spaces everywhere; branded 404 in French | Owner (P-17): "a typography mess" on the airline page on phones; lines ended on a lone "?" and dates split across lines. |

**Changelog**
- **v1 (2026-10-30):**
  - tokens, font, logo and icons
  - primitives restyled
  - product components: PriceTag, FreshnessBadge, RouteTitle, AirlineMark, DayStrip
  - `/dashboard/design` reference page
  - the old Le Bourgeois assets removed
- **v1.1 (2026-10-31):**
  - home rebuilt: hero surface with search, next departures, tracked routes, airport status, how we work
  - `AirportStatusNotice`, `AirportStatusBadge`, `HomeSearch`
  - public navbar and footer reorganised; back-office sidebar grouped and dockable
  - `formatDayMonthYear` ("6 juin 2026") added to `lib/format.ts`
- **v1.2 (2026-11-02, P-15):**
  - `Stepper` (counts with − and +), `DateField` (our calendar, sheet on phones), `PageFacts` (dates, sources and "Signaler une erreur" at the end of route and airline pages)
  - booking request redesigned, phone only; phones get it as a sheet from the bottom
  - `/about` rebuilt (problem, offer, method, limits, intention, participation); footer columns Explorer · Clerikaa · Participer
- **v1.4 (2026-11-02, P-17):**
  - `TYPE` (`components/ds/typography.ts`): display, title, headline, section and lead, phone size first; every public heading uses it
  - `SearchForm`: the search card shared by the home, `/vols` and route pages; `AirportCombobox` `segment` look, `open`/`onPick`/`exclude`; `DateField` restyled as a row of the card
  - departure → arrival: the arrival list opens by itself; touch screens open the lists without the keyboard
  - phones: navbar 56 px, tighter block spacing, shorter airline cards, smaller times in the departure block, hero route chips on one swipeable row
  - route pages: the search card replaces the one-line summary (`RouteSearch` lost `summary`)
  - airline page: departure block with fewer sizes and sentence-case labels, chips on one swipeable line, schedule rows of one shape, "Aller simple" capitalised, shorter "compare" link
  - breadcrumbs on one line; `/vols` routes as one list per city on phones; page facts keep dates and addresses whole; footer spacing tightened on phones
  - French non-breaking spaces before `: ; ! ?` and inside `« »` (55 + 6 in `fr.json`)
  - 404 page in French with the navbar, footer, mark and two ways forward
- **v1.3 (2026-11-02, P-16):**
  - phone navbar and menu redesigned; `SheetContent` takes `showClose={false}` when the content has its own close button
  - `RouteSearch` `summary`: the search as one line on phones
  - "Signaler une erreur" starts the contact message with the page
