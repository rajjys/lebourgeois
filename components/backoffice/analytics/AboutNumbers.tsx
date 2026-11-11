'use client';

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** How the figures are counted, one click away instead of a banner on every visit. */
export function AboutNumbers({ since }: { since: string | null }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <Info className="size-3.5" aria-hidden="true" />
          Comment c&apos;est compté
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 space-y-2 p-4 text-sm text-foreground">
        <p className="font-semibold">Nos propres statistiques</p>
        <ul className="list-disc space-y-1.5 pl-4 text-muted-foreground">
          <li>{since ? `Mesurées depuis le ${since}. Avant, seules les demandes existent.` : "Rien de mesuré pour l'instant."}</li>
          <li>Pas comptés : l&apos;équipe connectée, les robots, les navigateurs qui bloquent les statistiques ou demandent à ne pas être suivis.</li>
          <li>
            <span className="text-foreground">Direct / inconnu</span> : le navigateur n&apos;a pas dit d&apos;où venait le visiteur (adresse tapée, favori, WhatsApp qui cache le lien).
            Jamais compté comme Google.
          </li>
          <li><span className="text-foreground">Rebond</span> : une seule page vue et rien fait d&apos;autre (ni recherche, ni demande, ni WhatsApp).</li>
          <li><span className="text-foreground">Demandes</span> : toutes celles reçues, mesurées ou non ; créditées à la dernière source connue du visiteur.</li>
          <li>Jours de Kinshasa. Comparaison avec la même durée juste avant.</li>
        </ul>
        <p className="text-xs text-muted-foreground">Détails : docs/ANALYTICS.md.</p>
      </PopoverContent>
    </Popover>
  );
}
