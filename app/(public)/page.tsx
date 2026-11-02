import type { Metadata } from "next";
import { HomeView } from "@/components/home/HomeSections";
import { getHomeData } from "@/lib/home";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

// Departures are computed from "now", so the page is rebuilt at most every 10 minutes.
export const revalidate = 600;

export const metadata: Metadata = pageMetadata({
  title: `Horaires et prix indicatifs des vols en RDC | ${SITE.name}`,
  absoluteTitle: true,
  shareTitle: `${SITE.name} : horaires et prix indicatifs des vols en RDC`,
  description: SITE.description,
  path: "/",
});

/**
 * Organization (docs/SEO-AEO-GEO.md §5, MUST on the home): name, URL, logo and description, and the WhatsApp
 * number shown in the footer. No address (the site publishes none) and no `sameAs` until real profiles exist.
 */
const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: SITE.url,
  logo: `${SITE.url}/apple-icon`,
  description: SITE.description,
  contactPoint: { "@type": "ContactPoint", telephone: SITE.whatsapp, contactType: "customer service", availableLanguage: ["fr", "en"] },
};

export default async function Home() {
  const data = await getHomeData();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} />
      <HomeView data={data} />
    </>
  );
}
