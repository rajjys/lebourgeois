'use client';

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHANNEL_LABEL, CHANNELS, type Channel, type Touch } from "@/lib/analytics/channel";
import { REQUEST_STATUS_CHOICES, REQUEST_STATUS_LABEL, type RequestStatus } from "@/lib/constants";
import type { Request } from "@/lib/generated/prisma/client";

const DEVICE_LABEL: Record<string, string> = { mobile: "Téléphone", tablet: "Tablette", desktop: "Ordinateur" };

const channelLabel = (c: string | null) => (c && (CHANNELS as readonly string[]).includes(c) ? CHANNEL_LABEL[c as Channel] : "Non mesurée");

/** "Moteurs de recherche (www.google.com)", "Lien tagué (UTM) (facebook / pub-kalemie)". */
function describe(touch: Touch | null | undefined) {
  if (!touch) return null;
  const detail = touch.utmSource || touch.utmCampaign ? [touch.utmSource, touch.utmCampaign].filter(Boolean).join(" / ") : touch.referrerHost;
  return `${channelLabel(touch.channel)}${detail ? ` (${detail})` : ""}`;
}

type Attribution = { firstTouch?: Touch; lastTouch?: Touch | null; landingPath?: string; conversionPath?: string };

/**
 * Where the request stands (AN-3) and where its traveller came from (AN-1). "Réservée" is what the
 * statistics count as a booking, so it is set once the agency confirms the ticket.
 */
export function RequestFollowUp({ request, onSaved }: { request: Request; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const a = (request.attribution ?? null) as Attribution | null;

  async function save(status: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(`Statut : ${REQUEST_STATUS_LABEL[status as RequestStatus]}`);
      onSaved();
    } catch {
      toast.error("Le statut n'a pas été enregistré. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  const rows: [string, string | null | undefined][] = a
    ? [
        ["Première visite", describe(a.firstTouch)],
        ["Dernière source connue", describe(a.lastTouch) ?? "Aucune autre que la première"],
        ["Arrivé sur", a.landingPath],
        ["Demande envoyée depuis", a.conversionPath],
        ["Appareil", request.device ? DEVICE_LABEL[request.device] ?? request.device : null],
      ]
    : [["Provenance", "Non mesurée : demande antérieure au suivi (10 nov. 2026), ou navigateur qui ne garde rien"]];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suivi</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="request-status">Où en est la demande</Label>
          <Select value={request.status === "CLAIMED" ? undefined : request.status} onValueChange={save} disabled={saving}>
            <SelectTrigger id="request-status" className="w-full sm:w-64">
              <SelectValue placeholder={REQUEST_STATUS_LABEL[request.status as RequestStatus]} />
            </SelectTrigger>
            <SelectContent>
              {REQUEST_STATUS_CHOICES.map((s) => (
                <SelectItem key={s} value={s}>
                  {REQUEST_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">« Réservée » une fois le billet émis : c&apos;est ce que les statistiques comptent comme réservation.</p>
        </div>
        <dl className="space-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">{label} :</dt>
              <dd className="font-medium">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
