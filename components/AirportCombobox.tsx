'use client';

import { useEffect, useMemo, useState } from "react";
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
};

export function AirportCombobox({
  label,
  value,
  onChange,
  placeholder,
  id,
  required,
  description,
  triggerClassName,
}: AirportComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { airports, isLoading } = useAirports();

  // A bare code (e.g. ?from=FIH) becomes the full label once airports are loaded.
  useEffect(() => {
    if (!/^[A-Z]{3}$/.test(value) || !Array.isArray(airports)) return;
    const match = airports.find((a) => a.code === value);
    if (match) onChange(airportLabel(match));
  }, [value, airports, onChange]);

  const filteredAirports = useMemo<Airport[]>(() => {
    const list = Array.isArray(airports) ? airports : [];
    const search = searchTerm.trim().toLowerCase();
    if (!search) return list;
    return list.filter((airport) => {
      const content = `${airport.city} ${airport.countryCode} ${airport.name} ${airport.code}`.toLowerCase();
      return content.includes(search);
    });
  }, [airports, searchTerm]);

  return (
    <div className="space-y-2">
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
          className={cn("w-full justify-between px-4 py-8", triggerClassName)}
          id={id}
        >
          {(() => {
            const list = Array.isArray(airports) ? airports : [];
            const code = airportCode(value);
            const selected = list.find((a) => a.code === code);

            if (!selected)
              return <span className="text-muted-foreground truncate">{placeholder || t("airportPicker.placeholder")}</span>;

            return (
              <div className="flex flex-col flex-1 min-w-0 text-left leading-tight">
                {/* MOBILE VIEW */}
                <div className="block lg:hidden min-w-0 overflow-hidden">
                  <span className="flex items-center gap-2 text-lg font-semibold truncate whitespace-nowrap">
                    {selected.code}
                    <AirportStatusBadge status={selected.status} />
                  </span>
                  <span className="text-xs text-muted-foreground block truncate whitespace-nowrap">
                    {selected.city}
                  </span>
                </div>
                {/* DESKTOP VIEW */}
                <div className="hidden lg:block min-w-0 overflow-hidden">
                  <span className="flex items-center gap-2 text-base font-semibold truncate whitespace-nowrap">
                    <span className="truncate">{airportLabel(selected)}</span>
                    <AirportStatusBadge status={selected.status} />
                  </span>
                  <span className="text-xs text-muted-foreground block truncate whitespace-nowrap">
                    {placeLine(selected)}
                  </span>
                </div>
              </div>
            );
          })()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t("airportPicker.search")}
                value={searchTerm}
                onValueChange={setSearchTerm}/>
              <CommandList>
                <CommandEmpty>{isLoading ? t("airportPicker.loading") : t("airportPicker.empty")}</CommandEmpty>
                <CommandGroup>
                  {filteredAirports.map((airport) => {
                    const display = airportLabel(airport);
                    return (
                      <CommandItem
                        key={airport.code}
                        value={airport.code}
                        onSelect={() => {
                          onChange(display);
                          setOpen(false);
                          setSearchTerm("");
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            airportCode(value) === airport.code ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                            {display}
                            <AirportStatusBadge status={airport.status} />
                          </span>
                          <span className="text-xs text-muted-foreground">
                          {placeLine(airport)}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
      </Popover>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}


