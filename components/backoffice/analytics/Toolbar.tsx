'use client';

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarDays, ListFilter, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHANNEL_LABEL, CHANNELS } from "@/lib/analytics/channel";
import type { PeriodKey } from "@/lib/analytics/period";
import type { Filters, FilterOptions } from "@/lib/analytics/report";
import { formatDayMonth } from "@/lib/format";
import { cn } from "@/lib/utils/cn-utils";

const PRESETS: { key: Exclude<PeriodKey, "dates">; label: string; title: string }[] = [
  { key: "today", label: "Aujourd'hui", title: "Aujourd'hui, heure par heure" },
  { key: "7j", label: "7 j", title: "7 derniers jours" },
  { key: "30j", label: "30 j", title: "30 derniers jours" },
  { key: "90j", label: "90 j", title: "90 derniers jours" },
];
const DEVICES: Record<string, string> = { mobile: "Téléphone", tablet: "Tablette", desktop: "Ordinateur" };
const ALL = "__all";
const day = (d: string) => new Date(`${d}T12:00:00Z`);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Props = { period: { key: PeriodKey; from: string; to: string }; today: string; filters: Filters; options: FilterOptions };

/**
 * The page's controls on one line: the period (presets and a date range), the filters behind one
 * button, and the active filters as chips that remove themselves. Everything lives in the address,
 * so a view can be shared or bookmarked.
 */
export function Toolbar({ period, today, filters, options }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    start(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  const chips = [
    filters.channel && { key: "source", label: "Source", value: CHANNEL_LABEL[filters.channel as keyof typeof CHANNEL_LABEL] ?? filters.channel },
    filters.campaign && { key: "campagne", label: "Campagne", value: filters.campaign },
    filters.route && { key: "trajet", label: "Trajet", value: options.routes.find((r) => r.slug === filters.route)?.label ?? filters.route },
    filters.device && { key: "appareil", label: "Appareil", value: DEVICES[filters.device] ?? filters.device },
  ].filter(Boolean) as { key: string; label: string; value: string }[];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Période" className="inline-flex h-9 items-center rounded-lg border bg-card p-0.5 shadow-card">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            title={p.title}
            aria-pressed={period.key === p.key}
            onClick={() => go({ periode: p.key === "7j" ? null : p.key, du: null, au: null })}
            className={cn(
              "h-full rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              period.key === p.key && "bg-accent text-accent-foreground hover:text-accent-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
        <RangePicker period={period} today={today} onPick={(du, au) => go({ periode: "dates", du, au })} />
      </div>

      <FilterMenu filters={filters} options={options} count={chips.length} onChange={go} />

      {chips.map((c) => (
        <span key={c.key} className="inline-flex h-7 items-center gap-1 rounded-full border border-brand-200 bg-brand-50 pl-2.5 pr-1 text-xs text-accent-foreground">
          <span className="text-muted-foreground">{c.label} :</span>
          <span className="max-w-48 truncate font-medium">{c.value}</span>
          <button type="button" onClick={() => go({ [c.key]: null })} aria-label={`Retirer le filtre ${c.label}`} className="grid size-5 place-items-center rounded-full hover:bg-brand-100">
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button type="button" onClick={() => go({ source: null, campagne: null, trajet: null, appareil: null })} className="text-xs font-medium text-link hover:underline">
          Tout effacer
        </button>
      )}
      {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Chargement" />}
    </div>
  );
}

function RangePicker({ period, today, onPick }: { period: Props["period"]; today: string; onPick: (du: string, au: string) => void }) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(period.key === "dates" ? { from: day(period.from), to: day(period.to) } : undefined);
  const custom = period.key === "dates";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-pressed={custom}
          className={cn(
            "inline-flex h-full items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            custom && "bg-accent text-accent-foreground hover:text-accent-foreground",
          )}
        >
          <CalendarDays className="size-4" aria-hidden="true" />
          {custom ? (period.from === period.to ? formatDayMonth(day(period.from)) : `${formatDayMonth(day(period.from))} – ${formatDayMonth(day(period.to))}`) : "Dates"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="range"
          locale={fr}
          weekStartsOn={1}
          numberOfMonths={2}
          defaultMonth={range?.from ?? new Date(day(today).getTime() - 30 * 86_400_000)}
          selected={range}
          onSelect={setRange}
          disabled={{ after: day(today) }}
        />
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {range?.from ? `${formatDayMonth(range.from)}${range.to ? ` – ${formatDayMonth(range.to)}` : ""}` : "Choisissez le premier et le dernier jour"}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={!range?.from}
              onClick={() => {
                if (!range?.from) return;
                onPick(iso(range.from), iso(range.to ?? range.from));
                setOpen(false);
              }}
            >
              Appliquer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterMenu({ filters, options, count, onChange }: { filters: Filters; options: FilterOptions; count: number; onChange: (patch: Record<string, string | null>) => void }) {
  const field = (id: string, label: string, value: string | null, param: string, items: { value: string; label: string }[], placeholder: string) => (
    <div className="grid grid-cols-[6rem_1fr] items-center gap-3">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value ?? ALL} onValueChange={(v) => onChange({ [param]: v === ALL ? null : v })}>
        <SelectTrigger id={id} className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{placeholder}</SelectItem>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 shadow-card">
          <ListFilter className="size-4" aria-hidden="true" />
          Filtres
          {count > 0 && <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{count}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3 p-4">
        <p className="text-sm font-semibold">Filtrer les chiffres</p>
        {field("f-source", "Source", filters.channel, "source", CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABEL[c] })), "Toutes")}
        {field("f-campagne", "Campagne", filters.campaign, "campagne", options.campaigns.map((c) => ({ value: c, label: c })), options.campaigns.length ? "Toutes" : "Aucune campagne")}
        {field("f-trajet", "Trajet", filters.route, "trajet", options.routes.map((r) => ({ value: r.slug, label: r.label })), "Tous")}
        {field("f-appareil", "Appareil", filters.device, "appareil", Object.entries(DEVICES).map(([value, label]) => ({ value, label })), "Tous")}
        <p className="border-t pt-3 text-xs text-muted-foreground">Astuce : un clic sur une source, un trajet ou un appareil dans les listes filtre la page.</p>
      </PopoverContent>
    </Popover>
  );
}
