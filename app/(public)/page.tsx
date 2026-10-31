import type { Metadata } from "next";
import { HomeView } from "@/components/home/HomeSections";
import { getHomeData } from "@/lib/home";
import { SITE } from "@/lib/site";

// Departures are computed from "now", so the page is rebuilt at most every 10 minutes.
export const revalidate = 600;

export const metadata: Metadata = {
  title: { absolute: `Horaires et prix indicatifs des vols en RDC | ${SITE.name}` },
  description: SITE.description,
  alternates: { canonical: "/" },
};

export default async function Home() {
  const data = await getHomeData();
  return <HomeView data={data} />;
}
