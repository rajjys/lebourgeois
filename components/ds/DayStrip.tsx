import { cn } from "@/lib/utils/cn-utils";
import { formatWeekdays, WEEKDAYS, WEEKDAY_LABEL, type WeekdayCode } from "@/lib/format";

/** Operating days at a glance: L M M J V S D. Screen readers get the full list. */
export function DayStrip({ days, className }: { days: readonly WeekdayCode[]; className?: string }) {
  return (
    <span className={cn("inline-flex gap-1", className)} role="img" aria-label={`Vole le ${formatWeekdays(days)}`}>
      {WEEKDAYS.map((d) => {
        const on = days.includes(d);
        return (
          <span
            key={d}
            aria-hidden="true"
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-sm text-xs font-semibold",
              on ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground",
            )}
          >
            {WEEKDAY_LABEL[d].short}
          </span>
        );
      })}
    </span>
  );
}
