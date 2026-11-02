import type { Metadata } from "next";
import { SITE } from "@/lib/site";

/**
 * Search and share metadata for a public page (docs/SEO-AEO-GEO.md §4).
 *
 * Next.js merges metadata shallowly: a page that sets `title` and `description` but no `openGraph`
 * inherits the root layout's whole `openGraph` and `twitter` objects. Until F-2 every page was shared
 * on WhatsApp with the home's title, description and link. Every public page builds its metadata
 * here, so the title, description and address shown in a search result and in a link preview are
 * always the page's own.
 *
 * Share images: a page that sets `openGraph` loses the root image file too, so the site's image is
 * named here by default. Route and airline pages have their own `opengraph-image` file under
 * app/(public)/vols and pass `ownImage`: a page's `openGraph.images` would override its segment's
 * file. X/Twitter takes the same image (Next.js copies it when `twitter.images` is not set).
 */
export const SITE_IMAGE_ALT = `${SITE.name} : horaires et prix des vols intérieurs en RDC`;
const SITE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: SITE_IMAGE_ALT, type: "image/png" };

export const OPEN_GRAPH_BASE = {
  siteName: SITE.name,
  locale: "fr_CD",
  type: "website",
} as const;

export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  shareTitle,
  robots,
  ownImage = false,
}: {
  /** The page's <title>. The layout adds " | Clerikaa" unless `absoluteTitle`. */
  title: string;
  description: string;
  /** Canonical path, also the shared address: "/vols/kinshasa-lubumbashi". */
  path: string;
  absoluteTitle?: boolean;
  /** Title in link previews, where the site name is shown apart; defaults to `title`. */
  shareTitle?: string;
  robots?: Metadata["robots"];
  /** The page's segment has its own opengraph-image file. */
  ownImage?: boolean;
}): Metadata {
  const share = shareTitle ?? title;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { ...OPEN_GRAPH_BASE, title: share, description, url: path, ...(ownImage ? {} : { images: [SITE_IMAGE] }) },
    twitter: { card: "summary_large_image", title: share, description },
    ...(robots ? { robots } : {}),
  };
}
