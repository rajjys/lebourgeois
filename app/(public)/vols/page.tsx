import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HubView } from "@/components/vols/HubView";
import { loadHub, routeSlugForCodes } from "@/lib/routePages";
import { localNow } from "@/lib/routeStatus";
import { dateParam } from "@/lib/routeSlug";

export const metadata: Metadata = {
  title: "Vols intérieurs en RDC : toutes les routes, horaires et prix",
  description:
    "Toutes les routes intérieures suivies en RDC, par ville de départ : compagnies, vols de la semaine et prix observés avec leur date.",
  alternates: { canonical: "/vols" },
};

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

/** The routes hub. ?de=FIH&a=FBM is a search sent before the airport list loaded: it goes to the route page. */
export default async function VolsPage({ searchParams }: Props) {
  const { de, a, date } = await searchParams;
  if (typeof de === "string" && typeof a === "string") {
    const slug = await routeSlugForCodes(de.toUpperCase(), a.toUpperCase());
    const day = dateParam(date);
    if (slug) redirect(`/vols/${slug}${day ? `?date=${day}` : ""}`);
  }
  const now = new Date();
  const hub = await loadHub(now);
  return <HubView hub={hub} today={localNow("Africa/Kinshasa", now).day} />;
}
