'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlightFieldsEditor, draftPayload, emptyDraft, isTime, type FlightDraft } from "./FlightFields";
import type { WorkspaceAirline, WorkspaceData, WorkspaceFlight } from "@/lib/routeBoard";
import { addDays } from "@/lib/schedule";
import { formatDateLong } from "@/lib/format";
import { sendJson } from "@/services/http";

type Row = FlightDraft & { key: string; id?: string; status: "SCHEDULED" | "CANCELLED" };

const draftOf = (f: WorkspaceFlight): FlightDraft => ({
  flightNumber: f.flightNumber ?? "",
  departureTime: f.departureTime,
  arrivalTime: f.arrivalTime,
  arrivalDayOffset: f.arrivalDayOffset,
  via: f.via,
  aircraft: f.aircraft ?? "",
});

const toRow = (f: WorkspaceFlight): Row => ({ ...draftOf(f), key: f.id, id: f.id, status: f.status });

/**
 * A new flight starts from what this airline usually does that weekday: the flight a week
 * earlier, else the last schedule applied, else empty.
 */
function suggestion(airline: WorkspaceAirline, date: string, taken: Row[]): FlightDraft {
  const weekBefore = airline.flights.filter((f) => f.date === addDays(date, -7));
  const free = weekBefore.find((f) => !taken.some((r) => r.flightNumber === (f.flightNumber ?? "") && r.departureTime === f.departureTime));
  if (free) return draftOf(free);
  const last = airline.lastSchedule as Partial<FlightDraft> | null;
  if (last?.departureTime && taken.length === 0) {
    return { ...emptyDraft, ...last, flightNumber: last.flightNumber ?? "", aircraft: last.aircraft ?? "", via: last.via ?? [] };
  }
  return emptyDraft;
}

/** The flights of one date for one airline, edited as a list and saved together. */
export function DayEditorDialog({
  airline,
  workspace,
  date,
  onClose,
}: {
  airline: WorkspaceAirline;
  workspace: WorkspaceData;
  date: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const stored = airline.flights.filter((f) => f.date === date);
  const [rows, setRows] = useState<Row[]>(() => {
    const existing = stored.map(toRow);
    return existing.length > 0 ? existing : [{ ...suggestion(airline, date, []), key: "new-0", status: "SCHEDULED" }];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const incomplete = rows.some((r) => !isTime(r.departureTime) || !isTime(r.arrivalTime));
  const update = (key: string, patch: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const { batch } = await sendJson<{ batch: { summary: string } | null }>(`/api/route-airlines/${airline.id}/day`, "PUT", {
        date,
        flights: rows.map((r) => ({ ...draftPayload(r), id: r.id, status: r.status })),
      });
      toast.success(batch ? batch.summary : "Aucun changement.");
      onClose();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!incomplete) save();
          }}
        >
          <DialogHeader>
            <DialogTitle className="first-letter:uppercase">
              {formatDateLong(new Date(`${date}T00:00:00Z`))} · {airline.code}
            </DialogTitle>
            <DialogDescription>
              {stored.length === 0 ? "Aucun vol ce jour-là." : `${stored.length} vol${stored.length > 1 ? "s" : ""} enregistré${stored.length > 1 ? "s" : ""}.`} Heures locales.
              Un vol retiré de la liste est supprimé ; pour un vol qui n&apos;a pas lieu, choisissez plutôt « Annulé ».
            </DialogDescription>
          </DialogHeader>

          {rows.length === 0 && <p className="text-sm text-muted-foreground">Plus aucun vol : enregistrer supprimera ceux de ce jour.</p>}
          <ol className="space-y-4">
            {rows.map((r, i) => (
              <li key={r.key} className="rounded-lg border p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">Vol {i + 1}</span>
                  {!r.id && <Badge variant="info">nouveau</Badge>}
                  <div className="ml-auto flex items-center gap-2">
                    <Select value={r.status} onValueChange={(status) => update(r.key, { status: status as Row["status"] })}>
                      <SelectTrigger className="h-8 w-32" aria-label={`État du vol ${i + 1}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SCHEDULED">Prévu</SelectItem>
                        <SelectItem value="CANCELLED">Annulé</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-danger hover:text-danger"
                      onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))}
                      aria-label={`Retirer le vol ${i + 1}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <FlightFieldsEditor
                  value={r}
                  onChange={(draft) => update(r.key, draft)}
                  exclude={[workspace.origin, workspace.destination]}
                  idPrefix={`day-${i}`}
                />
              </li>
            ))}
          </ol>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRows((all) => [...all, { ...suggestion(airline, date, all), key: `new-${Date.now()}`, status: "SCHEDULED" }])}
          >
            <Plus className="size-4" aria-hidden="true" />
            Ajouter un vol
          </Button>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button type="submit" disabled={saving || incomplete}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
