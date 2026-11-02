'use client';

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn-utils";

/**
 * A small count picked with − and + (travellers). One tap per step, no list to open
 * (docs/DESIGN-SYSTEM.md#forms). The value is announced when it changes.
 */
export function Stepper({
  id,
  value,
  onChange,
  min = 1,
  max = 9,
  labels,
  className,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Accessible names of the buttons, e.g. "Retirer un voyageur". */
  labels: { decrease: string; increase: string };
  className?: string;
}) {
  const button =
    "inline-flex size-10 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:border-primary hover:text-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40";
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <button type="button" className={button} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={labels.decrease} aria-controls={id}>
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <output id={id} aria-live="polite" className="min-w-6 text-center text-lg font-semibold">
        {value}
      </output>
      <button type="button" className={button} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={labels.increase} aria-controls={id}>
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
