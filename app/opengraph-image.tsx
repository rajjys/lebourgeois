import { ImageResponse } from "next/og";
import { OG_SIZE, SiteCard, ogFonts } from "@/lib/og";
import { SITE_IMAGE_ALT } from "@/lib/seo";

// Link preview for the home, /vols, /about and every page without its own image. Route and airline
// pages draw theirs from their data (app/(public)/vols/[route]/opengraph-image.tsx).
export const alt = SITE_IMAGE_ALT;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(<SiteCard />, { ...size, fonts: await ogFonts() });
}
