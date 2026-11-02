import { Suspense } from "react";
import type { Metadata } from "next";
import { ContactView } from "@/components/contact/ContactView";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Nous contacter",
  shareTitle: `Contacter ${SITE.name}`,
  description: `Une question sur un vol, une erreur à signaler ou une compagnie aérienne : écrivez à ${SITE.name}, par le formulaire ou sur WhatsApp.`,
  path: "/contact",
});

// useSearchParams (?sujet=erreur&page=…) needs a Suspense boundary to keep the page static.
export default function ContactPage() {
  return (
    <Suspense>
      <ContactView />
    </Suspense>
  );
}
