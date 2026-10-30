import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
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

  return (
    <React.Suspense fallback={<LoadingSpinner />}>
        <DashboardLayout>
          {children}
        </DashboardLayout>

    </React.Suspense>
  );
}
