'use client';

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils/cn-utils";
import { useAirports } from "@/hooks/useAirports";
import type { Airport } from "@/lib/generated/prisma/client";
import { countryCodeToName } from "@/lib/utils/country-utils";
import { Badge } from "@/components/ui/badge";

/** The value this picker emits: "Kinshasa (FIH) · N'djili". Consumers read the code back with airportCode(). */
export const airportLabel = (a: Pick<Airport, "city" | "code" | "name">) => `${a.city} (${a.code}) · ${a.name}`;

/** Accepts a label or a bare IATA code (from a URL) and returns the code. */
export const airportCode = (value: string): string | null => {
  if (/^[A-Z]{3}$/.test(value)) return value;
  return value.match(/\(([A-Z]{3})\)/)?.[1] ?? null;
};

/** Province for domestic airports ("Nord-Kivu"), country otherwise. */
const placeLine = (a: Pick<Airport, "province" | "countryCode">) =>
  a.countryCode === "CD" && a.province ? a.province : countryCodeToName[a.countryCode] || a.countryCode;

/** Closed or restricted airports are still selectable: the picker warns, it doesn't hide. */
export function AirportStatusBadge({ status }: { status: Airport["status"] }) {
  const { t } = useTranslation();
  if (status === "OPEN") return null;
  return (
    <Badge variant={status === "CLOSED" ? "danger" : "warning"} className="shrink-0">
      {t(`airportPicker.status.${status}`)}
    </Badge>
  );
}

type AirportComboboxProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  description?: string;
  triggerClassName?: string;
  /**
   * "field" (forms): label above a bordered field. "segment" (the flight search): a row of the
   * search card, its label inside, an icon on the left (docs/DESIGN-SYSTEM.md, search card).
   */
  variant?: "field" | "segment";
  icon?: ComponentType<{ className?: string }>;
  /** Controlled opening, so the search can open the destination once the origin is chosen. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Called when the visitor picks an airport in the list (not when the value changes otherwise).
   * When set, focus does not go back to this field after the pick: the caller moves on.
   */
  onPick?: (code: string) => void;
  /** An airport left out of the list (the destination list leaves out the origin). */
  exclude?: string | null;
};

