import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Info } from "lucide-react";
import { CHANNEL_LABEL, CHANNELS, type Channel } from "@/lib/analytics/channel";
import { PERIODS, type PeriodKey } from "@/lib/analytics/period";
import type { AnalyticsReport, Filters, Totals } from "@/lib/analytics/report";
import { REQUEST_STATUS_LABEL, type RequestStatus } from "@/lib/constants";
import { formatDayMonth } from "@/lib/format";
import { cn } from "@/lib/utils/cn-utils";

// Statistics page (AN-2). Server-rendered; the filters are a plain form, so it works without scripts.
// One colour (the brand's) for every bar: each chart has one series. Text stays in text colours.

const num = new Intl.NumberFormat("fr-FR");
const pct = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });
const regions = new Intl.DisplayNames(["fr"], { type: "region" });
const day = (d: string) => new Date(`${d}T00:00:00Z`);

const DEVICE_LABEL: Record<string, string> = { mobile: "Téléphone", tablet: "Tablette", desktop: "Ordinateur" };
const channelName = (c: string | null) => (c === null ? "Non mesurée" : (CHANNELS as readonly string[]).includes(c) ? CHANNEL_LABEL[c as Channel] : c);
const countryName = (c: string | null) => {
  if (!c) return "Inconnu";
  try {
    return regions.of(c) ?? c;
  } catch {
    return c;
  }
};

function Delta({ now, before, days }: { now: number; before: number; days: number }) {
  const span = days === 1 ? "la veille" : `les ${days} jours d'avant`;
  if (before === 0) return <span className="text-xs text-muted-foreground">{now === 0 ? "—" : `rien ${span}`}</span>;
  const change = (now - before) / before;
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : ArrowRight;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="tabular-nums">
        {change > 0 ? "+" : ""}
        {pct.format(change)}
      </span>
      <span>vs {span} ({num.format(before)})</span>
    </span>
  );
}

