'use client';

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftRight, CalendarPlus, CalendarX, CheckCheck, ChevronLeft, ChevronRight, Copy, Plus, Undo2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { RouteFreshnessBadge, ROUTE_AIRLINE_STATUS } from "@/components/backoffice/RouteParts";
import { ScheduleCalendar } from "./ScheduleCalendar";
import { ApplyScheduleDialog, CancelFlightsDialog, CopyWeekDialog } from "./BulkDialogs";
import { DayEditorDialog } from "./DayEditorDialog";
import type { WorkspaceAirline, WorkspaceData } from "@/lib/routeBoard";
import { addDays, mondayOf } from "@/lib/schedule";
import { formatDateShort, formatDayMonth, formatFlightNumber } from "@/lib/format";
import { sendJson } from "@/services/http";
import { cn } from "@/lib/utils/cn-utils";

const dm = (d: string) => formatDayMonth(new Date(`${d}T00:00:00Z`));
const ago = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 60 * 24) return `il y a ${Math.round(minutes / 60)} h`;
  return `le ${formatDateShort(new Date(iso))}`;
};

/** Adds an airline to the route; it starts active and unpublished. */
function AddAirline({ routeId, workspace, onAdded }: { routeId: string; workspace: WorkspaceData; onAdded: (code: string) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [airlineId, setAirlineId] = useState("");
  const [saving, setSaving] = useState(false);
  async function add() {
    setSaving(true);
    try {
      await sendJson(`/api/routes/${routeId}/airlines`, "POST", { airlineId });
      const code = workspace.otherAirlines.find((a) => a.id === airlineId)?.code ?? "";
      setOpen(false);
      setAirlineId("");
      toast.success("Compagnie ajoutée à la route");
      onAdded(code);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  if (workspace.otherAirlines.length === 0) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden="true" />
        Ajouter une compagnie
      </Button>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Ajouter une compagnie sur cette route</DialogTitle>
        </DialogHeader>
        <Select value={airlineId} onValueChange={setAirlineId}>
          <SelectTrigger aria-label="Compagnie">
            <SelectValue placeholder="Choisir une compagnie" />
          </SelectTrigger>
          <SelectContent>
            {workspace.otherAirlines.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.code} · {a.name}
                {a.status !== "OPERATING" && " (suspendue ou arrêtée)"}
                {!a.isPublished && " (masquée)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Elle commence active et non publiée : saisissez ses vols, puis publiez-la.</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Fermer
          </Button>
          <Button type="button" disabled={!airlineId || saving} onClick={add}>
            {saving ? "Ajout…" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Status on this route and publication, saved as soon as they change. */
function AirlineSettings({ airline }: { airline: WorkspaceAirline }) {
  const router = useRouter();
  async function save(patch: Partial<Pick<WorkspaceAirline, "status" | "isPublished">>) {
    try {
      await sendJson(`/api/route-airlines/${airline.id}`, "PUT", { status: airline.status, isPublished: airline.isPublished, ...patch });
      toast.success("Enregistré");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Label htmlFor={`ra-status-${airline.id}`} className="text-muted-foreground">
          Sur cette route
        </Label>
        <Select value={airline.status} onValueChange={(status) => save({ status: status as WorkspaceAirline["status"] })}>
          <SelectTrigger id={`ra-status-${airline.id}`} className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROUTE_AIRLINE_STATUS) as (keyof typeof ROUTE_AIRLINE_STATUS)[]).map((s) => (
              <SelectItem key={s} value={s}>
                {ROUTE_AIRLINE_STATUS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2">
        <Switch checked={airline.isPublished} onCheckedChange={(isPublished) => save({ isPublished })} />
        Publiée
      </label>
    </div>
  );
}

type Open = null | "apply" | "copy" | "cancel";

/**
 * The route workspace (docs/ROUTE-MODEL.md §6.2): one tab per airline, an 8-week calendar of its
 * flights, and the bulk tools. Every action is one batch; "Défaire" reverts the latest.
 */
export function RouteWorkspace({ routeId, workspace, reverseSlug }: { routeId: string; workspace: WorkspaceData; reverseSlug: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState<Open>(null);
  const [copyFrom, setCopyFrom] = useState(workspace.start);
  const [day, setDay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const href = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  const selected = workspace.airlines.find((a) => a.code === params.get("compagnie")) ?? workspace.airlines[0];
  const select = (code: string) => router.replace(href({ compagnie: code }), { scroll: false });

  async function act(url: string, done: (body: { batch: { summary: string } | null; undone?: string }) => string) {
    setBusy(true);
    try {
      const body = await sendJson<{ batch: { summary: string } | null; undone?: string }>(url, "POST", {});
      toast.success(done(body));
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const thisWeek = mondayOf(workspace.today);
  const end = addDays(workspace.start, workspace.weeks * 7 - 1);

  return (
    <section aria-labelledby="workspace-title" className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-1 border-b px-4 pt-3">
        <h2 id="workspace-title" className="sr-only">
          Vols par compagnie
        </h2>
        <div role="tablist" aria-label="Compagnies sur cette route" className="flex flex-wrap gap-1">
          {workspace.airlines.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={a.id === selected?.id}
              onClick={() => select(a.code)}
              className={cn(
                "-mb-px inline-flex items-center gap-2 rounded-t-md border border-b-0 px-3 py-2 text-sm font-medium",
                a.id === selected?.id ? "border-border bg-card text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="font-mono font-bold">{a.code}</span>
              <span className="hidden max-w-40 truncate md:inline">{a.name}</span>
              {a.status !== "ACTIVE" && <Badge variant="neutral">{ROUTE_AIRLINE_STATUS[a.status]}</Badge>}
            </button>
          ))}
        </div>
        <div className="ml-auto pb-2">
          <AddAirline routeId={routeId} workspace={workspace} onAdded={select} />
        </div>
      </div>

      {!selected ? (
        <p className="p-6 text-sm text-muted-foreground">Aucune compagnie sur cette route. Ajoutez-en une pour saisir ses vols.</p>
      ) : (
        <div className="space-y-4 p-4" role="tabpanel" aria-label={selected.name}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <RouteFreshnessBadge freshness={selected.freshness} />
            <span className="text-sm text-muted-foreground">
              {selected.next
                ? `Prochain vol ${formatDateShort(new Date(`${selected.next.date}T00:00:00Z`))} à ${selected.next.time}${selected.next.flightNumber ? ` (${formatFlightNumber(selected.next.flightNumber)})` : ""}`
                : "Aucun vol à venir"}
              {selected.knownUntil && ` · connu jusqu'au ${dm(selected.knownUntil)}`}
            </span>
            {selected.airlineStatus !== "OPERATING" && <Badge variant="danger">Compagnie {selected.airlineStatus === "SUSPENDED" ? "suspendue" : "arrêtée"}</Badge>}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-auto"
              disabled={busy}
              onClick={() => act(`/api/route-airlines/${selected.id}/verify`, (b) => b.batch?.summary ?? "Vérifié")}
            >
              <CheckCheck className="size-4" aria-hidden="true" />
              Tout est vérifié
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => setOpen("apply")}>
              <CalendarPlus className="size-4" aria-hidden="true" />
              Appliquer un horaire
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const withFlights = Array.from({ length: workspace.weeks }, (_, i) => addDays(workspace.start, 7 * i)).filter((w) =>
                  selected.flights.some((f) => f.status === "SCHEDULED" && f.date >= w && f.date <= addDays(w, 6)),
                );
                setCopyFrom(withFlights.includes(thisWeek) ? thisWeek : (withFlights.at(-1) ?? workspace.start));
                setOpen("copy");
              }}
            >
              <Copy className="size-4" aria-hidden="true" />
              Copier une semaine
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen("cancel")}>
              <CalendarX className="size-4" aria-hidden="true" />
              Annuler des vols
            </Button>
            {selected.lastAction && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" className="ml-auto max-w-full" disabled={busy}>
                    <Undo2 className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">Défaire la dernière action</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Défaire la dernière action ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      « {selected.lastAction.summary} » ({ago(selected.lastAction.at)}). Tout ce qu&apos;elle a changé revient comme avant. On peut
                      ensuite défaire l&apos;action précédente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Garder</AlertDialogCancel>
                    <AlertDialogAction onClick={() => act(`/api/route-airlines/${selected.id}/undo`, (b) => `Défait : ${b.undone}`)}>
                      Défaire
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          {selected.lastAction && (
            <p className="-mt-2 text-xs text-muted-foreground">
              Dernière action ({ago(selected.lastAction.at)}) : {selected.lastAction.summary}
            </p>
          )}

          <nav aria-label="Période du calendrier" className="flex flex-wrap items-center gap-2 text-sm">
            <Link href={href({ semaine: addDays(workspace.start, -28) })} scroll={false} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <ChevronLeft className="size-4" aria-hidden="true" />4 semaines
            </Link>
            <span className="font-medium">
              {dm(workspace.start)} – {dm(end)}
            </span>
            <Link href={href({ semaine: addDays(workspace.start, 28) })} scroll={false} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              4 semaines
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
            {workspace.start !== thisWeek && (
              <Link href={href({ semaine: null })} scroll={false} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Cette semaine
              </Link>
            )}
            {reverseSlug && (
              <Link
                href={`/dashboard/routes/${reverseSlug}?compagnie=${encodeURIComponent(selected.code)}${params.get("semaine") ? `&semaine=${params.get("semaine")}` : ""}`}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "ml-auto")}
              >
                <ArrowLeftRight className="size-4" aria-hidden="true" />
                Même compagnie, sens retour
              </Link>
            )}
          </nav>

          <ScheduleCalendar
            airline={selected}
            workspace={workspace}
            onDay={setDay}
            onCopyWeek={(week) => {
              setCopyFrom(week);
              setOpen("copy");
            }}
          />

          <div className="border-t pt-4">
            <AirlineSettings airline={selected} />
          </div>

          {/* Keyed by airline and data: a dialog opened after a refresh starts from the latest state. */}
          {open === "apply" && <ApplyScheduleDialog key={selected.id} airline={selected} workspace={workspace} open onOpenChange={(o) => !o && setOpen(null)} />}
          {open === "copy" && (
            <CopyWeekDialog key={`${selected.id}-${copyFrom}`} airline={selected} workspace={workspace} weekStart={copyFrom} open onOpenChange={(o) => !o && setOpen(null)} />
          )}
          {open === "cancel" && <CancelFlightsDialog key={selected.id} airline={selected} workspace={workspace} open onOpenChange={(o) => !o && setOpen(null)} />}
          {day && <DayEditorDialog key={`${selected.id}-${day}`} airline={selected} workspace={workspace} date={day} onClose={() => setDay(null)} />}
        </div>
      )}
    </section>
  );
}
