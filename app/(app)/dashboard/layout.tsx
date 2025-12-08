import DashboardLayout from "@/components/DashboardLayout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import React from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <React.Suspense fallback={<LoadingSpinner />}>
        <DashboardLayout>
          {children}
        </DashboardLayout>

    </React.Suspense>
  );
}
