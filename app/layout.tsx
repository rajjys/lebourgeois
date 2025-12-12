import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";
import { Toaster as Sonner, Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Le Bourgeois — Voyagez avec efficacité et élégance",
  description: "Consultez les tarifs en temps reels, Faites vos reservation avec assistance 24/7.",
  alternates: {
    canonical: "https://lebourgeois.cd",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  metadataBase: new URL("https://lebourgeois.cd"),
  openGraph: {
    title: "Le Bourgeois — Voyagez avec efficacité et élégance",
    description: "Consultez les tarifs en temps reels, Faites vos reservation avec assistance 24/7.",
    url: "https://lebourgeois.cd",
    siteName: "Le Bourgeois",
    images: [
      {
        url: "/site-image.jpg",
        width: 1200,
        height: 630,
        alt:"Le Bourgeois Site Image"
      }
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Voyagez avec efficacité et élégance",
    description: "Consultez les tarifs en temps reels, Faites vos reservation avec assistance 24/7.",
    images: ["/site-image.jpg"],
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
        {/* Structured Data */}
        <script type="application/ld+json">
          {`
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Le Bourgeois",
            "url": "https://lebourgeois.cd",
            "logo": "https://lebourgeois.cd/icon.png",
            "sameAs": [
              "https://www.facebook.com/lebourgeois",
              "https://www.instagram.com/lebourgeois",
              "https://twitter.com/lebourgeois",
              "https://www.linkedin.com/company/lebourgeois"
            ]
          }
          `}
          </script>
          <script type="application/ld+json">
            {`
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "url": "https://lebourgeois.cd",
              "name": "Le Bourgeois",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://lebourgeois.cd/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            }
            `}
          </script>
      </body>
    </html>
  );
}
