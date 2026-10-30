import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Same rules as the old public/robots.txt, built from SITE.url so a domain move
// needs no edit here. AI crawler rules come with F-6 (docs/SEO-AEO-GEO.md).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/", "/login"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