/** Phones: no keyboard over the list on open; typing stays one tap away. */
const coarsePointer = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export function AirportCombobox({
  label,
  value,
  onChange,
  placeholder,
  id,
  required,
  description,
  triggerClassName,
  variant = "field",
  icon: Icon,
  open: openProp,
  onOpenChange,
  onPick,
  exclude,
}: AirportComboboxProps) {
  const { t } = useTranslation();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (o: boolean) => {
    setOpenState(o);
    onOpenChange?.(o);
  };
  const [searchTerm, setSearchTerm] = useState("");
  const { airports, isLoading } = useAirports();
  const contentRef = useRef<HTMLDivElement>(null);
  // After a pick handled by the caller, focus must not jump back here: it would close the next field.
  const picked = useRef(false);

  // A bare code (e.g. ?from=FIH) becomes the full label once airports are loaded.
  useEffect(() => {
    if (!/^[A-Z]{3}$/.test(value) || !Array.isArray(airports)) return;
    const match = airports.find((a) => a.code === value);
    if (match) onChange(airportLabel(match));
  }, [value, airports, onChange]);

  const filteredAirports = useMemo<Airport[]>(() => {
    const list = (Array.isArray(airports) ? airports : []).filter((a) => a.code !== exclude);
    const search = searchTerm.trim().toLowerCase();
    if (!search) return list;
    return list.filter((airport) => {
      const content = `${airport.city} ${airport.countryCode} ${airport.name} ${airport.code}`.toLowerCase();
      return content.includes(search);
    });
  }, [airports, searchTerm, exclude]);

  const code = airportCode(value);
  const selected = (Array.isArray(airports) ? airports : []).find((a) => a.code === code);
  const segment = variant === "segment";

  const list = (
    <PopoverContent
      ref={contentRef}
      align="start"
      sideOffset={segment ? 2 : 4}
      collisionPadding={8}
      className={cn("p-0", segment ? "w-[var(--radix-popover-trigger-width)] min-w-[18rem] rounded-xl shadow-popover" : "w-[320px]")}
      onOpenAutoFocus={(event) => {
        if (!coarsePointer()) return;
        event.preventDefault();
        contentRef.current?.focus({ preventScroll: true });
      }}
      onCloseAutoFocus={(event) => {
        if (!picked.current) return;
        picked.current = false;
        event.preventDefault();
      }}
    >
      {/* Opens on the chosen airport when there is one, otherwise on the first. */}
      <Command shouldFilter={false} defaultValue={code ?? undefined}>
        <CommandInput placeholder={t("airportPicker.search")} value={searchTerm} onValueChange={setSearchTerm} className="text-base sm:text-sm" />
        <CommandList className="max-h-[min(20rem,50dvh)]">
          <CommandEmpty>{isLoading ? t("airportPicker.loading") : t("airportPicker.empty")}</CommandEmpty>
          <CommandGroup>
            {filteredAirports.map((airport) => (
              <CommandItem
                key={airport.code}
                value={airport.code}
                className="gap-3 rounded-lg px-3 py-2.5"
                onSelect={() => {
                  onChange(airportLabel(airport));
                  setSearchTerm("");
                  if (onPick) picked.current = true;
                  setOpen(false);
                  onPick?.(airport.code);
                }}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="truncate">{airport.city}</span>
                    <AirportStatusBadge status={airport.status} />
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {airport.name} · {placeLine(airport)}
                  </span>
                </span>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground">{airport.code}</span>
                <Check className={cn("size-4 shrink-0 text-brand", code === airport.code ? "opacity-100" : "opacity-0")} aria-hidden="true" />
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  );

  if (segment) {
    // One row of the search card: the label sits inside it, small on top once a city is chosen;
    // empty, the row reads "Ville de départ". The label stays a real <label> for the field.
    return (
      <div className="relative min-w-0">
        {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />}
        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute left-12 right-4 z-[1] truncate text-muted-foreground",
            selected ? "top-2 text-xs font-medium lg:top-2.5" : "top-1/2 -translate-y-1/2 text-base",
          )}
        >
          {selected ? label : placeholder || label}
        </label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              role="combobox"
              aria-expanded={open}
              id={id}
              className={cn(
                "flex h-14 w-full min-w-0 flex-col justify-end pb-2 pl-12 pr-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:h-16 lg:pb-2.5",
                triggerClassName,
              )}
            >
              {selected && (
                <span className="flex min-w-0 items-center gap-2 leading-6">
                  <span className="truncate text-base font-semibold text-foreground">{selected.city}</span>
                  <span className="shrink-0 text-sm font-medium text-muted-foreground">{selected.code}</span>
                  <AirportStatusBadge status={selected.status} />
                </span>
              )}
            </button>
          </PopoverTrigger>
          {list}
        </Popover>
      </div>
    );
  }

  // min-w-0: in a grid or flex row, a long airport name must truncate, not widen the field.
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        {label}
        {required ? " *" : null}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full min-w-0 justify-between overflow-hidden px-4 py-8", triggerClassName)}
            id={id}
          >
            {!selected ? (
              <span className="text-muted-foreground truncate">{placeholder || t("airportPicker.placeholder")}</span>
            ) : (
              <div className="flex flex-col flex-1 min-w-0 text-left leading-tight">
                {/* MOBILE VIEW */}
                <div className="block lg:hidden min-w-0 overflow-hidden">
                  <span className="flex items-center gap-2 text-lg font-semibold truncate whitespace-nowrap">
                    {selected.code}
                    <AirportStatusBadge status={selected.status} />
                  </span>
                  <span className="text-xs text-muted-foreground block truncate whitespace-nowrap">{selected.city}</span>
                </div>
                {/* DESKTOP VIEW */}
                <div className="hidden lg:block min-w-0 overflow-hidden">
                  <span className="flex items-center gap-2 text-base font-semibold truncate whitespace-nowrap">
                    <span className="truncate">
                      {selected.city} ({selected.code})
                    </span>
                    <AirportStatusBadge status={selected.status} />
                  </span>
                  <span className="text-xs text-muted-foreground block truncate whitespace-nowrap">
                    {selected.name} · {placeLine(selected)}
                  </span>
                </div>
              </div>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {list}
      </Popover>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}
