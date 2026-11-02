import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { AirlinePageView } from "@/components/vols/AirlinePageView";
import { formatDayMonthYear, formatPrice, formatWeekdays, shortAirlineName } from "@/lib/format";
import { loadAirlinePage } from "@/lib/routePages";
import { dateParam, timeParam } from "@/lib/routeSlug";
import { pageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ route: string; airline: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const getPage = cache((route: string, airline: string, date: string | null, time: string | null) => loadAirlinePage(route, airline, date, time));

async function read({ params, searchParams }: Props) {
  const [{ route, airline }, query] = await Promise.all([params, searchParams]);
  return getPage(route, airline, dateParam(query.date), timeParam(query.heure));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const data = await read(props);
  if (!data) return { title: "Page introuvable", robots: { index: false } };
  const { origin, destination } = data;
  const name = shortAirlineName(data.airline.name);
  const times = [...new Set(data.services.map((s) => s.departureTime))].sort();
  const price = data.fares[0];
  const description = data.departures.length
    ? [
        `${name} vole ${formatWeekdays(data.days)} de ${origin.city} à ${destination.city}`,
        // Up to three times are listed; more read as a range, so the description stays under ~160
        // characters (CAA Kinshasa – Lubumbashi listed ten times: 205 characters, cut by Google).
        times.length > 3
          ? `départs entre ${times[0]} et ${times[times.length - 1]}`
          : times.length > 0 && `départ${times.length > 1 ? "s" : ""} à ${times.join(", ")}`,
        // With the year: search results and link previews are kept for months (F-2).
        price && `dès ${formatPrice(price.amount)} (observé le ${formatDayMonthYear(new Date(price.observedAt))})`,
      ]
        .filter(Boolean)
        .join(", ") + ". Horaires vérifiés et demande de réservation."
    : `${name} n'a pas de vol connu de ${origin.city} à ${destination.city} pour les quatre prochaines semaines.`;
  return pageMetadata({
    title: `${name} ${origin.city} – ${destination.city} : horaires, jours de vol et prix`,
    description,
    // ?date= and ?heure= only pick the departure shown.
    // No " | Clerikaa", as on the route page: the route words must fit before Google cuts the title.
    absoluteTitle: true,
    path: `/vols/${data.routeSlug}/${data.airline.slug}`,
    ownImage: true,
    robots: data.indexable ? undefined : { index: false, follow: true },
  });
}

/** /vols/kinshasa-lubumbashi/caa: one airline on one route, a departure and its booking request. */
export default async function AirlineRoutePage(props: Props) {
  const data = await read(props);
  if (!data) notFound();
  return <AirlinePageView data={data} />;
}
