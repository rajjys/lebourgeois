import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { SIDEBAR_COOKIE } from "@/lib/backoffice";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getSession } from "@/lib/auth/session";
import React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!(await getSession())) redirect("/login");
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";

  return (
    <React.Suspense fallback={<LoadingSpinner />}>
        <DashboardLayout defaultCollapsed={collapsed}>
          {children}
        </DashboardLayout>

    </React.Suspense>
  );
}
