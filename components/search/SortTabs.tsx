'use client';

import { useTranslation } from "react-i18next";
import { formatDuration } from "@/lib/flights";
import { formatDateShort, formatPrice } from "@/lib/format";
import { SORTS, sortServices, type Service, type SortKey } from "@/lib/searchResults";
import { cn } from "@/lib/utils/cn-utils";

/**
 * Recommandé · Moins cher · Plus rapide · Plus proche, each with the value of its first result,
 * so the trade-off is visible before clicking. Two by two on phones.
 */
export function SortTabs({
  services,
  value,
  onChange,
  dateChosen,
}: {
  services: Service[];
  value: SortKey;
  onChange: (sort: SortKey) => void;
  dateChosen: boolean;
}) {
  const { t } = useTranslation();
  const anyPrice = services.some((s) => s.price);
  const when = (s: Service) => (dateChosen ? s.departureTime : `${formatDateShort(new Date(`${s.next.date}T00:00:00Z`))} · ${s.departureTime}`);
  const price = (s: Service) => (s.price ? `${t("explore.results.from")} ${formatPrice(s.price.amount)}` : null);

  const summary: Record<SortKey, (top: Service) => { main: string; sub: string }> = {
    best: (top) => ({ main: price(top) ?? formatDuration(top.durationMinutes), sub: `${top.airline.code} · ${when(top)}` }),
    cheapest: (top) => ({ main: anyPrice ? price(top)! : t("explore.results.noPrices"), sub: anyPrice ? top.airline.code : "—" }),
    fastest: (top) => ({ main: formatDuration(top.durationMinutes), sub: `${top.airline.code} · ${top.departureTime}` }),
    soonest: (top) => ({ main: when(top), sub: top.airline.code }),
  };

  return (
    <div role="tablist" aria-label={t("explore.results.sortLabel")} className="grid grid-cols-2 overflow-hidden rounded-2xl border bg-card shadow-card sm:grid-cols-4">
      {SORTS.map((key, i) => {
        const top = sortServices(services, key)[0];
        const { main, sub } = top ? summary[key](top) : { main: "—", sub: "" };
        const selected = key === value;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(key)}
            title={key === "best" ? t("explore.results.sortHelp") : undefined}
            className={cn(
              "min-w-0 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              i % 2 === 1 && "border-l",
              i >= 2 && "border-t sm:border-t-0",
              i === 2 && "sm:border-l",
              selected ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
            )}
          >
            <span className={cn("block text-xs font-medium", selected ? "text-primary-foreground/85" : "text-muted-foreground")}>
              {t(`explore.results.sort.${key}`)}
            </span>
            <span className="block truncate text-base font-bold tabular-nums">{main}</span>
            <span className={cn("block truncate text-xs", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>{sub}</span>
          </button>
        );
      })}
    </div>
  );
}
