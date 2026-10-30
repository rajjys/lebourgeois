import { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE.url}/explore`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/request`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE.url}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
