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
| Role | Class | Size | Use |
|---|---|---|---|
| Display | `text-4xl font-extrabold tracking-tight` | 36 | Home hero only |
| Page title (h1) | `text-3xl font-bold tracking-tight` | 30 | One per page |
| Section (h2) | `text-xl font-bold tracking-tight` | 20 | |
| Subhead | `text-base font-semibold` | 16 | Card titles, airline names |
| Body | `text-base` | 16 | Never smaller on the public site |
| Meta | `text-sm text-muted-foreground` | 14 | Sources, dates, captions |
| Caption | `text-xs text-muted-foreground` | 12 | Table notes, timezone hints |

On phones, page titles step down one size (`text-2xl md:text-3xl`).

### Rules
- **Numbers line up.** Times, prices and flight numbers use tabular figures. `<time>` and `<data>` get this automatically, and elsewhere use `tabular-nums`.
- **Sentence case** for titles and buttons ("Voir les vols", not "Voir Les Vols").
- **French punctuation.** French uses a non-breaking space before `: ; ! ?` and inside `« »`. The `Intl` formatters already handle numbers and currency.

## 6. Space, shape and elevation

- **Spacing:** 4 px grid (Tailwind's default scale). Common steps:
  - 8 px inside controls
  - 16 px page gutter on phones
  - 24 px between related blocks
  - 40 px between page sections
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
- **No airline logos** until we have permission to use them. `AirlineMark` shows the IATA code and the airline's name instead.
- **Motion:** at most 150–200 ms, used for state changes only (hover, open, close). `prefers-reduced-motion` turns all of it off (`app/globals.css`).

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
| `DayStrip` | Operating days L M M J V S D. |
| `Logo`, `LogoMark` | Brand (in `components/brand/`). |

### Planned (built with the route workspace, see [ROUTE-MODEL.md](ROUTE-MODEL.md))
- **Public:**
  - SearchBox (origin and destination)
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
| Layout | Single column, 16 px gutters, cards | Fixed left sidebar (240 px), wide tables, side panels |
| Touch / click targets | 48 px for main actions | 36–40 px |
| Density | Roomy, one idea per block | Dense: table rows about 40 px, many columns |
| Input | Taps, few fields | Keyboard first (shortcuts planned), inline editing |
| Language | French first, English second | French |
| Images | None needed on data pages; OG image for sharing on WhatsApp | None |

The back office still works on a phone (simple menu), but it is not designed for one, as decided by the owner on 2026-10-30.

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
| 2026-10-30 | No airline logos | No permission yet; codes and names are neutral. |

**Changelog**
- **v1 (2026-10-30):**
  - tokens, font, logo and icons
  - primitives restyled
  - product components: PriceTag, FreshnessBadge, RouteTitle, AirlineMark, DayStrip
  - `/dashboard/design` reference page
  - the old Le Bourgeois assets removed
