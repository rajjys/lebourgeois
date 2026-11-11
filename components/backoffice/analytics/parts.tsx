import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, AtSign, CornerDownRight, Globe, Link2, Megaphone, Monitor, MousePointerClick,
  MessageCircle, Repeat, Search, Smartphone, Sparkles, Tablet, Tag, Users,
} from "lucide-react";
import { CHANNEL_LABEL, CHANNELS, type Channel } from "@/lib/analytics/channel";
import { cn } from "@/lib/utils/cn-utils";

// Building blocks of the Statistiques page (AN-5). Server components; one brand tint for every bar
// (each list is one series), text in text colours, figures in tabular numerals.

export const num = new Intl.NumberFormat("fr-FR");
export const pct = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });
const regions = new Intl.DisplayNames(["fr"], { type: "region" });

export const rate = (a: number, b: number) => (b ? pct.format(a / b) : "—");

/** 92 → "1 min 32 s", 40 → "40 s". */
export function duration(seconds: number | null) {
  if (seconds === null) return "—";
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return `${m} min${s % 60 ? ` ${String(s % 60).padStart(2, "0")} s` : ""}`;
}

export const DEVICE_LABEL: Record<string, string> = { mobile: "Téléphone", tablet: "Tablette", desktop: "Ordinateur" };
export const DEVICE_ICON: Record<string, ReactNode> = {
  mobile: <Smartphone className="size-4" aria-hidden="true" />,
  tablet: <Tablet className="size-4" aria-hidden="true" />,
  desktop: <Monitor className="size-4" aria-hidden="true" />,
};

export const channelName = (c: string | null) =>
  c === null ? "Non mesurée" : (CHANNELS as readonly string[]).includes(c) ? CHANNEL_LABEL[c as Channel] : c;

const CHANNEL_ICON: Record<Channel, ReactNode> = {
  search: <Search className="size-4" aria-hidden="true" />,
  ai: <Sparkles className="size-4" aria-hidden="true" />,
  social: <Users className="size-4" aria-hidden="true" />,
  whatsapp: <MessageCircle className="size-4" aria-hidden="true" />,
  email: <AtSign className="size-4" aria-hidden="true" />,
  paid: <Megaphone className="size-4" aria-hidden="true" />,
  campaign: <Tag className="size-4" aria-hidden="true" />,
  referral: <Link2 className="size-4" aria-hidden="true" />,
  internal: <Repeat className="size-4" aria-hidden="true" />,
  direct: <CornerDownRight className="size-4" aria-hidden="true" />,
};
export const channelIcon = (c: string | null) =>
  c && c in CHANNEL_ICON ? CHANNEL_ICON[c as Channel] : <MousePointerClick className="size-4" aria-hidden="true" />;

// Shorter than Intl's "Congo-Kinshasa" / "Congo-Brazzaville", and how people say it here.
const COUNTRY_NAME: Record<string, string> = { CD: "RD Congo", CG: "Congo-Brazzaville" };

export function countryName(code: string | null) {
  if (!code) return "Inconnu";
  if (COUNTRY_NAME[code]) return COUNTRY_NAME[code];
  try {
    return regions.of(code) ?? code;
  } catch {
    return code;
  }
}
export const CountryCode = ({ code }: { code: string | null }) => (
  <span className="inline-flex h-4 w-6 items-center justify-center rounded-sm bg-muted text-[10px] font-semibold text-muted-foreground">
    {code ?? <Globe className="size-3" aria-hidden="true" />}
  </span>
);

/**
 * Change against the previous period: the arrow and the sign carry the meaning; green or red only
 * says whether it is good news (`inverse` for figures where down is good, like the bounce rate).
 * Nothing when there is no earlier figure to compare with.
 */
export function Delta({ now, before, inverse = false, className }: { now: number | null; before: number | null; inverse?: boolean; className?: string }) {
  if (now === null || before === null || before === 0) return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  const change = (now - before) / Math.abs(before);
  const flat = Math.abs(change) < 0.005;
  const good = inverse ? change < 0 : change > 0;
  const Icon = flat ? ArrowRight : change > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        flat ? "text-muted-foreground" : good ? "text-success" : "text-danger",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {change > 0 ? "+" : ""}
      {pct.format(change)}
    </span>
  );
}

/** A bordered panel: title, optional caption and action on the right, then its content. */
export function Panel({ title, caption, action, children, className, flush = false }: { title: string; caption?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cn("flex flex-col rounded-xl border bg-card shadow-card", className)}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {caption && <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>}
        </div>
        {action}
      </header>
      <div className={cn("flex-1", flush ? "mt-3" : "px-5 pb-4 pt-3")}>{children}</div>
    </section>
  );
}

export const SeeAll = ({ href, label = "Tout voir" }: { href: string; label?: string }) => (
  <Link href={href} scroll={false} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-link hover:underline">
    {label}
    <ArrowRight className="size-3.5" aria-hidden="true" />
  </Link>
);

export const Empty = ({ children = "Rien sur cette période." }: { children?: ReactNode }) => (
  <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
);

export type BarRow = { key: string; label: ReactNode; icon?: ReactNode; value: number; detail?: ReactNode; href?: string; title?: string };

