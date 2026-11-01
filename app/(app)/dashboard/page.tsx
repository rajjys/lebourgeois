import type { Metadata } from "next";
import { DashboardHome } from "@/components/backoffice/DashboardHome";
import { loadDashboard } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Tableau de bord" };

// Read on every visit: everything here depends on today's date and the latest changes.
export default async function DashboardPage() {
  const now = new Date();
  const data = await loadDashboard(now);
  return <DashboardHome data={data} now={now} />;
}
