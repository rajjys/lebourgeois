import type { Metadata } from "next";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { RoutePageView } from "@/components/vols/RoutePageView";
import { formatDayMonth, formatPrice, shortAirlineName } from "@/lib/format";
import { loadRoutePage } from "@/lib/routePages";
import { dateParam } from "@/lib/routeSlug";

type Props = {
  params: Promise<{ route: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Read once for the metadata and the page.
const getPage = cache((slug: string, date: string | null) => loadRoutePage(slug, date));

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const data = await getPage((await params).route, dateParam((await searchParams).date));
  if (!data) return { title: "Trajet introuvable", robots: { index: false } };
  const { origin, destination } = data;
  const flying = data.airlines.filter((a) => a.flightsThisWeek > 0 || a.next);
  const names = flying.map((a) => shortAirlineName(a.name));
  const flights = flying.reduce((n, a) => n + a.flightsThisWeek, 0);
  const cheapest = flying.map((a) => a.price).filter((p) => !!p).sort((a, b) => a!.amount - b!.amount)[0];
  const description = flying.length
    ? [
        `${names.join(", ")} : ${flights} vol${flights > 1 ? "s" : ""} cette semaine entre ${origin.city} et ${destination.city}`,
        cheapest && `dès ${formatPrice(cheapest.amount)} (observé le ${formatDayMonth(new Date(cheapest.observedAt))})`,
      ]
        .filter(Boolean)
        .join(", ") + ". Jours de vol, horaires vérifiés et prix observés, compagnie par compagnie."
    : `Aucun vol connu entre ${origin.city} et ${destination.city} pour les quatre prochaines semaines. Notre équipe peut chercher pour vous.`;
  return {
    title: `Vols ${origin.city} – ${destination.city} : horaires et prix${names.length ? ` (${names.join(", ")})` : ""}`,
    description,
    // ?date= narrows the same page: one address for search engines.
    alternates: { canonical: `/vols/${data.slug}` },
    // A route is indexed once the operator publishes it (docs/ROUTE-MODEL.md §7).
    robots: data.indexable ? undefined : { index: false, follow: true },
  };
}

/** /vols/kinshasa-lubumbashi: the route page, which is also the search result. */
export default async function RoutePage({ params, searchParams }: Props) {
  const { route } = await params;
  if (route !== route.toLowerCase()) permanentRedirect(`/vols/${route.toLowerCase()}`);
  const data = await getPage(route, dateParam((await searchParams).date));
  if (!data) notFound();
  return <RoutePageView data={data} />;
}
