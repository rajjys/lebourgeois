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
  className,
}: {
  amount: number | string;
  observedAt: Date;
  kind?: "from" | "quote";
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-col leading-tight", className)}>
      <span className={cn("font-bold tabular-nums text-foreground", size === "lg" ? "text-2xl" : "text-lg")}>
        {kind === "from" && <span className="mr-1 text-sm font-medium text-muted-foreground">dès</span>}
        <data value={String(amount)}>{formatPrice(amount)}</data>
      </span>
      <span className="text-xs text-muted-foreground">
        observé le <time dateTime={observedAt.toISOString().slice(0, 10)}>{formatDayMonth(observedAt)}</time>
      </span>
    </span>
  );
}
