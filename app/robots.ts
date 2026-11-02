import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Never crawled: the back office, the API and the login page. */
const PRIVATE = ["/dashboard", "/api/", "/login"];

/**
 * AI crawlers, allowed by name (docs/SEO-AEO-GEO.md §8, F-6). Search and user-requested fetches put
 * us in ChatGPT, Perplexity and Claude answers; the training tokens (GPTBot, ClaudeBot,
 * Google-Extended, Applebot-Extended) are allowed too (owner, 2026-11-02): the data is public, and
 * being known to the models helps citations. Revisit before licensing data to agencies (M8).
 *
 * A crawler that finds its own name obeys that group only and skips "*", so the group repeats the
 * private paths.
 */
const AI_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "PerplexityBot",
  "Perplexity-User",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
];

// Built from SITE.url, so a domain move needs no edit here.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