function Tile({ label, value, children, hint }: { label: string; value: string; children?: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4 shadow-card">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="mt-1 text-3xl font-semibold text-foreground">{value}</span>
      <span className="mt-auto pt-2">{children}</span>
      {hint && <span className="mt-1 text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Section({ title, note, children, className }: { title: string; note?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card p-5", className)}>
      <h2 className="text-base font-semibold">{title}</h2>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** One series per chart, one bar per day; the exact number is in each bar's tooltip and in the table. */
function DailyBars({ title, days, value, units }: { title: string; days: AnalyticsReport["days"]; value: (d: AnalyticsReport["days"][number]) => number; units: [string, string] }) {
  const unitFor = (count: number) => (count > 1 ? units[1] : units[0]);
  const W = 600;
  const H = 120;
  const max = Math.max(1, ...days.map(value));
  const slot = W / days.length;
  // Thin bars: at most 24 units wide, with at least a 2-unit gap, centred in their day.
  const bar = Math.max(1, Math.min(24, slot - 2));
  const total = days.reduce((s, d) => s + value(d), 0);
  return (
    <figure>
      <figcaption className="mb-2 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{title}</span>
        <span className="tabular-nums text-muted-foreground">
          {num.format(total)} {unitFor(total)} · max {num.format(Math.max(...days.map(value), 0))} par jour
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="h-auto w-full" role="img" aria-label={`${title} : ${num.format(total)} ${unitFor(total)} sur ${days.length} jours`}>
        <line x1={0} x2={W} y1={H} y2={H} className="stroke-border" strokeWidth={1} />
        {days.map((d, i) => {
          const v = value(d);
          const h = v === 0 ? 0 : Math.max(2, (v / max) * (H - 4));
          return (
            <g key={d.day}>
              <title>{`${formatDayMonth(day(d.day))} : ${num.format(v)} ${unitFor(v)}`}</title>
              {/* Hit target: the whole column, wider than the bar. */}
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              {h > 0 && <rect x={i * slot + (slot - bar) / 2} y={H - h} width={bar} height={h} rx={Math.min(2, bar / 2)} className="fill-primary" />}
            </g>
          );
        })}
        <text x={0} y={H + 14} className="fill-muted-foreground text-[11px]">{formatDayMonth(day(days[0].day))}</text>
        {days.length > 1 && (
          <text x={W} y={H + 14} textAnchor="end" className="fill-muted-foreground text-[11px]">{formatDayMonth(day(days[days.length - 1].day))}</text>
        )}
      </svg>
    </figure>
  );
}

type Column<T> = { label: string; value: (row: T) => ReactNode; numeric?: boolean };

/** A ranked table; the first numeric column also gets a thin bar, so the order reads at a glance. */
function RankTable<T>({ rows, name, columns, bar, empty = "Rien sur cette période." }: { rows: T[]; name: Column<T>; columns: Column<T>[]; bar?: (row: T) => number; empty?: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const max = bar ? Math.max(1, ...rows.map(bar)) : 1;
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className={cn("w-full text-sm", columns.length > 2 && "min-w-[28rem]")}>
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-2 py-1.5 font-medium">{name.label}</th>
            {columns.map((c) => (
              <th key={c.label} className={cn("px-2 py-1.5 font-medium", c.numeric && "text-right")}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="px-2 py-1.5">
                <div>{name.value(row)}</div>
                {bar && (
                  <div className="mt-1 h-1 rounded-full bg-muted" aria-hidden="true">
                    <div className="h-1 rounded-full bg-primary" style={{ width: `${(bar(row) / max) * 100}%` }} />
                  </div>
                )}
              </td>
              {columns.map((c) => (
                <td key={c.label} className={cn("px-2 py-1.5", c.numeric && "text-right tabular-nums")}>{c.value(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const share = (a: number, b: number) => (b ? pct.format(a / b) : "—");

function FilterBar({ report, filters, options }: { report: AnalyticsReport; filters: Filters; options: { campaigns: string[]; routes: { slug: string; label: string }[] } }) {
  const p = report.period;
  const field = "h-9 rounded-md border bg-background px-2 text-sm";
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Période
        <select name="periode" defaultValue={p.key} className={field}>
          {(Object.keys(PERIODS) as PeriodKey[]).map((k) => (
            <option key={k} value={k}>{PERIODS[k]}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Du
        <input type="date" name="du" defaultValue={p.key === "dates" ? p.from : ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Au
        <input type="date" name="au" defaultValue={p.key === "dates" ? p.to : ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Source
        <select name="source" defaultValue={filters.channel ?? ""} className={field}>
          <option value="">Toutes</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Campagne
        <select name="campagne" defaultValue={filters.campaign ?? ""} className={field}>
          <option value="">Toutes</option>
          {options.campaigns.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Trajet
        <select name="trajet" defaultValue={filters.route ?? ""} className={cn(field, "max-w-56")}>
          <option value="">Tous</option>
          {options.routes.map((r) => (
            <option key={r.slug} value={r.slug}>{r.label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Appareil
        <select name="appareil" defaultValue={filters.device ?? ""} className={field}>
          <option value="">Tous</option>
          {Object.entries(DEVICE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
        Appliquer
      </button>
      <Link href="/dashboard/analytics" className="h-9 px-2 text-sm leading-9 text-link hover:underline">
        Réinitialiser
      </Link>
    </form>
  );
}

export function AnalyticsView({ report, filters, options }: { report: AnalyticsReport; filters: Filters; options: { campaigns: string[]; routes: { slug: string; label: string }[] } }) {
  const { current: c, previous: b, period } = report;
  const tiles: { label: string; key: keyof Totals; hint?: string }[] = [
    { label: "Visiteurs", key: "visitors", hint: "Navigateurs différents" },
    { label: "Visites", key: "sessions", hint: "Une visite s'arrête après 30 min sans activité" },
    { label: "Pages vues", key: "pageViews" },
    { label: "Demandes", key: "requests", hint: c.requestsUnmeasured ? `Dont ${num.format(c.requestsUnmeasured)} sans source mesurée` : undefined },
    { label: "Réservées", key: "booked", hint: "Statut « Réservée » dans Demandes" },
    { label: "Clics WhatsApp", key: "whatsapp", hint: `Par ${num.format(c.whatsappVisitors)} visiteur${c.whatsappVisitors > 1 ? "s" : ""}` },
  ];
  const f = report.funnel;
  const steps = [
    { label: "Visiteurs", value: f.visitors },
    { label: "Ont vu un trajet", value: f.routeViews },
    { label: "Ont fait une recherche", value: f.searches },
    { label: "Ont commencé une demande", value: f.started },
    { label: "Ont envoyé une demande", value: f.submitted },
  ];
  const lastBy = report.requestsByLastChannel;
  const firstBy = report.requestsByFirstChannel;
  const channelRows = [
    ...report.channels.map((r) => ({ key: r.key as string | null, sessions: r.sessions, visitors: r.visitors })),
    ...[...new Set([...lastBy.keys(), ...firstBy.keys()])]
      .filter((k) => !report.channels.some((r) => r.key === k))
      .map((k) => ({ key: k, sessions: 0, visitors: 0 })),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistiques</h1>
          <p className="text-sm text-muted-foreground">
            {PERIODS[period.key]} : du {formatDayMonth(day(period.from))} au {formatDayMonth(day(period.to))}, comparé {period.days === 1 ? "à la veille" : `aux ${period.days} jours d'avant`}. Jours de Kinshasa.
          </p>
        </div>
      </header>

      <FilterBar report={report} filters={filters} options={options} />

      <p className="flex items-start gap-2 rounded-xl border border-info-border bg-info-subtle px-4 py-3 text-sm text-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
        <span>
          {report.trackingSince
            ? `Mesuré depuis le ${formatDayMonth(report.trackingSince)} : avant, il n'y a que les demandes.`
            : "Aucune visite mesurée pour l'instant : les chiffres apparaissent dès les premières visites après la mise en ligne."}{" "}
          Ne sont pas comptés : l&apos;équipe connectée, les robots, les navigateurs qui bloquent les statistiques ou demandent à ne pas être suivis.
          « Direct / inconnu » veut dire que le navigateur n&apos;a pas dit d&apos;où venait le visiteur (adresse tapée, favori, ou application comme WhatsApp qui le cache) : ce n&apos;est jamais compté comme Google.
        </span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {tiles.map((t) => (
          <Tile key={t.key} label={t.label} value={num.format(c[t.key] as number)} hint={t.hint}>
            <Delta now={c[t.key] as number} before={b[t.key] as number} days={period.days} />
          </Tile>
        ))}
      </div>
      <p className="-mt-3 text-sm text-muted-foreground">
        Taux de demande : <span className="font-medium text-foreground">{c.conversion === null ? "—" : pct.format(c.conversion)}</span> des visiteurs
        {b.conversion !== null && <> (avant : {pct.format(b.conversion)})</>}. Taux de réservation : <span className="font-medium text-foreground">{share(c.booked, c.requests)}</span> des demandes.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Par jour">
          {report.days.length > 1 ? (
            <div className="space-y-6">
              <DailyBars title="Visiteurs" days={report.days} value={(d) => d.visitors} units={["visiteur", "visiteurs"]} />
              <DailyBars title="Demandes" days={report.days} value={(d) => d.requests} units={["demande", "demandes"]} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Un seul jour : les chiffres sont en haut. Choisissez 7 jours ou plus pour voir l&apos;évolution.</p>
          )}
        </Section>
        <Section title="Parcours" note="Visiteurs qui ont atteint chaque étape, pas forcément dans cet ordre : beaucoup arrivent de Google directement sur un trajet, sans passer par la recherche.">
          <ol className="space-y-3">
            {steps.map((s) => (
              <li key={s.label}>
                <div className="flex justify-between text-sm">
                  <span>{s.label}</span>
                  <span className="tabular-nums">
                    {num.format(s.value)} <span className="text-muted-foreground">· {share(s.value, f.visitors)}</span>
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted" aria-hidden="true">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${f.visitors ? (s.value / f.visitors) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            « Envoyé » ne compte que les visiteurs mesurés ; le total des demandes ({num.format(c.requests)}) est en haut.
          </p>
        </Section>
      </div>

      <Section title="D'où viennent les visiteurs" note="Une visite a une source. Une demande est créditée à la dernière source connue du visiteur (une visite directe ne remplace pas une source connue), et à la première.">
        <RankTable
          rows={channelRows}
          name={{ label: "Source", value: (r) => channelName(r.key) }}
          bar={(r) => r.sessions}
          columns={[
            { label: "Visites", value: (r) => num.format(r.sessions), numeric: true },
            { label: "Visiteurs", value: (r) => num.format(r.visitors), numeric: true },
            { label: "Demandes (dernière source)", value: (r) => num.format(lastBy.get(r.key) ?? 0), numeric: true },
            { label: "Demandes (première source)", value: (r) => num.format(firstBy.get(r.key) ?? 0), numeric: true },
          ]}
        />
      </Section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Sites qui envoient des visiteurs" note="Adresse seulement : la page et les mots cherchés ne sont pas gardés.">
          <RankTable
            rows={report.referrers}
            name={{ label: "Site", value: (r) => <span className="break-all">{r.key}</span> }}
            bar={(r) => r.sessions}
            columns={[
              { label: "Type", value: (r) => channelName(r.channel) },
              { label: "Visites", value: (r) => num.format(r.sessions), numeric: true },
            ]}
          />
        </Section>
        <Section title="Campagnes (UTM)" note="Liens tagués, par exemple ?utm_source=whatsapp&utm_campaign=groupe-lubumbashi.">
          <RankTable
            rows={report.campaigns}
            name={{ label: "Campagne", value: (r) => r.campaign ?? "(sans nom)" }}
            bar={(r) => r.sessions}
            columns={[
              { label: "Source / support", value: (r) => [r.source, r.medium].filter(Boolean).join(" / ") || "—" },
              { label: "Visites", value: (r) => num.format(r.sessions), numeric: true },
            ]}
            empty="Aucun lien tagué sur cette période."
          />
        </Section>
        <Section title="Adresse du site" note="L'adresse par laquelle la visite est arrivée.">
          <RankTable
            rows={report.hosts}
            name={{ label: "Adresse", value: (r) => r.key }}
            bar={(r) => r.sessions}
            columns={[
              { label: "Visites", value: (r) => num.format(r.sessions), numeric: true },
              { label: "Visiteurs", value: (r) => num.format(r.visitors), numeric: true },
            ]}
          />
        </Section>
      </div>

      <Section title="Trajets" note="Visiteurs : ont vu le trajet ou une de ses compagnies. Demandes : toutes celles du trajet sur la période, mesurées ou non.">
        <RankTable
          rows={report.routes}
          name={{ label: "Trajet", value: (r) => (r.origin && r.destination ? `${r.origin} → ${r.destination}` : r.slug) }}
          bar={(r) => r.viewers}
          columns={[
            { label: "Visiteurs", value: (r) => num.format(r.viewers), numeric: true },
            { label: "Pages vues", value: (r) => num.format(r.views), numeric: true },
            { label: "Recherches", value: (r) => num.format(r.searches), numeric: true },
            { label: "Demandes commencées", value: (r) => num.format(r.starts), numeric: true },
            { label: "Demandes", value: (r) => num.format(r.requests), numeric: true },
            { label: "Demandes / visiteurs", value: (r) => share(r.requests, r.viewers), numeric: true },
          ]}
        />
      </Section>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Appareils">
          <RankTable
            rows={report.devices}
            name={{ label: "Appareil", value: (r) => DEVICE_LABEL[r.key] ?? r.key }}
            bar={(r) => r.visitors}
            columns={[
              { label: "Visiteurs", value: (r) => num.format(r.visitors), numeric: true },
              { label: "Demandes", value: (r) => num.format(report.requestsByDevice.get(r.key) ?? 0), numeric: true },
            ]}
          />
        </Section>
        <Section title="Navigateurs">
          <RankTable rows={report.browsers} name={{ label: "Navigateur", value: (r) => r.key ?? "Inconnu" }} bar={(r) => r.visitors} columns={[{ label: "Visiteurs", value: (r) => num.format(r.visitors), numeric: true }]} />
        </Section>
        <Section title="Systèmes">
          <RankTable rows={report.systems} name={{ label: "Système", value: (r) => r.key ?? "Inconnu" }} bar={(r) => r.visitors} columns={[{ label: "Visiteurs", value: (r) => num.format(r.visitors), numeric: true }]} />
        </Section>
        <Section title="Pays" note="D'après l'adresse IP, lue par l'hébergeur et non gardée. Approximatif (VPN, Opera Mini).">
          <RankTable rows={report.countries} name={{ label: "Pays", value: (r) => countryName(r.key) }} bar={(r) => r.visitors} columns={[{ label: "Visiteurs", value: (r) => num.format(r.visitors), numeric: true }]} />
        </Section>
      </div>

      <Section title="Demandes par statut" note="Le statut se change sur chaque demande (Demandes → une demande → Suivi).">
        <RankTable
          rows={(["NEW", "CONTACTED", "BOOKED", "CLOSED", "CLAIMED"] as RequestStatus[])
            .map((s) => ({ s, count: report.requestsByStatus.get(s) ?? 0 }))
            .filter((r) => r.count > 0 || r.s !== "CLAIMED")}
          name={{ label: "Statut", value: (r) => REQUEST_STATUS_LABEL[r.s] }}
          bar={(r) => r.count}
          columns={[
            { label: "Demandes", value: (r) => num.format(r.count), numeric: true },
            { label: "Part", value: (r) => share(r.count, c.requests), numeric: true },
          ]}
        />
      </Section>
    </div>
  );
}
