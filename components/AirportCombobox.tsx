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
import { airports } from "@/data/airports";
import { cn } from "@/lib/utils";

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

  const filteredAirports = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return airports;
    return airports.filter((airport) => {
      const content = `${airport.city} ${airport.country} ${airport.name} ${airport.iata}`.toLowerCase();
      return content.includes(search);
    });
  }, [searchTerm]);

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
            className="w-full justify-between"
            id={id}
          >
            <span className="truncate">{value || placeholder || "Select airport"}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search city or IATA…"
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {filteredAirports.map((airport) => {
                  const display = `${airport.city} (${airport.iata}) · ${airport.name}`;
                  return (
                    <CommandItem
                      key={airport.iata}
                      value={airport.iata}
                      onSelect={() => {
                        onChange(display);
                        setOpen(false);
                        setSearchTerm("");
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", value.includes(airport.iata) ? "opacity-100" : "opacity-0")} />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{display}</span>
                        <span className="text-xs text-muted-foreground">
                          {airport.country}
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


