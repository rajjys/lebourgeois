import { cn } from "@/lib/utils/cn-utils";
import { formatDayMonth, formatPrice } from "@/lib/format";

/**
 * A price is never shown without the date it was observed (docs/DESIGN-SYSTEM.md#prices).
 * "from" = lowest advertised fare; "quote" = fare seen for a specific travel date.
 */
export function PriceTag({
  amount,
  observedAt,
  kind = "from",
  size = "md",
  labels = { from: "dès", observed: "observé le" },
  className,
}: {
  amount: number | string;
  observedAt: Date;
  kind?: "from" | "quote";
  size?: "md" | "lg";
  /** Words around the figures, French by default. */
  labels?: { from: string; observed: string };
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-col leading-tight", className)}>
      <span className={cn("font-bold tabular-nums text-foreground", size === "lg" ? "text-2xl" : "text-lg")}>
        {kind === "from" && <span className="mr-1 text-sm font-medium text-muted-foreground">{labels.from}</span>}
        <data value={String(amount)}>{formatPrice(amount)}</data>
      </span>
      <span className="text-xs text-muted-foreground">
        {labels.observed} <time dateTime={observedAt.toISOString().slice(0, 10)}>{formatDayMonth(observedAt)}</time>
      </span>
    </span>
  );
}
