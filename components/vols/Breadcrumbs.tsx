import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils/cn-utils";

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
      {/* One line (P-17): on a phone the trail wrapped onto two lines on airline pages. The crumb
          before the current page (the route) gives way first and ends with "…". */}
      <nav aria-label={label} className="text-[0.8125rem] text-muted-foreground sm:text-sm">
        <ol className="flex items-center gap-1 overflow-hidden whitespace-nowrap">
          {items.map((c, i) => (
            <li key={c.href} className={cn("flex items-center gap-1", i === items.length - 2 ? "min-w-0" : "shrink-0")}>
              {i > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
              {i === items.length - 1 ? (
                <span aria-current="page" className="text-foreground">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="truncate hover:text-link hover:underline">
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
