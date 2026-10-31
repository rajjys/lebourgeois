'use client';

import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAirports } from "@/hooks/useAirports";
import { arrivalDayOffset } from "@/lib/flights";
import type { Weekday } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils/cn-utils";

/** A flight as typed in the workspace forms; empty strings until filled. */
export type FlightDraft = {
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  arrivalDayOffset: number;
  via: string[];
  aircraft: string;
};

export const emptyDraft: FlightDraft = { flightNumber: "", departureTime: "", arrivalTime: "", arrivalDayOffset: 0, via: [], aircraft: "" };

export const isTime = (v: string) => /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(v);

/** What the API expects: empty number and aircraft become null. */
export const draftPayload = (d: FlightDraft) => ({
  flightNumber: d.flightNumber.trim() || null,
  departureTime: d.departureTime,
  arrivalTime: d.arrivalTime,
  arrivalDayOffset: d.arrivalDayOffset,
  via: d.via,
  aircraft: d.aircraft.trim() || null,
});

const WEEK: { value: Weekday; short: string; long: string }[] = [
  { value: "MON", short: "Lun", long: "lundi" },
  { value: "TUE", short: "Mar", long: "mardi" },
  { value: "WED", short: "Mer", long: "mercredi" },
  { value: "THU", short: "Jeu", long: "jeudi" },
  { value: "FRI", short: "Ven", long: "vendredi" },
  { value: "SAT", short: "Sam", long: "samedi" },
  { value: "SUN", short: "Dim", long: "dimanche" },
];

export function WeekdayPicker({ value, onChange, label = "Jours" }: { value: Weekday[]; onChange: (days: Weekday[]) => void; label?: string }) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <ToggleGroup
        type="multiple"
        variant="outline"
        value={value}
        onValueChange={(days) => onChange(WEEK.map((d) => d.value).filter((d) => days.includes(d)))}
        className="flex-wrap justify-start"
        aria-label={label}
      >
        {WEEK.map((d) => (
          <ToggleGroupItem key={d.value} value={d.value} aria-label={d.long} className="w-12 data-[state=on]:border-primary data-[state=on]:bg-brand-50 data-[state=on]:text-foreground">
            {d.short}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

/** Stops in order, as airport codes; the route's own airports are not offered. */
function ViaPicker({ value, onChange, exclude, id }: { value: string[]; onChange: (via: string[]) => void; exclude: string[]; id: string }) {
  const { airports } = useAirports();
  const domestic = (airports ?? []).filter((a) => a.countryCode === "CD");
  const city = (code: string) => domestic.find((a) => a.code === code)?.city ?? code;
  const options = domestic.filter((a) => !exclude.includes(a.code) && !value.includes(a.code)).sort((a, b) => a.city.localeCompare(b.city, "fr"));
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Escales</Label>
      <div className="flex flex-wrap items-center gap-2">
        {value.length === 0 && <span className="text-sm text-muted-foreground">Direct</span>}
        {value.map((code, i) => (
          <span key={code} className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-sm">
            {i + 1}. {city(code)}
            <button type="button" onClick={() => onChange(value.filter((c) => c !== code))} aria-label={`Retirer l'escale ${city(code)}`} className="text-muted-foreground hover:text-foreground">
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
        {value.length < 3 && (
          <Select value="" onValueChange={(code) => onChange([...value, code])}>
            <SelectTrigger id={id} className="h-8 w-44">
              <SelectValue placeholder="+ Ajouter une escale" />
            </SelectTrigger>
            <SelectContent>
              {options.map((a) => (
                <SelectItem key={a.code} value={a.code}>
                  {a.city} ({a.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

/**
 * Number, times, next-day arrival, stops and aircraft. The arrival day follows the times
 * (earlier clock time = next day) and can be changed by hand.
 */
export function FlightFieldsEditor({
  value,
  onChange,
  exclude,
  idPrefix,
  className,
}: {
  value: FlightDraft;
  onChange: (draft: FlightDraft) => void;
  exclude: string[];
  idPrefix: string;
  className?: string;
}) {
  const set = (patch: Partial<FlightDraft>) => {
    const next = { ...value, ...patch };
    if (("departureTime" in patch || "arrivalTime" in patch) && isTime(next.departureTime) && isTime(next.arrivalTime)) {
      next.arrivalDayOffset = arrivalDayOffset(next.departureTime, next.arrivalTime);
    }
    onChange(next);
  };
  return (
    <div className={cn("grid gap-3 sm:grid-cols-[8rem_7rem_7rem_minmax(0,1fr)]", className)}>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-number`}>Numéro</Label>
        <Input
          id={`${idPrefix}-number`}
          value={value.flightNumber}
          onChange={(e) => set({ flightNumber: e.target.value.toUpperCase() })}
          placeholder="BU1611"
          autoComplete="off"
          className="font-mono uppercase"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-dep`}>Départ</Label>
        <Input id={`${idPrefix}-dep`} type="time" value={value.departureTime} onChange={(e) => set({ departureTime: e.target.value })} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-arr`}>Arrivée</Label>
        <Input id={`${idPrefix}-arr`} type="time" value={value.arrivalTime} onChange={(e) => set({ arrivalTime: e.target.value })} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-aircraft`}>
          Appareil <span className="font-normal text-muted-foreground">(facultatif)</span>
        </Label>
        <Input id={`${idPrefix}-aircraft`} value={value.aircraft} onChange={(e) => set({ aircraft: e.target.value })} placeholder="Airbus A320" />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-4">
        <Checkbox checked={value.arrivalDayOffset === 1} onCheckedChange={(v) => set({ arrivalDayOffset: v === true ? 1 : 0 })} />
        Arrive le lendemain
      </label>
      <div className="sm:col-span-4">
        <ViaPicker id={`${idPrefix}-via`} value={value.via} onChange={(via) => set({ via })} exclude={exclude} />
      </div>
    </div>
  );
}
