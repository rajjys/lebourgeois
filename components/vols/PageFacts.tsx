'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { formatDayMonthYear } from "@/lib/format";

/**
 * The end of every route and airline page: when the data last changed, when the schedules were last
 * checked, where they come from, and what we are not (owner, 2026-11-02: these lines go at the bottom,
 * not on top). Real <time> elements, so the dates stay machine-readable (docs/SEO-AEO-GEO.md §5).
 * Ends with "report a mistake on this page", which opens the contact form on that topic.
 */
export function PageFacts({
  updatedAt,
  verifiedAt,
  sources,
}: {
  updatedAt: string | null;
  verifiedAt: string | null;
  sources: { url: string; host: string }[];
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const date = (iso: string) => <time dateTime={iso.slice(0, 10)}>{formatDayMonthYear(new Date(iso))}</time>;
  const parts = [
    updatedAt && (
      <span key="updated">
        {t("vols.facts.updated")} {date(updatedAt)}
      </span>
    ),
    verifiedAt && (
      <span key="verified">
        {t("vols.facts.verified")} {date(verifiedAt)}
      </span>
    ),
    sources.length > 0 && (
      <span key="sources">
        {t("vols.facts.sources", { count: sources.length })} :{" "}
        {sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && ", "}
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-link underline">
              {s.host}
            </a>
          </span>
        ))}
      </span>
    ),
  ].filter(Boolean);

  return (
    <section aria-label={t("vols.facts.label")} className="space-y-2 border-t pt-6 text-sm text-muted-foreground">
      {parts.length > 0 && (
        <p>
          {parts.map((p, i) => (
            <span key={i}>
              {i > 0 && " · "}
              {p}
            </span>
          ))}
        </p>
      )}
      <p>
        <Link href={`/contact?sujet=erreur&page=${encodeURIComponent(pathname)}`} className="font-medium text-link hover:underline">
          {t("vols.facts.report")}
        </Link>
      </p>
      <p className="text-xs">{t("explore.detail.disclaimer")}</p>
    </section>
  );
}
