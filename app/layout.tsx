import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";
import { Toaster as Sonner, Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next"
import { SITE } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Horaires et prix des vols intérieurs en RDC`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  // No canonical here: a root-level canonical is inherited by every page and
  // marks them all as duplicates of the homepage. Pages set their own.
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: `${SITE.name} — Horaires et prix des vols intérieurs en RDC`,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    locale: "fr_CD",
    // Image comes from app/opengraph-image.tsx
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — Horaires et prix des vols intérieurs en RDC`,
    description: SITE.description,
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider>
        <Toaster />
        <Sonner />
          {children}
        </I18nProvider>
        <Analytics />
        {/* Structured Data: site name only. No sameAs/SearchAction until real profiles and a /search page exist. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE.name,
              url: SITE.url,
              inLanguage: "fr",
            }),
          }}
        />
      </body>
    </html>
  );
}
