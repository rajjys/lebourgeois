'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AirportCombobox, airportCode } from "@/components/AirportCombobox";
import { useAirports } from "@/hooks/useAirports";
import { routeSlug } from "@/lib/routes";

type Created = { created: string[]; existing: string[] };

/** Pick two airports, a priority, and whether to create the return route too. The slug is generated. */
export function NewRouteDialog() {
  const router = useRouter();
  const { airports } = useAirports();
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [tier, setTier] = useState("3");
  const [withReturn, setWithReturn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const originCode = airportCode(origin);
  const destinationCode = airportCode(destination);
  const slugOf = (code: string | null) => airports?.find((a) => a.code === code)?.slug;
  const originSlug = slugOf(originCode);
  const destinationSlug = slugOf(destinationCode);
  const preview = originSlug && destinationSlug && originSlug !== destinationSlug ? routeSlug(originSlug, destinationSlug) : null;

  function reset() {
    setOrigin("");
    setDestination("");
    setTier("3");
    setWithReturn(true);
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
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

          {preview && (
            <p className="text-xs text-muted-foreground">
              Identifiant : <span className="font-mono">{preview}</span>
              {withReturn && " (et le retour)"}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
