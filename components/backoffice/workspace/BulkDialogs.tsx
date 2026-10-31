'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlightFieldsEditor, WeekdayPicker, draftPayload, emptyDraft, isTime, type FlightDraft } from "./FlightFields";
import { PlanPreview, dayList, usePreview } from "./Preview";
import type { WorkspaceAirline, WorkspaceData } from "@/lib/routeBoard";
import type { Plan, StoredFlight } from "@/lib/schedule";
import { addDays } from "@/lib/schedule";
import type { Weekday } from "@/lib/generated/prisma/enums";
import { formatDayMonth, formatFlightNumber } from "@/lib/format";
import { sendJson } from "@/services/http";

type Common = { airline: WorkspaceAirline; workspace: WorkspaceData; open: boolean; onOpenChange: (open: boolean) => void };
type Saved = { batch: { summary: string } | null };

const dm = (d: string) => formatDayMonth(new Date(`${d}T00:00:00Z`));
const span = (from: string, to: string) => Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);

function useSave(onOpenChange: (open: boolean) => void) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  async function save(url: string, payload: object) {
    setSaving(true);
    try {
      const { batch } = await sendJson<Saved>(url, "POST", { ...payload, mode: "apply" });
      toast.success(batch ? batch.summary : "Aucun changement à enregistrer.");
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return { saving, save };
}

/** Pre-filled from the last schedule applied for this airline on this route, dates moved just after it. */
function initialSchedule(airline: WorkspaceAirline, today: string) {
  const last = airline.lastSchedule as
    | (Partial<Record<"flightNumber" | "aircraft" | "sourceUrl" | "departureTime" | "arrivalTime" | "from" | "to", string | null>> & {
        arrivalDayOffset?: number;
        via?: string[];
        days?: Weekday[];
      })
    | null;
  if (!last?.from || !last.to) return { draft: emptyDraft, days: [] as Weekday[], from: today, to: addDays(today, 6), sourceUrl: "" };
  const from = addDays(last.to, 1) > today ? addDays(last.to, 1) : today;
  return {
    draft: {
      flightNumber: last.flightNumber ?? "",
      departureTime: last.departureTime ?? "",
      arrivalTime: last.arrivalTime ?? "",
      arrivalDayOffset: last.arrivalDayOffset ?? 0,
      via: last.via ?? [],
      aircraft: last.aircraft ?? "",
    },
    days: last.days ?? [],
    from,
    to: addDays(from, Math.min(span(last.from, last.to), 27)),
    sourceUrl: last.sourceUrl ?? "",
  };
}

/** "Appliquer un horaire": one flight on chosen weekdays between two dates, previewed live. */
export function ApplyScheduleDialog({ airline, workspace, open, onOpenChange }: Common) {
  const [initial] = useState(() => initialSchedule(airline, workspace.today));
  const [draft, setDraft] = useState<FlightDraft>(initial.draft);
  const [days, setDays] = useState<Weekday[]>(initial.days);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl);
  const url = `/api/route-airlines/${airline.id}/schedule`;
  const ready = days.length > 0 && isTime(draft.departureTime) && isTime(draft.arrivalTime) && !!from && !!to;
  const payload = ready ? { ...draftPayload(draft), days, from, to, sourceUrl } : null;
  const { result, error, loading } = usePreview<{ plan: Plan }>(url, payload);
  const { saving, save } = useSave(onOpenChange);
  const writes = result ? result.plan.add.length + result.plan.update.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (payload && writes > 0) save(url, payload);
          }}
        >
          <DialogHeader>
            <DialogTitle>Appliquer un horaire · {airline.code}</DialogTitle>
            <DialogDescription>
              Un vol, les jours choisis, entre deux dates. Les vols déjà saisis avec le même numéro sont mis à jour, jamais doublés.
              {airline.lastSchedule ? " Rempli à partir du dernier horaire appliqué." : ""}
            </DialogDescription>
          </DialogHeader>
          <FlightFieldsEditor value={draft} onChange={setDraft} exclude={[workspace.origin, workspace.destination]} idPrefix="apply" />
          <WeekdayPicker value={days} onChange={setDays} />
          <div className="grid gap-3 sm:grid-cols-[10rem_10rem_minmax(0,1fr)]">
            <div className="space-y-1.5">
              <Label htmlFor="apply-from">Du</Label>
              <Input id="apply-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apply-to">Au (inclus)</Label>
              <Input id="apply-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apply-source">
                Source <span className="font-normal text-muted-foreground">(facultatif)</span>
              </Label>
              <Input id="apply-source" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" />
            </div>
          </div>
          {!ready && <p className="text-sm text-muted-foreground">Indiquez les heures et au moins un jour pour voir l&apos;aperçu.</p>}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {result && !error && <PlanPreview plan={result.plan} className={loading ? "opacity-60" : undefined} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button type="submit" disabled={!payload || !result || !!error || loading || saving || writes === 0}>
              {saving ? "Enregistrement…" : writes > 0 ? `Enregistrer (${writes} vol${writes > 1 ? "s" : ""})` : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "Copier une semaine" on the next weeks; days that already have flights are skipped. */
export function CopyWeekDialog({ airline, workspace, open, onOpenChange, weekStart: initialWeek }: Common & { weekStart: string }) {
  const [weekStart, setWeekStart] = useState(initialWeek);
  const [weeks, setWeeks] = useState("3");
  const url = `/api/route-airlines/${airline.id}/copy-week`;
  const n = Number(weeks);
  const payload = Number.isInteger(n) && n >= 1 && n <= 12 ? { weekStart, weeks: n } : null;
  const { result, error, loading } = usePreview<{ plan: Plan }>(url, payload);
  const { saving, save } = useSave(onOpenChange);
  const options = Array.from({ length: workspace.weeks }, (_, i) => addDays(workspace.start, 7 * i));
  const count = (w: string) => airline.flights.filter((f) => f.status === "SCHEDULED" && f.date >= w && f.date <= addDays(w, 6)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (payload && result?.plan.add.length) save(url, payload);
          }}
        >
          <DialogHeader>
            <DialogTitle>Copier une semaine · {airline.code}</DialogTitle>
            <DialogDescription>Les vols prévus de la semaine sont repris les semaines suivantes. Un jour qui a déjà des vols est laissé tel quel. Les copies ne comptent pas comme vérifiées.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <div className="space-y-1.5">
              <Label htmlFor="copy-week">Semaine à copier</Label>
              <Select value={weekStart} onValueChange={setWeekStart}>
                <SelectTrigger id="copy-week">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((w) => (
                    <SelectItem key={w} value={w}>
                      {dm(w)} – {dm(addDays(w, 6))} · {count(w)} vol{count(w) > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="copy-count">Sur</Label>
              <div className="flex items-center gap-2">
                <Input id="copy-count" type="number" min={1} max={12} value={weeks} onChange={(e) => setWeeks(e.target.value)} className="w-16" />
                <span className="text-sm">sem.</span>
              </div>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {result && !error && <PlanPreview plan={result.plan} className={loading ? "opacity-60" : undefined} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button type="submit" disabled={!result?.plan.add.length || !!error || loading || saving}>
              {saving ? "Copie…" : result?.plan.add.length ? `Copier (${result.plan.add.length} vols)` : "Copier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "Annuler des vols": marks them cancelled; they stay in the calendar, struck through. */
export function CancelFlightsDialog({ airline, workspace, open, onOpenChange }: Common) {
  const [from, setFrom] = useState(workspace.today);
  const [to, setTo] = useState(addDays(workspace.today, 6));
  const [days, setDays] = useState<Weekday[]>([]);
  const [flightNumber, setFlightNumber] = useState("all");
  const url = `/api/route-airlines/${airline.id}/cancel`;
  const numbers = [...new Set(airline.flights.map((f) => f.flightNumber).filter((n): n is string => !!n))].sort();
  const payload = from && to ? { from, to, days, flightNumber: flightNumber === "all" ? null : flightNumber } : null;
  const { result, error, loading } = usePreview<{ flights: StoredFlight[] }>(url, payload);
  const { saving, save } = useSave(onOpenChange);
  const count = result?.flights.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (payload && count > 0) save(url, payload);
          }}
        >
          <DialogHeader>
            <DialogTitle>Annuler des vols · {airline.code}</DialogTitle>
            <DialogDescription>Les vols annulés restent visibles, barrés, avec leur historique. « Défaire » les rétablit.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cancel-from">Du</Label>
              <Input id="cancel-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cancel-to">Au (inclus)</Label>
              <Input id="cancel-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <WeekdayPicker value={days} onChange={setDays} label="Jours (aucun choisi = tous)" />
          <div className="space-y-1.5">
            <Label htmlFor="cancel-number">Vol</Label>
            <Select value={flightNumber} onValueChange={setFlightNumber}>
              <SelectTrigger id="cancel-number" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les vols</SelectItem>
                {numbers.map((n) => (
                  <SelectItem key={n} value={n}>
                    {formatFlightNumber(n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {result && !error && (
            <div className={`rounded-md border bg-muted/50 p-3 text-sm ${loading ? "opacity-60" : ""}`} aria-live="polite">
              <p className="mb-1 font-medium">Aperçu</p>
              {count === 0 ? (
                <p className="text-muted-foreground">Aucun vol prévu ne correspond.</p>
              ) : (
                <p className="text-danger">
                  {count} vol{count > 1 ? "s" : ""} à annuler : {dayList(result.flights.map((f) => f.date))}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button type="submit" variant="destructive" disabled={count === 0 || !!error || loading || saving}>
              {saving ? "Annulation…" : count > 0 ? `Annuler ${count} vol${count > 1 ? "s" : ""}` : "Annuler les vols"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
