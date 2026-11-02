import { ImageResponse } from "next/og";
import { formatDayMonthYear, formatPrice, shortAirlineName } from "@/lib/format";
import { OG_SIZE, ShareCard, SiteCard, ogFonts } from "@/lib/og";
import { loadRoutePage } from "@/lib/routePages";

/**
 * The route's link preview (F-2): the route, who flies it, how many flights this week, the lowest
 * price with the day it was seen. The same facts as the page's answer line and meta description.
 * Rebuilt at most every hour, like the sitemap.
 */
export const revalidate = 3600;
export const alt = "Le trajet, ses compagnies, ses vols de la semaine et le prix observé, sur Clerikaa";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ route: string }> }) {
  const fonts = await ogFonts();
  const data = await loadRoutePage((await params).route, null);
  if (!data) return new ImageResponse(<SiteCard />, { ...size, fonts });

  const flying = data.airlines.filter((a) => a.flightsThisWeek > 0 || a.next);
  const flights = flying.reduce((n, a) => n + a.flightsThisWeek, 0);
  const cheapest = flying.map((a) => a.price).filter((p) => !!p).sort((a, b) => a!.amount - b!.amount)[0];
  const facts = flying.length
    ? `${flying.map((a) => shortAirlineName(a.name)).join(", ")} · ${flights} vol${flights > 1 ? "s" : ""} cette semaine`
    : "Aucun vol connu pour les quatre prochaines semaines";

  return new ImageResponse(
    <ShareCard
      eyebrow="Vols"
      origin={data.origin.city}
      destination={data.destination.city}
      facts={facts}
      price={cheapest ? { amount: formatPrice(cheapest.amount), observed: `observé le ${formatDayMonthYear(new Date(cheapest.observedAt))}` } : null}
    />,
    { ...size, fonts },
  );
}
