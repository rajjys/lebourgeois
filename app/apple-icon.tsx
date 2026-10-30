import { ImageResponse } from "next/og";
import { MARK_DOT, MARK_PATH } from "@/components/brand/Logo";

// iOS rounds the corners itself, so this one is a full square.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#d02c75"/><path d="${MARK_PATH}" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><circle cx="${MARK_DOT.cx}" cy="${MARK_DOT.cy}" r="${MARK_DOT.r}" fill="#fff"/></svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    <img width={180} height={180} alt="" src={`data:image/svg+xml,${encodeURIComponent(svg)}`} />,
    size,
  );
}
