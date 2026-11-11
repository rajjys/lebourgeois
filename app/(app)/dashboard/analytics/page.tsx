import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { AnalyticsView, VIEWS, type ViewKey } from "@/components/backoffice/analytics/AnalyticsView";
import { CHANNELS } from "@/lib/analytics/channel";
import { resolvePeriod } from "@/lib/analytics/period";
import { filterOptions, loadAnalytics, type Filters } from "@/lib/analytics/report";
import { localNow } from "@/lib/routeStatus";

export const metadata: Metadata = { title: "Statistiques" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : undefined);

/** /dashboard/analytics: visits, sources, routes and requests (AN-2, AN-5; docs/ANALYTICS.md). Read on every visit. */
export default async function AnalyticsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const query = Object.fromEntries(Object.keys(raw).map((k) => [k, one(raw[k])]));
  const today = localNow("Africa/Kinshasa").day;
  const period = resolvePeriod({ periode: query.periode, du: query.du, au: query.au }, today);
  const filters: Filters = {
    channel: query.source && (CHANNELS as readonly string[]).includes(query.source) ? query.source : null,
    campaign: query.campagne ?? null,
    route: query.trajet ?? null,
    device: query.appareil && ["mobile", "tablet", "desktop"].includes(query.appareil) ? query.appareil : null,
  };
  const view: ViewKey = VIEWS.some((v) => v.key === query.vue) ? (query.vue as ViewKey) : "apercu";
  const [report, options] = await Promise.all([loadAnalytics(prisma, period, filters), filterOptions(prisma)]);
  return <AnalyticsView report={report} filters={filters} options={options} view={view} query={query} today={today} />;
}
