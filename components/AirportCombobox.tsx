'use client';

import { useMemo, useState } from "react";
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

type AirportComboboxProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  description?: string;
};

export function AirportCombobox({
  label,
  value,
  onChange,
  placeholder,
  id,
  required,
  description,
}: AirportComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { airports, isLoading } = useAirports();

  const filteredAirports = useMemo<Airport[]>(() => {
    const list = Array.isArray(airports) ? airports : [];
    const search = searchTerm.trim().toLowerCase();
    if (!search) return list;
    return list.filter((airport) => {
      const content = `${airport.city} ${airport.country} ${airport.name} ${airport.code}`.toLowerCase();
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
          className="w-full justify-between px-4 py-8"
          id={id}
        >
          {(() => {
            const list = Array.isArray(airports) ? airports : [];
            const selected = list.find(
              a => `${a.city} (${a.code}) · ${a.name}` === value
            );
            
            if (!selected)
              return <span className="text-muted-foreground truncate">{placeholder || "Select airport"}</span>;

            return (
              <div className="flex flex-col flex-1 min-w-0 text-left leading-tight">
                {/* MOBILE VIEW */}
                <div className="block lg:hidden min-w-0 overflow-hidden">
                  <span className="text-lg font-semibold block truncate whitespace-nowrap">
                    {selected.code}
                  </span>
                  <span className="text-xs text-muted-foreground block truncate whitespace-nowrap">
                    {selected.city}
                  </span>
                </div>
                {/* DESKTOP VIEW */}
                <div className="hidden lg:block min-w-0 overflow-hidden">
                  <span className="text-base font-semibold block truncate whitespace-nowrap">
                    {selected.city} ({selected.code}) · {selected.name}
                  </span>
                  <span className="text-xs text-muted-foreground block truncate whitespace-nowrap">
                    {countryCodeToName[selected.country] || selected.country}
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
                placeholder="Search city or IATA…"
                value={searchTerm}
                onValueChange={setSearchTerm}/>
              <CommandList>
                <CommandEmpty>{isLoading ? "Loading airports..." : "No results found."}</CommandEmpty>
                <CommandGroup>
                  {filteredAirports.map((airport) => {
                    const display = `${airport.city} (${airport.code}) · ${airport.name}`;
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
                            value && value.includes(airport.code) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{display}</span>
                          <span className="text-xs text-muted-foreground">
                          {countryCodeToName[airport.country] || airport.country}
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