/**
 * A ranked list: each row's tint is its share of the largest value, the figure on the right.
 * A row with `href` filters the page on it (drill-down).
 */
export function BarList({ rows, valueLabel, detailLabel, limit, empty }: { rows: BarRow[]; valueLabel: string; detailLabel?: string; limit?: number; empty?: ReactNode }) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  const shown = limit ? rows.slice(0, limit) : rows;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-[11px] font-medium text-muted-foreground">
        <span />
        <span className="flex gap-4">
          {detailLabel && <span className="w-14 text-right">{detailLabel}</span>}
          <span className="w-14 text-right">{valueLabel}</span>
        </span>
      </div>
      <ul className="space-y-1">
        {shown.map((r) => {
          const inner = (
            <>
              <span className="absolute inset-y-0 left-0 rounded-md bg-brand-100/70 transition-colors group-hover:bg-brand-100" style={{ width: `${(r.value / max) * 100}%` }} aria-hidden="true" />
              <span className="relative flex min-w-0 items-center gap-2">
                {r.icon && <span className="shrink-0 text-muted-foreground">{r.icon}</span>}
                <span className="truncate">{r.label}</span>
              </span>
              <span className="relative flex shrink-0 gap-4 tabular-nums">
                {detailLabel !== undefined && <span className="w-14 text-right text-muted-foreground">{r.detail ?? ""}</span>}
                <span className="w-14 text-right font-medium text-foreground">{num.format(r.value)}</span>
              </span>
            </>
          );
          const cls = "group relative flex h-8 items-center justify-between gap-3 rounded-md px-2 text-sm";
          return (
            <li key={r.key} title={r.title}>
              {r.href ? (
                <Link href={r.href} scroll={false} className={cn(cls, "hover:text-foreground")}>{inner}</Link>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export type Column<T> = { label: string; cell: (row: T) => ReactNode; align?: "right"; className?: string };

/** A dense table (rows about 40 px), numbers right-aligned; the first column is the row's name. */
export function DataTable<T>({ rows, columns, rowKey, rowHref, empty }: { rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; rowHref?: (row: T) => string | undefined; empty?: ReactNode }) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y bg-muted/60 text-left text-[11px] font-medium text-muted-foreground">
            {columns.map((c, i) => (
              <th key={c.label} scope="col" className={cn("h-8 px-3 font-medium whitespace-nowrap", i === 0 && "pl-5", i === columns.length - 1 && "pr-5", c.align === "right" && "text-right")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = rowHref?.(row);
            return (
              <tr key={rowKey(row)} className="border-b last:border-0 hover:bg-muted/50">
                {columns.map((c, i) => (
                  <td key={c.label} className={cn("h-10 px-3", i === 0 && "pl-5", i === columns.length - 1 && "pr-5", c.align === "right" && "text-right tabular-nums", c.className)}>
                    {i === 0 && href ? (
                      <Link href={href} scroll={false} className="font-medium text-foreground hover:text-link hover:underline">{c.cell(row)}</Link>
                    ) : (
                      c.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** A row of headline figures inside one card, separated by hairlines. */
export function StatStrip({ items }: { items: { label: string; value: string; delta?: ReactNode; hint?: string }[] }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y rounded-xl border bg-card shadow-card sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-none lg:grid-flow-col">
      {items.map((s) => (
        <div key={s.label} className="flex flex-col gap-1 px-5 py-4" title={s.hint}>
          <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
          <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{s.value}</span>
          <span className="min-h-4">{s.delta}</span>
        </div>
      ))}
    </div>
  );
}

/** Visitors reaching each step; the share is of all visitors, and the drop from the step before is shown. */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = steps[0]?.value ?? 0;
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const before = i > 0 ? steps[i - 1].value : null;
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground">{s.label}</span>
              <span className="flex items-baseline gap-3 tabular-nums">
                {before !== null && before > 0 && s.value < before && (
                  <span className="text-xs text-muted-foreground">−{pct.format(1 - s.value / before)}</span>
                )}
                <span className="font-medium text-foreground">{num.format(s.value)}</span>
                <span className="w-12 text-right text-xs text-muted-foreground">{rate(s.value, top)}</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-primary" style={{ width: `${top ? (s.value / top) * 100 : 0}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Two parts of a whole on one thin bar (new vs returning visitors), with their figures. */
export function Split({ a, b }: { a: { label: string; value: number }; b: { label: string; value: number } }) {
  const total = a.value + b.value;
  return (
    <div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {total > 0 && <div className="bg-primary" style={{ width: `${(a.value / total) * 100}%` }} />}
        {total > 0 && <div className="bg-brand-200" style={{ width: `${(b.value / total) * 100}%` }} />}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        {[a, b].map((x, i) => (
          <div key={x.label} className="flex items-start gap-2">
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", i === 0 ? "bg-primary" : "bg-brand-200")} aria-hidden="true" />
            <div>
              <dt className="text-muted-foreground">{x.label}</dt>
              <dd className="font-semibold text-foreground tabular-nums">
                {num.format(x.value)} <span className="font-normal text-muted-foreground">· {rate(x.value, total)}</span>
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
