'use client';

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { WorkspaceAirline, WorkspaceFare } from "@/lib/routeBoard";
import { daysBetween, formatDayMonth, formatDaysAgo, formatFlightNumber, formatPrice } from "@/lib/format";
import { sendJson } from "@/services/http";
import { cn } from "@/lib/utils/cn-utils";

type Saved = { batch: { summary: string } | null };

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const SOURCE = { MANUAL: "saisi", AIRLINE_TIMETABLE: "horaire de la compagnie", AIRLINE_WEBSITE: "site de la compagnie" } as const;

/** Sends a workspace action, then tells what happened and reloads the page data. */
function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run(url: string, method: "POST" | "PUT", body: object) {
    setBusy(true);
    try {
      const { batch } = await sendJson<Saved>(url, method, body);
      toast.success(batch ? batch.summary : "Aucun changement.");
      router.refresh();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}

const emptyFare = { amount: "", fareName: "", sourceUrl: "", observedAt: "", travelDate: "", flightNumber: "", roundTrip: false, note: "" };

/**
 * "+ Prix observé": amount, fare name and source in one row; Enter saves. Date seen (today by
 * default), flight date, flight number, round trip and a note are one click away.
 */
function FareForm({ airline }: { airline: WorkspaceAirline }) {
  const { busy, run } = useAction();
  const [fare, setFare] = useState(emptyFare);
  const [more, setMore] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<typeof emptyFare>) => setFare((f) => ({ ...f, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await run(`/api/route-airlines/${airline.id}/fares`, "POST", {
      ...fare,
      amount: fare.amount.replace(",", "."),
      observedAt: fare.observedAt || null,
      travelDate: fare.travelDate || null,
    });
    if (ok) {
      setFare((f) => ({ ...emptyFare, sourceUrl: f.sourceUrl })); // the next price is often from the same page
      amountRef.current?.focus();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-muted/40 p-3">
      <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="fare-amount">Montant (USD)</Label>
          <Input id="fare-amount" ref={amountRef} inputMode="decimal" autoFocus required value={fare.amount} onChange={(e) => set({ amount: e.target.value })} placeholder="244" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fare-name">
            Nom du tarif <span className="font-normal text-muted-foreground">(facultatif)</span>
          </Label>
          <Input id="fare-name" value={fare.fareName} onChange={(e) => set({ fareName: e.target.value })} placeholder="Economy Classic" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fare-source">
            Source <span className="font-normal text-muted-foreground">(lien)</span>
          </Label>
          <Input id="fare-source" type="url" value={fare.sourceUrl} onChange={(e) => set({ sourceUrl: e.target.value })} placeholder="https://www.air-congo.com/…" />
        </div>
        <Button type="submit" disabled={busy || !fare.amount}>
          {busy ? "Ajout…" : "Ajouter"}
        </Button>
      </div>

      <button type="button" onClick={() => setMore((m) => !m)} className="inline-flex items-center gap-1 text-xs font-medium text-link hover:underline" aria-expanded={more}>
        <ChevronDown className={cn("size-3.5 transition-transform", more && "rotate-180")} aria-hidden="true" />
        Plus d&apos;options : date, vol précis, aller-retour, note
      </button>
      {more && (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="fare-observed">Observé le</Label>
            <Input id="fare-observed" type="date" value={fare.observedAt} onChange={(e) => set({ observedAt: e.target.value })} />
            <p className="text-xs text-muted-foreground">Vide : aujourd&apos;hui.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fare-travel">Pour le vol du</Label>
            <Input id="fare-travel" type="date" value={fare.travelDate} onChange={(e) => set({ travelDate: e.target.value })} />
            <p className="text-xs text-muted-foreground">Vide : prix « à partir de ».</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fare-flight">Numéro de vol</Label>
            <Input id="fare-flight" value={fare.flightNumber} onChange={(e) => set({ flightNumber: e.target.value.toUpperCase() })} placeholder="ET60" className="font-mono" />
          </div>
          <label className="flex items-center gap-2 self-center text-sm">
            <Checkbox checked={fare.roundTrip} onCheckedChange={(v) => set({ roundTrip: v === true })} />
            Prix aller-retour
          </label>
          <div className="space-y-1.5 sm:col-span-4">
            <Label htmlFor="fare-note">Note interne</Label>
            <Input id="fare-note" value={fare.note} onChange={(e) => set({ note: e.target.value })} placeholder="Donné par une agence au téléphone…" />
          </div>
        </div>
      )}
    </form>
  );
}

function FareRow({ fare, airline, selected, onSelect }: { fare: WorkspaceFare; airline: WorkspaceAirline; selected?: boolean; onSelect?: (on: boolean) => void }) {
  const { busy, run } = useAction();
  const observed = new Date(fare.observedAt);
  const age = daysBetween(observed, new Date());
  return (
    <li className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5", fare.reviewStatus === "REJECTED" && "opacity-55")}>
      {onSelect && <Checkbox checked={selected} onCheckedChange={(v) => onSelect(v === true)} aria-label={`Choisir ${formatPrice(fare.amount)}`} />}
      <span className="w-24 shrink-0 text-base font-bold tabular-nums">
        {fare.kind === "FROM_PRICE" && <span className="mr-1 text-xs font-medium text-muted-foreground">dès</span>}
        {formatPrice(fare.amount)}
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="font-medium">{fare.fareName ?? "Tarif sans nom"}</span>
        <span className="line-clamp-2 block text-xs text-muted-foreground" title={fare.note ?? undefined}>
          {[
            fare.travelDate ? `vol du ${formatDayMonth(new Date(`${fare.travelDate}T00:00:00Z`))}` : "à partir de",
            fare.flightNumber && formatFlightNumber(fare.flightNumber),
            fare.tripType === "ROUND_TRIP" && "aller-retour",
            fare.note,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <span className="w-40 shrink-0 text-xs text-muted-foreground">
        <span className={cn("block", age > 30 && "text-warning")}>
          observé le {formatDayMonth(observed)} ({formatDaysAgo(observed)})
        </span>
        {fare.sourceUrl ? (
          <a href={fare.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-link underline">
            {hostOf(fare.sourceUrl)}
          </a>
        ) : (
          SOURCE[fare.source]
        )}
      </span>
      <span className="flex w-auto shrink-0 items-center gap-1">
        {fare.reviewStatus === "PENDING" ? (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(`/api/route-airlines/${airline.id}/fares/review`, "POST", { ids: [fare.id], decision: "APPROVED" })}>
              <Check className="size-4" aria-hidden="true" />
              Valider
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(`/api/route-airlines/${airline.id}/fares/review`, "POST", { ids: [fare.id], decision: "REJECTED" })}>
              <X className="size-4" aria-hidden="true" />
              Rejeter
            </Button>
          </>
        ) : (
          <Badge variant={fare.reviewStatus === "APPROVED" ? "success" : "neutral"}>{fare.reviewStatus === "APPROVED" ? "Validé" : "Rejeté"}</Badge>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="text-danger hover:text-danger" disabled={busy} aria-label={`Supprimer le prix ${formatPrice(fare.amount)}`}>
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce prix ?</AlertDialogTitle>
              <AlertDialogDescription>
                Seulement pour une erreur de saisie. Un vrai prix devenu ancien reste : il fait l&apos;historique des prix. « Défaire » le rétablit.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Garder</AlertDialogCancel>
              <AlertDialogAction onClick={() => run(`/api/route-airlines/${airline.id}/fares/delete`, "POST", { id: fare.id })}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </span>
    </li>
  );
}

/** Prices of one airline on this route: what waits for review first, then the history. */
export function FarePanel({ airline }: { airline: WorkspaceAirline }) {
  const { busy, run } = useAction();
  const [adding, setAdding] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const pending = airline.fares.filter((f) => f.reviewStatus === "PENDING");
  const [picked, setPicked] = useState<string[]>([]);
  const rest = airline.fares.filter((f) => f.reviewStatus === "APPROVED" || (showRejected && f.reviewStatus === "REJECTED"));
  const rejected = airline.fares.filter((f) => f.reviewStatus === "REJECTED").length;
  const review = (decision: "APPROVED" | "REJECTED") =>
    run(`/api/route-airlines/${airline.id}/fares/review`, "POST", { ids: picked.length ? picked : pending.map((f) => f.id), decision }).then((ok) => ok && setPicked([]));

  return (
    <section aria-labelledby={`fares-${airline.id}`} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`fares-${airline.id}`} className="text-base font-semibold">
          Prix observés
        </h3>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Prix observé
          </Button>
        )}
      </div>
      {adding && <FareForm airline={airline} />}
      {adding && (
        <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setAdding(false)}>
          Fermer le formulaire
        </button>
      )}

      {pending.length > 0 && (
        <div className="rounded-lg border border-warning-border bg-warning-subtle/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              À valider · {pending.length} <span className="font-normal text-muted-foreground">(importés ou repris, pas encore publics)</span>
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => review("APPROVED")}>
                <Check className="size-4" aria-hidden="true" />
                {picked.length ? `Valider la sélection (${picked.length})` : "Tout valider"}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => review("REJECTED")}>
                {picked.length ? `Rejeter la sélection (${picked.length})` : "Tout rejeter"}
              </Button>
            </div>
          </div>
          <ul className="divide-y">
            {pending.map((f) => (
              <FareRow
                key={f.id}
                fare={f}
                airline={airline}
                selected={picked.includes(f.id)}
                onSelect={(on) => setPicked((p) => (on ? [...p, f.id] : p.filter((id) => id !== f.id)))}
              />
            ))}
          </ul>
        </div>
      )}

      {rest.length === 0 && pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun prix pour cette compagnie sur cette route.</p>
      ) : (
        <ul className="divide-y">
          {rest.map((f) => (
            <FareRow key={f.id} fare={f} airline={airline} />
          ))}
        </ul>
      )}
      {rejected > 0 && (
        <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setShowRejected((s) => !s)}>
          {showRejected ? "Masquer" : "Afficher"} les prix rejetés ({rejected})
        </button>
      )}
    </section>
  );
}

/** The airline's public note on this route, shown on its flight pages. */
export function NoteEditor({ airline }: { airline: WorkspaceAirline }) {
  const { busy, run } = useAction();
  const [note, setNote] = useState(airline.note ?? "");
  const dirty = note.trim() !== (airline.note ?? "");
  return (
    <section aria-labelledby={`note-${airline.id}`} className="space-y-2">
      <h3 id={`note-${airline.id}`} className="text-base font-semibold">
        Note publique sur {airline.code}
      </h3>
      <Textarea
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Bagages : 23 kg en soute, 7 kg en cabine. Tarifs : Economy, Business…"
        aria-describedby={`note-hint-${airline.id}`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" disabled={!dirty || busy} onClick={() => run(`/api/route-airlines/${airline.id}/note`, "PUT", { note })}>
          Enregistrer la note
        </Button>
        <p id={`note-hint-${airline.id}`} className="text-xs text-muted-foreground">
          Affichée sur les pages de vol de {airline.code} pour cette route : bagages, noms des tarifs, conditions. Sans lien vers la compagnie.
        </p>
      </div>
    </section>
  );
}
