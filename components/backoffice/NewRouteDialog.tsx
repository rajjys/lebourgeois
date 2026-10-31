'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Info, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AirportCombobox, airportCode } from "@/components/AirportCombobox";
import { useAirports } from "@/hooks/useAirports";
import { routeSlug } from "@/lib/routes";

type Created = { created: string[]; existing: string[] };

/** Routes that already exist, by "FIH-FBM", so the dialog can point to them instead of failing. */
export type ExistingRoutes = Record<string, { slug: string; label: string }>;

/** Pick two airports, a priority, and whether to create the return route too. The slug is generated. */
export function NewRouteDialog({ existing }: { existing: ExistingRoutes }) {
  const router = useRouter();
  const { airports } = useAirports();
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [tier, setTier] = useState("3");
  const [withReturn, setWithReturn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const originCode = airportCode(origin);
  const destinationCode = airportCode(destination);
  const slugOf = (code: string | null) => airports?.find((a) => a.code === code)?.slug;
  const originSlug = slugOf(originCode);
  const destinationSlug = slugOf(destinationCode);
  const preview = originSlug && destinationSlug && originSlug !== destinationSlug ? routeSlug(originSlug, destinationSlug) : null;

  // Known as soon as both airports are picked: say which direction exists and link to it.
  const pairChosen = !!originCode && !!destinationCode && originCode !== destinationCode;
  const outbound = pairChosen ? existing[`${originCode}-${destinationCode}`] : undefined;
  const inbound = pairChosen && withReturn ? existing[`${destinationCode}-${originCode}`] : undefined;
  const found = [outbound, inbound].filter((r): r is ExistingRoutes[string] => !!r);
  const nothingToCreate = !!outbound && (!withReturn || !!inbound);
  const submitLabel = nothingToCreate ? "Rien à créer" : outbound ? "Créer le retour" : inbound ? "Créer l'aller" : "Créer";

  function reset() {
    setOrigin("");
    setDestination("");
    setTier("3");
    setWithReturn(true);
    setError(null);
    setConflicts([]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setConflicts([]);
    if (!originCode || !destinationCode) return setError("Choisissez les deux aéroports.");
    if (originCode === destinationCode) return setError("Choisissez deux aéroports différents.");
    setSaving(true);
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originCode, destinationCode, tier: Number(tier), withReturn }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "La création a échoué.");
        // Created by someone else meanwhile: still offer to open it.
        setConflicts(body.details?.existing ?? []);
        return;
      }
      const { created, existing } = body as Created;
      toast.success(
        `${created.length === 2 ? "Routes créées" : "Route créée"} : ${created.join(", ")}` +
          (existing.length ? ` (${existing.join(", ")} existait déjà)` : ""),
      );
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      setError("La création a échoué. Vérifiez la connexion et réessayez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          Nouvelle route
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Nouvelle route</DialogTitle>
            <DialogDescription>Elle est créée en brouillon : rien n&apos;est public avant sa publication.</DialogDescription>
          </DialogHeader>

          <AirportCombobox id="new-route-from" label="Départ" value={origin} onChange={setOrigin} placeholder="Ville ou code" />
          <AirportCombobox id="new-route-to" label="Arrivée" value={destination} onChange={setDestination} placeholder="Ville ou code" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-route-tier">Priorité</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger id="new-route-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">P1 : en premier</SelectItem>
                  <SelectItem value="2">P2</SelectItem>
                  <SelectItem value="3">P3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <Checkbox checked={withReturn} onCheckedChange={(v) => setWithReturn(v === true)} />
              Créer aussi le retour
            </label>
          </div>

          {preview && !outbound && (
            <p className="text-xs text-muted-foreground">
              Identifiant : <span className="font-mono">{preview}</span>
              {withReturn && !inbound && " (et le retour)"}
            </p>
          )}
          {found.length > 0 && (
            <Alert variant="info" role="status">
              <Info className="size-4" aria-hidden="true" />
              <AlertDescription className="space-y-2">
                <p>
                  {nothingToCreate
                    ? found.length === 2
                      ? "Ces deux routes existent déjà."
                      : "Cette route existe déjà."
                    : outbound
                      ? "Cette route existe déjà ; seul le retour sera créé."
                      : "Le retour existe déjà ; seul l'aller sera créé."}
                </p>
                <ul className="space-y-1">
                  {found.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`/dashboard/routes/${r.slug}`}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1 font-medium text-link underline"
                      >
                        Ouvrir {r.label}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <div role="alert" className="space-y-1 text-sm text-danger">
              <p>{error}</p>
              {conflicts.map((slug) => (
                <Link key={slug} href={`/dashboard/routes/${slug}`} onClick={() => setOpen(false)} className="block text-link underline">
                  Ouvrir {slug}
                </Link>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || nothingToCreate}>
              {saving ? "Création…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
