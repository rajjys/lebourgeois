'use client';

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DayPicker } from "react-day-picker";
import { enUS, fr } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils/cn-utils";

/** "2026-11-10" ⇄ a local Date at midnight: the picker works in local days, the URL in ISO days. */
const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * The optional date of a route search (docs/DESIGN-SYSTEM.md#forms): a field like the airport
 * pickers that opens our own calendar. Weeks start on Monday, past days are off, today is
 * outlined, and on a route page the days with a known flight carry a dot. Phones get it in a sheet
 * from the bottom with bigger days (a popover there runs off the screen); wider screens a popover.
 */
export function DateField({
  id,
  value,
  onChange,
  min,
  flightDates,
  describedBy,
}: {
  id: string;
  /** ISO day, or "" for every date. */
  value: string;
  onChange: (value: string) => void;
  /** First day that can be picked (today at the origin), ISO. */
  min: string;
  /** Days with a known departure on the route being searched, ISO. */
  flightDates?: string[];
  describedBy?: string;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = value ? toDate(value) : undefined;
  const flights = useMemo(() => (flightDates ?? []).map(toDate), [flightDates]);
  const [month, setMonth] = useState<Date>(() => selected ?? flights[0] ?? toDate(min));

  const pick = (d: Date | undefined) => {
    onChange(d ? toIso(d) : "");
    setOpen(false);
  };

  const openChange = (o: boolean) => {
    setOpen(o);
    if (o) setMonth(selected ?? flights[0] ?? toDate(min));
  };
  const isMobile = useIsMobile();
  const cell = isMobile ? "size-11" : "size-10";

  // A row of the search card (docs/DESIGN-SYSTEM.md, search card): label inside, small on top;
  // "Toutes les dates" is a real value (the next four weeks), so the label never takes its place.
  const trigger = (
    <button
      id={id}
      type="button"
      aria-describedby={describedBy}
      aria-haspopup="dialog"
      onClick={isMobile ? () => openChange(true) : undefined}
      className="flex h-14 w-full min-w-0 flex-col justify-end pb-2 pl-12 pr-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:h-16 lg:pb-2.5"
    >
      <span className={cn("block truncate leading-6", value ? "pr-6 text-base font-semibold text-foreground first-letter:uppercase" : "text-base text-muted-foreground")}>
        {value ? formatDateShort(new Date(`${value}T00:00:00Z`)) : t("vols.search.anyDate")}
      </span>
    </button>
  );

  const calendar = (
    <DayPicker
      mode="single"
      locale={i18n.language === "en" ? { ...enUS, options: { ...enUS.options, weekStartsOn: 1 } } : fr}
      selected={selected}
      onSelect={pick}
      month={month}
      onMonthChange={setMonth}
      fromDate={toDate(min)}
      disabled={{ before: toDate(min) }}
      modifiers={{ flight: flights }}
      modifiersClassNames={{ flight: "has-flight" }}
      labels={{
        // The dot is visual; screen readers hear it in the day's name.
        labelDay: (day, mods) => `${formatDateShort(new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate())))}${mods.flight ? `, ${t("vols.search.flightDays").toLowerCase()}` : ""}`,
      }}
      showOutsideDays={false}
      className={isMobile ? "flex justify-center px-4 py-3" : "p-3"}
      classNames={{
        months: "flex",
        month: "space-y-2",
        caption: "relative flex h-10 items-center justify-center",
        caption_label: "text-base font-semibold capitalize",
        nav: "flex items-center",
        nav_button:
          "inline-flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30",
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: cn(isMobile ? "w-11" : "w-10", "pb-1 text-xs font-medium capitalize text-muted-foreground"),
        row: "mt-1 flex w-full",
        cell: cn(cell, "p-0 text-center"),
        day: cn(
          cell,
          "relative inline-flex items-center justify-center rounded-full text-sm tabular-nums text-foreground transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          // A known departure: a dot under the number, white on the selected day.
          "[&.has-flight]:font-semibold [&.has-flight]:after:absolute [&.has-flight]:after:bottom-1 [&.has-flight]:after:left-1/2 [&.has-flight]:after:size-1 [&.has-flight]:after:-translate-x-1/2 [&.has-flight]:after:rounded-full [&.has-flight]:after:bg-primary",
        ),
        day_selected: "!bg-primary !text-primary-foreground font-semibold [&.has-flight]:after:!bg-primary-foreground",
        day_today: "ring-1 ring-inset ring-neutral-300",
        day_disabled: "!text-neutral-300 hover:!bg-transparent cursor-default",
        day_hidden: "invisible",
      }}
      components={{
        IconLeft: () => <ChevronLeft className="size-4" aria-hidden="true" />,
        IconRight: () => <ChevronRight className="size-4" aria-hidden="true" />,
      }}
      initialFocus
    />
  );

  const footer = (
    <div className={cn("flex items-center justify-between gap-3 border-t", isMobile ? "px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]" : "px-4 py-2.5")}>
      {flights.length > 0 ? (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          {t("vols.search.flightDays")}
        </span>
      ) : (
        <span />
      )}
      <button type="button" onClick={() => pick(undefined)} className="rounded-md px-2 py-1.5 text-sm font-medium text-link hover:underline">
        {t("vols.search.anyDate")}
      </button>
    </div>
  );

  return (
    <div className="relative min-w-0">
      <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <label htmlFor={id} className="pointer-events-none absolute left-12 top-2 z-[1] text-xs font-medium text-muted-foreground lg:top-2.5">
        {t("vols.search.date")}
      </label>
      {isMobile ? (
        <>
          {trigger}
          <Sheet open={open} onOpenChange={openChange}>
            <SheetContent side="bottom" className="gap-0 rounded-t-3xl p-0" aria-describedby={undefined}>
              <SheetTitle className="border-b px-5 pb-4 pt-5 text-lg font-bold">{t("vols.search.pickDate")}</SheetTitle>
              {calendar}
              {footer}
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <Popover open={open} onOpenChange={openChange}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent align="start" sideOffset={2} collisionPadding={16} className="w-auto rounded-2xl p-0 shadow-hover">
            {calendar}
            {footer}
          </PopoverContent>
        </Popover>
      )}
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground"
          aria-label={t("vols.search.clearDate")}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
