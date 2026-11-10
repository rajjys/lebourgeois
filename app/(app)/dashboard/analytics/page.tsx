import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { AnalyticsView } from "@/components/backoffice/AnalyticsView";
import { CHANNELS } from "@/lib/analytics/channel";
import { resolvePeriod } from "@/lib/analytics/period";
import { filterOptions, loadAnalytics, type Filters } from "@/lib/analytics/report";
import { localNow } from "@/lib/routeStatus";

export const metadata: Metadata = { title: "Statistiques" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : null);

/** /dashboard/analytics: visits, sources, routes and requests (AN-2, docs/ANALYTICS.md). Read on every visit. */
export default async function AnalyticsPage({ searchParams }: Props) {
  const q = await searchParams;
  const period = resolvePeriod({ periode: one(q.periode) ?? undefined, du: one(q.du) ?? undefined, au: one(q.au) ?? undefined }, localNow("Africa/Kinshasa").day);
  const channel = one(q.source);
  const device = one(q.appareil);
  const filters: Filters = {
    channel: channel && (CHANNELS as readonly string[]).includes(channel) ? channel : null,
    campaign: one(q.campagne),
    route: one(q.trajet),
    device: device && ["mobile", "tablet", "desktop"].includes(device) ? device : null,
  };
  const [report, options] = await Promise.all([loadAnalytics(prisma, period, filters), filterOptions(prisma)]);
  return <AnalyticsView report={report} filters={filters} options={options} />;
}
