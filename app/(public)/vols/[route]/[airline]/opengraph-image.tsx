import { ImageResponse } from "next/og";
import { formatDayMonthYear, formatPrice, formatWeekdays } from "@/lib/format";
import { OG_SIZE, ShareCard, SiteCard, logoDataUrl, ogFonts } from "@/lib/og";
import { loadAirlinePage } from "@/lib/routePages";

/**
 * One airline on one route (F-2): its logo, the route, its days and flights this week, its latest
 * price with the day it was seen. The same facts as the page's answer line.
 */
export const revalidate = 3600;
export const alt = "La compagnie sur ce trajet : jours de vol, vols de la semaine et prix observé, sur Clerikaa";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ route: string; airline: string }> }) {
  const { route, airline } = await params;
  const fonts = await ogFonts();
  const data = await loadAirlinePage(route, airline, null, null);
  if (!data) return new ImageResponse(<SiteCard />, { ...size, fonts });

  const latest = data.fares[0];
  const facts = data.departures.length
    ? `Vole ${formatWeekdays(data.days)} · ${data.flightsThisWeek} vol${data.flightsThisWeek > 1 ? "s" : ""} cette semaine`
    : "Aucun vol connu pour les quatre prochaines semaines";

  return new ImageResponse(
    <ShareCard
      eyebrow={data.airline.name}
      logo={await logoDataUrl(data.airline.logo)}
      origin={data.origin.city}
      destination={data.destination.city}
      facts={facts}
      price={latest ? { amount: formatPrice(latest.amount), observed: `observé le ${formatDayMonthYear(new Date(latest.observedAt))}` } : null}
    />,
    { ...size, fonts },
  );
}
