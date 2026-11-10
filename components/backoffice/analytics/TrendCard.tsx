'use client';

import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { SeriesPoint, Totals } from "@/lib/analytics/report";
import { cn } from "@/lib/utils/cn-utils";

const num = new Intl.NumberFormat("fr-FR");
const pct = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });
const dayLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const longDay = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function seconds(s: number | null) {
  if (s === null) return "—";
  const r = Math.round(s);
  return r < 60 ? `${r} s` : `${Math.floor(r / 60)} min ${String(r % 60).padStart(2, "0")} s`;
}

type MetricKey = "visitors" | "sessions" | "pageViews" | "bounceRate" | "avgSeconds" | "requests";
const METRICS: { key: MetricKey; label: string; format: (v: number | null) => string; inverse?: boolean; total: (t: Totals) => number | null }[] = [
  { key: "visitors", label: "Visiteurs", format: (v) => (v === null ? "—" : num.format(v)), total: (t) => t.visitors },
  { key: "sessions", label: "Visites", format: (v) => (v === null ? "—" : num.format(v)), total: (t) => t.sessions },
  { key: "pageViews", label: "Pages vues", format: (v) => (v === null ? "—" : num.format(v)), total: (t) => t.pageViews },
  { key: "bounceRate", label: "Taux de rebond", format: (v) => (v === null ? "—" : pct.format(v)), inverse: true, total: (t) => t.bounceRate },
  { key: "avgSeconds", label: "Durée moyenne", format: seconds, total: (t) => t.avgSeconds },
  { key: "requests", label: "Demandes", format: (v) => (v === null ? "—" : num.format(v)), total: (t) => t.requests },
];

function Delta({ now, before, inverse }: { now: number | null; before: number | null; inverse?: boolean }) {
  if (now === null || before === null || before === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const change = (now - before) / Math.abs(before);
  const flat = Math.abs(change) < 0.005;
  const good = inverse ? change < 0 : change > 0;
  const Icon = flat ? ArrowRight : change > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", flat ? "text-muted-foreground" : good ? "text-success" : "text-danger")}>
      <Icon className="size-3.5" aria-hidden="true" />
      {change > 0 ? "+" : ""}
      {pct.format(change)}
    </span>
  );
}

type Row = { key: string; label: string; long: string; now: number | null; before: number | null };

function ChartTooltip({ active, payload, metric, labels }: TooltipProps<number, string> & { metric: (typeof METRICS)[number]; labels: { now: string; before: string } }) {
  const row = payload?.[0]?.payload as Row | undefined;
  if (!active || !row) return null;
  return (
    <div className="min-w-44 rounded-lg border bg-popover px-3 py-2 text-xs shadow-popover">
      <p className="mb-1.5 font-medium text-foreground first-letter:uppercase">{row.long}</p>
      <p className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          {labels.now}
        </span>
        <span className="font-semibold text-foreground tabular-nums">{metric.format(row.now)}</span>
      </p>
      <p className="mt-1 flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full bg-neutral-400" aria-hidden="true" />
          {labels.before}
        </span>
        <span className="text-foreground tabular-nums">{metric.format(row.before)}</span>
      </p>
    </div>
  );
}

/**
 * The headline figures, each a tab for the chart below it: the chosen figure over the period in the
 * brand colour, the previous period in grey on the same axis (one scale, two lines).
 */
export function TrendCard({ series, current, previous, hourly, labels }: { series: SeriesPoint[]; current: Totals; previous: Totals; hourly: boolean; labels: { now: string; before: string } }) {
  const [active, setActive] = useState<MetricKey>("visitors");
  const metric = METRICS.find((m) => m.key === active)!;
  const rows: Row[] = series.map((p) => {
    const d = new Date(`${p.key}T00:00:00Z`);
    return {
      key: p.key,
      label: hourly ? `${p.key} h` : dayLabel.format(d),
      long: hourly ? `${p.key} h – ${String(Number(p.key) + 1).padStart(2, "0")} h` : longDay.format(d),
      now: p.current ? p.current[active] : null,
      before: p.previous ? p.previous[active] : null,
    };
  });
  const ratio = active === "bounceRate";

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-card">
      <div role="tablist" aria-label="Indicateur du graphique" className="grid grid-cols-2 border-b sm:grid-cols-3 xl:grid-cols-6">
        {METRICS.map((m, i) => {
          const selected = m.key === active;
          return (
            <button
              key={m.key}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setActive(m.key)}
              className={cn(
                "relative flex flex-col items-start gap-1 border-border px-5 py-4 text-left transition-colors hover:bg-muted/50",
                i > 0 && "xl:border-l",
                selected && "bg-muted/40",
              )}
            >
              {selected && <span className="absolute inset-x-0 top-0 h-0.5 bg-primary" aria-hidden="true" />}
              <span className={cn("text-xs font-medium", selected ? "text-foreground" : "text-muted-foreground")}>{m.label}</span>
              <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{m.format(m.total(current))}</span>
              <span className="flex flex-wrap items-center gap-x-1.5">
                <Delta now={m.total(current)} before={m.total(previous)} inverse={m.inverse} />
                <span className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">vs {m.format(m.total(previous))}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-3 pb-3 pt-4 sm:px-5">
        <div className="mb-2 flex items-center justify-end gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-primary" aria-hidden="true" />
            {labels.now}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-neutral-400" aria-hidden="true" />
            {labels.before}
          </span>
        </div>
        <div className="h-64" role="img" aria-label={`${metric.label}, ${labels.now}, comparé à ${labels.before}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                interval="preserveStartEnd"
                minTickGap={24}
                tickMargin={8}
              />
              <YAxis
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={44}
                allowDecimals={!ratio && active !== "avgSeconds" ? false : true}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickFormatter={(v: number) => (ratio ? pct.format(v) : active === "avgSeconds" ? `${Math.round(v / 60)} min` : num.format(v))}
              />
              <Tooltip
                cursor={{ stroke: "var(--color-neutral-300)", strokeWidth: 1 }}
                content={<ChartTooltip metric={metric} labels={labels} />}
              />
              <Line type="monotone" dataKey="before" stroke="var(--color-neutral-400)" strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 0, fill: "var(--color-neutral-400)" }} isAnimationActive={false} />
              <Area
                type="monotone"
                dataKey="now"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#trend-fill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-card)", fill: "var(--color-primary)" }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
