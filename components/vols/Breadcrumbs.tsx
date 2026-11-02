import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SITE } from "@/lib/site";

export type Crumb = { label: string; href: string };

/**
 * Visible breadcrumbs and their BreadcrumbList, built from the same list so the structured data
 * never describes anything that is not on the page (docs/SEO-AEO-GEO.md §4, §5).
 */
export function Breadcrumbs({ items, label = "Fil d'Ariane" }: { items: Crumb[]; label?: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: `${SITE.url}${c.href}` })),
  };
  return (
    <>
      <nav aria-label={label} className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5" aria-hidden="true" />}
              {i === items.length - 1 ? (
                <span aria-current="page" className="text-foreground">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="hover:text-link hover:underline">
                  {c.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
    </>
  );
}
