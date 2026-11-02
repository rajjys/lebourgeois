import type { Metadata } from "next";
import { AboutView } from "@/components/about/AboutView";
import { loadHub } from "@/lib/routePages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "À propos : ce que fait Clerikaa, notre méthode et nos limites",
  shareTitle: "Clerikaa : l'information sur les vols intérieurs en RDC, vérifiée et datée",
  description:
    "Pourquoi Clerikaa existe, comment nous relevons, vérifions et datons les horaires et les prix des vols intérieurs en RDC, ce que nous ne faisons pas, et comment participer.",
  path: "/about",
});

// The figures change with the data, not with each visit.
export const revalidate = 3600;

/** Figures read from the same loader as /vols, so the two pages always agree. */
export default async function AboutPage() {
  const hub = await loadHub();
  const routes = hub.flatMap((g) => g.routes);
  const figures = {
    routes: routes.length,
    airlines: new Set(routes.flatMap((r) => r.airlines.map((a) => a.code))).size,
    flightsThisWeek: routes.reduce((n, r) => n + r.flightsThisWeek, 0),
  };
  return <AboutView figures={figures} />;
}
