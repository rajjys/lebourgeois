import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tracker } from "@/components/analytics/Tracker";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <Navbar />
        {children}
      <Footer />
      {/* Public pages only: the back office and the login page are not visits (docs/ANALYTICS.md). */}
      <Suspense fallback={null}>
        <Tracker />
      </Suspense>
      <Analytics />
    </div>
  );
}
