import "server-only";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { MARK_DOT, MARK_PATH } from "@/components/brand/Logo";
import { SITE } from "@/lib/site";

/**
 * Link previews (WhatsApp, Facebook, X, LinkedIn): 1200 × 630, the size every one of them crops well.
 * Drawn in the brand font: next/og's default font has no bold, so the v1 image lost the wordmark's
 * weight (F-2). Colours are the design tokens (docs/DESIGN-SYSTEM.md §4).
 */
export const OG_SIZE = { width: 1200, height: 630 };

const COLOR = {
  background: "#fff2f7", // brand-50
  text: "#252023", // neutral-950
  muted: "#70686d", // neutral-600
  brand: "#b11f60", // brand-700
  primary: "#d02c75", // brand-600
  border: "#ffcce0", // brand-200
};

/** Plus Jakarta Sans, latin subset, from assets/fonts (OFL, see OFL.txt there). */
export async function ogFonts() {
  const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));
  const [medium, bold, extraBold] = await Promise.all([
    font("PlusJakartaSans-Medium.woff"),
    font("PlusJakartaSans-Bold.woff"),
    font("PlusJakartaSans-ExtraBold.woff"),
  ]);
  return [
    { name: "Jakarta", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "Jakarta", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Jakarta", data: extraBold, weight: 800 as const, style: "normal" as const },
  ];
}

/** Intl puts narrow no-break spaces in prices ("244 $"); the font subset draws a plain space. */
export const plain = (text: string) => text.replace(/[  ]/g, " ");

/**
 * An airline logo from public/ as a data URL, so the image needs no network. Null for remote logos
 * or a missing file: the card then shows the airline's name only.
 */
export async function logoDataUrl(logo: string | null | undefined) {
  if (!logo || !logo.startsWith("/")) return null;
  const type = { ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" }[extname(logo).toLowerCase()];
  if (!type) return null;
  try {
    const file = await readFile(join(process.cwd(), "public", logo));
    return `data:${type};base64,${file.toString("base64")}`;
  } catch {
    return null;
  }
}

const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${COLOR.primary}"/><path d="${MARK_PATH}" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><circle cx="${MARK_DOT.cx}" cy="${MARK_DOT.cy}" r="${MARK_DOT.r}" fill="#fff"/></svg>`;

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- drawn by next/og, where next/image does not apply */}
        <img width={64} height={64} alt="" src={`data:image/svg+xml,${encodeURIComponent(mark)}`} />
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>{SITE.name.toLowerCase()}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 500, color: COLOR.muted }}>{new URL(SITE.url).host}</div>
    </div>
  );
}

/** Origin → destination, the arrow drawn (the brand font has no "→"). */
function RouteLine({ origin, destination, size }: { origin: string; destination: string; size: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: size * 0.35, fontSize: size, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
      <span>{origin}</span>
      <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="none" stroke={COLOR.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
      <span>{destination}</span>
    </div>
  );
}

/**
 * The card shared for a route or an airline on a route: who flies, how often, the latest price with
 * its date, the same facts as the page's answer line, so the preview never says more than the page.
 */
export function ShareCard({
  eyebrow,
  logo,
  origin,
  destination,
  facts,
  price,
}: {
  /** Above the route: "Vols" or the airline's name. */
  eyebrow: string;
  logo?: string | null;
  origin: string;
  destination: string;
  /** One line: "Air Congo, CAA · 22 vols cette semaine". */
  facts: string;
  /** The amount ("244 $") and "observé le 30 octobre 2026", or null when no price was seen. */
  price: { amount: string; observed: string } | null;
}) {
  const long = origin.length + destination.length > 22;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: COLOR.background,
        color: COLOR.text,
        fontFamily: "Jakarta",
      }}
    >
      <Brand />
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {logo && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 132, height: 72, padding: 10, background: "#fff", borderRadius: 16, border: `2px solid ${COLOR.border}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- drawn by next/og, where next/image does not apply */}
              <img src={logo} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            </div>
          )}
          <div style={{ fontSize: 34, fontWeight: 700, color: COLOR.brand }}>{eyebrow}</div>
        </div>
        <RouteLine origin={origin} destination={destination} size={long ? 70 : 84} />
        <div style={{ fontSize: 34, fontWeight: 500, color: COLOR.muted }}>{plain(facts)}</div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", width: "100%" }}>
        {price ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span style={{ fontSize: 34, fontWeight: 500, color: COLOR.muted }}>dès</span>
              <span style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>{plain(price.amount)}</span>
            </div>
            <span style={{ fontSize: 28, fontWeight: 500, color: COLOR.muted }}>{plain(price.observed)}</span>
          </div>
        ) : (
          <div style={{ fontSize: 30, fontWeight: 500, color: COLOR.muted }}>Prix non relevé pour l&apos;instant</div>
        )}
        <div style={{ fontSize: 26, fontWeight: 700, color: COLOR.brand }}>Horaires vérifiés · prix datés</div>
      </div>
    </div>
  );
}

/** The site's own card (home, /vols, /about and pages without data). */
export function SiteCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: COLOR.background,
        color: COLOR.text,
        fontFamily: "Jakarta",
      }}
    >
      <Brand />
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Vols intérieurs en RDC</div>
        <div style={{ fontSize: 38, fontWeight: 500, color: COLOR.muted }}>Jours de vol, horaires vérifiés, prix observés</div>
      </div>
      <div style={{ display: "flex", fontSize: 30, color: COLOR.brand, fontWeight: 700 }}>
        Kinshasa · Lubumbashi · Kisangani · Mbuji-Mayi · Kolwezi · Mbandaka
      </div>
    </div>
  );
}
