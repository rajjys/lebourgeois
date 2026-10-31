'use client';

import { useEffect, useState } from "react";
import { formatDateShort } from "@/lib/format";
import type { Plan, SkipReason } from "@/lib/schedule";
import { cn } from "@/lib/utils/cn-utils";

const day = (d: string) => formatDateShort(new Date(`${d}T00:00:00Z`));

/** "lun. 2 nov. (2), mer. 4 nov. et 5 autres jours": one entry per day, with a count when several flights share it. */
export function dayList(dates: string[], max = 6) {
  const counts = new Map<string, number>();
  for (const d of dates) counts.set(d, (counts.get(d) ?? 0) + 1);
  const days = [...counts].map(([d, n]) => (n > 1 ? `${day(d)} (${n})` : day(d)));
  const shown = days.slice(0, max).join(", ");
  const rest = days.length - max;
  return rest > 0 ? `${shown} et ${rest} autre${rest > 1 ? "s" : ""} jour${rest > 1 ? "s" : ""}` : shown;
}

const SKIP: Record<SkipReason, string> = {
  cancelled: "vol annulé, laissé tel quel",
  "time-taken": "un autre vol part déjà à cette heure",
  "day-taken": "jour déjà rempli",
};

/** What an action will do, before it is saved. */
export function PlanPreview({ plan, className }: { plan: Plan; className?: string }) {
  const skippedBy = (reason: SkipReason) => plan.skipped.filter((s) => s.reason === reason).map((s) => s.date);
  const lines = [
    plan.add.length > 0 && { tone: "text-success", text: `${plan.add.length} à ajouter : ${dayList(plan.add.map((f) => f.date))}` },
    plan.update.length > 0 && {
      tone: "text-warning",
      text: `${plan.update.length} à modifier : ${dayList(plan.update.map((u) => u.date))}`,
    },
    plan.unchanged.length > 0 && { tone: "text-muted-foreground", text: `${plan.unchanged.length} déjà à jour` },
    ...(["cancelled", "time-taken", "day-taken"] as SkipReason[])
      .filter((r) => skippedBy(r).length > 0)
      .map((r) => ({ tone: "text-muted-foreground", text: `Ignorés (${SKIP[r]}) : ${dayList(skippedBy(r))}` })),
  ].filter(Boolean) as { tone: string; text: string }[];

  return (
    <div className={cn("rounded-md border bg-muted/50 p-3 text-sm", className)} aria-live="polite">
      <p className="mb-1 font-medium">Aperçu</p>
      {lines.length === 0 ? (
        <p className="text-muted-foreground">Aucune date ne correspond.</p>
      ) : (
        <ul className="space-y-1">
          {lines.map((l) => (
            <li key={l.text} className={l.tone}>
              {l.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Asks the API for a preview whenever the form changes (after a short pause), so the operator
 * sees the effect before saving. An answer counts only for the input it was asked for; while a
 * newer one is pending, the last answer stays on screen, dimmed.
 */
export function usePreview<T>(url: string, payload: object | null) {
  const key = payload ? JSON.stringify(payload) : null;
  const [answer, setAnswer] = useState<{ key: string; result: T | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!key) return;
    let current = true;
    const timer = setTimeout(async () => {
      let result: T | null = null;
      let error: string | null = null;
      try {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...JSON.parse(key), mode: "preview" }) });
        const body = await res.json().catch(() => null);
        if (res.ok) result = body as T;
        else error = body?.error ?? `Erreur ${res.status}`;
      } catch {
        error = "Aperçu impossible. Vérifiez la connexion.";
      }
      if (current) setAnswer({ key, result, error });
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [url, key]);

  const fresh = !!key && answer?.key === key;
  return {
    result: key ? (answer?.result ?? null) : null,
    error: fresh ? answer!.error : null,
    loading: !!key && !fresh,
  };
}
