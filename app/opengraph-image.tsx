import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";
import { MARK_DOT, MARK_PATH } from "@/components/brand/Logo";

// Link preview shown on WhatsApp, Facebook, X, etc. Built from SITE so a rename updates it.
export const alt = `${SITE.name} — Horaires et prix des vols intérieurs en RDC`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#d02c75"/><path d="${MARK_PATH}" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><circle cx="${MARK_DOT.cx}" cy="${MARK_DOT.cy}" r="${MARK_DOT.r}" fill="#fff"/></svg>`;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#fff2f7",
          color: "#252023",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img width={72} height={72} alt="" src={`data:image/svg+xml,${encodeURIComponent(mark)}`} />
          <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1 }}>{SITE.name.toLowerCase()}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Vols intérieurs en RDC</div>
          <div style={{ fontSize: 36, color: "#70686d" }}>Compagnies, jours de vol, horaires et prix observés</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#b11f60", fontWeight: 600 }}>
          Kinshasa · Lubumbashi · Kisangani · Mbuji-Mayi · Kolwezi · Kalemie
        </div>
      </div>
    ),
    size
  );
}
