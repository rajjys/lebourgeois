import { cn } from "@/lib/utils/cn-utils";
import { formatWeekdays, WEEKDAYS, WEEKDAY_LABEL, type WeekdayCode } from "@/lib/format";

/**
 * Operating days at a glance, Monday first. Flying days are tinted, the others fade; `highlight`
 * marks one day (the date searched, or the next departure). Screen readers get one sentence.
 */
export function DayStrip({
  days,
  highlight,
  letters,
  label,
  className,
}: {
  days: readonly WeekdayCode[];
  highlight?: WeekdayCode | null;
  /** One letter per weekday, Monday first; French by default. */
  letters?: readonly string[];
  /** Accessible sentence; "Vole le lundi, mercredi et samedi" by default. */
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex gap-1", className)} role="img" aria-label={label ?? `Vole le ${formatWeekdays(days)}`}>
      {WEEKDAYS.map((d, i) => {
        const on = days.includes(d);
        return (
          <span
            key={d}
            aria-hidden="true"
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-md text-[0.6875rem] font-semibold transition-colors",
              d === highlight && on
                ? "bg-primary text-primary-foreground shadow-sm"
                : on
                  ? "bg-brand-subtle text-brand ring-1 ring-inset ring-brand-border"
                  : "text-muted-foreground/45",
            )}
          >
            {letters?.[i] ?? WEEKDAY_LABEL[d].short}
          </span>
        );
      })}
    </span>
  );
}
