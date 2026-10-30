import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

// Link preview shown on WhatsApp, Facebook, X, etc. Built from SITE so a rename updates it.
export const alt = `${SITE.name} — Horaires et prix des vols intérieurs en RDC`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background: "#0b3b5c",
          color: "white",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, opacity: 0.9 }}>{SITE.name}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
            Vols intérieurs en RDC
          </div>
          <div style={{ fontSize: 36, opacity: 0.85 }}>
            Compagnies, jours de vol, horaires et prix indicatifs
          </div>
        </div>
        <div style={{ fontSize: 30, opacity: 0.7 }}>Kinshasa · Lubumbashi · Kisangani · Kalemie · Bunia · Beni</div>
      </div>
    ),
    size
  );
}
