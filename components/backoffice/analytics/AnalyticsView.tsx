import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { RouteTitle } from "@/components/ds/RouteTitle";
import type { Period } from "@/lib/analytics/period";
import type { AnalyticsReport, FilterOptions, Filters } from "@/lib/analytics/report";
import { REQUEST_STATUS_LABEL, REQUEST_STATUS_VARIANT, type RequestStatus } from "@/lib/constants";
import { formatDayMonth, shortAirlineName } from "@/lib/format";
import { cn } from "@/lib/utils/cn-utils";
import { AboutNumbers } from "./AboutNumbers";
import { Toolbar } from "./Toolbar";
import { TrendCard } from "./TrendCard";
import {
  BarList, channelIcon, channelName, CountryCode, countryName, DataTable, Delta, DEVICE_ICON, DEVICE_LABEL, Funnel,
  num, Panel, pct, rate, SeeAll, Split, StatStrip, type BarRow,
} from "./parts";

// The Statistiques page (AN-5). One header, one line of controls, five views; the overview answers
// "how are we doing" at a glance and every list links to its full view or filters the page.

export const VIEWS = [
  { key: "apercu", label: "Vue d'ensemble" },
  { key: "acquisition", label: "Acquisition" },
  { key: "contenu", label: "Trajets et pages" },
  { key: "demandes", label: "Demandes" },
  { key: "audience", label: "Audience" },
] as const;
export type ViewKey = (typeof VIEWS)[number]["key"];

type Query = Record<string, string | undefined>;
const day = (d: string) => new Date(`${d}T00:00:00Z`);
const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kinshasa" });

/** The current address with some parameters changed (null removes one). */
function hrefWith(query: Query, patch: Record<string, string | null>) {
  const next = new URLSearchParams(Object.entries(query).filter(([, v]) => v) as [string, string][]);
  for (const [k, v] of Object.entries(patch)) {
    if (v) next.set(k, v);
    else next.delete(k);
  }
  const s = next.toString();
  return `/dashboard/analytics${s ? `?${s}` : ""}`;
}

function periodLabel(p: Period) {
  const range = p.from === p.to ? formatDayMonth(day(p.from)) : `${formatDayMonth(day(p.from))} – ${formatDayMonth(day(p.to))}`;
  const before = p.previous.from === p.previous.to ? formatDayMonth(day(p.previous.from)) : `${formatDayMonth(day(p.previous.from))} – ${formatDayMonth(day(p.previous.to))}`;
  return { now: range, before };
}

export function AnalyticsView({ report, filters, options, view, query, today }: { report: AnalyticsReport; filters: Filters; options: FilterOptions; view: ViewKey; query: Query; today: string }) {
  const { period } = report;
  const labels = periodLabel(period);
  const tab = (v: ViewKey) => hrefWith(query, { vue: v === "apercu" ? null : v });
  const filter = (param: string, value: string | null) => hrefWith(query, { [param]: value });

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Statistiques</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground" title="Visiteurs actifs dans les 30 dernières minutes">
                <span className={cn("size-1.5 rounded-full", report.liveVisitors ? "bg-success" : "bg-neutral-300")} aria-hidden="true" />
                {num.format(report.liveVisitors)} en ligne
              </span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="tabular-nums">
                {labels.now} <span className="text-neutral-400">·</span> comparé à {labels.before}
                {report.comparedToSameTime && report.hourly && <> jusqu&apos;à la même heure</>}
              </span>
              <AboutNumbers since={report.trackingSince ? formatDayMonth(report.trackingSince) : null} />
            </p>
          </div>
          <Toolbar period={{ key: period.key, from: period.from, to: period.to }} today={today} filters={filters} options={options} />
        </div>

        <nav aria-label="Vues" className="flex gap-1 overflow-x-auto border-b">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={tab(v.key)}
              scroll={false}
              aria-current={view === v.key ? "page" : undefined}
              className={cn(
                "relative whitespace-nowrap px-3 pb-2.5 pt-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                view === v.key && "text-foreground after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary",
              )}
            >
              {v.label}
            </Link>
          ))}
        </nav>
      </header>

      {view === "apercu" && <Overview report={report} labels={labels} tab={tab} filter={filter} />}
      {view === "acquisition" && <Acquisition report={report} filter={filter} />}
      {view === "contenu" && <Content report={report} filter={filter} options={options} />}
      {view === "demandes" && <Requests report={report} filter={filter} />}
      {view === "audience" && <Audience report={report} filter={filter} />}
    </div>
  );
}

type FilterHref = (param: string, value: string | null) => string;

/** A route in a list or a table: lighter than a page title, the brand arrow kept. */
const Route = ({ from, to }: { from: string; to: string }) => <RouteTitle as="span" origin={from} destination={to} className="gap-x-1.5 text-sm font-medium" />;

const STATIC_PAGES: Record<string, string> = { "/": "Accueil", "/vols": "Rechercher un vol", "/about": "À propos", "/contact": "Contact", "/request": "Demande d'aide" };

/** "/vols/kinshasa-lubumbashi/caa" → "Kinshasa – Lubumbashi · CAA"; the path stays visible beside it. */
function pageLabel(path: string, routes: Map<string, string>, airlines: Map<string, string>) {
  if (STATIC_PAGES[path]) return STATIC_PAGES[path];
  const m = path.match(/^\/vols\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/?$/);
  if (!m) return path;
  const route = routes.get(m[1]) ?? m[1];
  return m[2] ? `${route} · ${airlines.get(m[2]) ?? m[2]}` : route;
}
function PageName({ path, label, withPath = true }: { path: string; label: string; withPath?: boolean }) {
  return (
    <span className="flex min-w-0 items-baseline gap-2" title={path}>
      <span className="truncate">{label}</span>
      {withPath && label !== path && <span className="hidden truncate text-xs text-muted-foreground xl:inline">{path}</span>}
    </span>
  );
}

function sourceRows(r: AnalyticsReport, filter: FilterHref): BarRow[] {
  return r.channels.map((c) => ({
    key: c.key, label: channelName(c.key), icon: channelIcon(c.key), value: c.visitors,
    detail: r.requestsByLastChannel.get(c.key) ? num.format(r.requestsByLastChannel.get(c.key)!) : "—", href: filter("source", c.key),
  }));
}
function routeRows(r: AnalyticsReport, filter: FilterHref): BarRow[] {
  return r.routes.map((x) => ({
    key: x.slug, value: x.viewers, href: filter("trajet", x.slug), detail: x.requests ? num.format(x.requests) : "—",
    label: x.origin && x.destination ? <Route from={x.origin} to={x.destination} /> : x.slug,
  }));
}
const deviceRows = (r: AnalyticsReport, filter: FilterHref): BarRow[] =>
  r.devices.map((d) => ({ key: d.key, label: DEVICE_LABEL[d.key] ?? d.key, icon: DEVICE_ICON[d.key], value: d.visitors, detail: rate(d.visitors, r.current.visitors), href: filter("appareil", d.key) }));
const countryRows = (r: AnalyticsReport): BarRow[] =>
  r.countries.map((c) => ({ key: c.key ?? "unknown", label: countryName(c.key), icon: <CountryCode code={c.key} />, value: c.visitors, detail: rate(c.visitors, r.current.visitors) }));
function pageNamer(r: AnalyticsReport, options: FilterOptions) {
  const routes = new Map(options.routes.map((x) => [x.slug, x.label]));
  for (const x of r.routes) if (x.origin && x.destination && !routes.has(x.slug)) routes.set(x.slug, `${x.origin} – ${x.destination}`);
  const airlines = new Map(r.airlines.filter((a) => a.name).map((a) => [a.slug, shortAirlineName(a.name!)]));
  return (path: string) => pageLabel(path, routes, airlines);
}
const pageRows = (r: AnalyticsReport, name: (path: string) => string): BarRow[] =>
  r.pages.map((p) => ({ key: p.key, label: <PageName path={p.key} label={name(p.key)} />, value: p.visitors, detail: num.format(p.views) }));

function funnelSteps(r: AnalyticsReport) {
  const f = r.funnel;
  return [
    { label: "Visiteurs", value: f.visitors },
    { label: "Ont vu un trajet", value: f.routeViews },
    { label: "Ont fait une recherche", value: f.searches },
    { label: "Ont commencé une demande", value: f.started },
    { label: "Ont envoyé une demande", value: f.submitted },
  ];
}

function RecentRequests({ r }: { r: AnalyticsReport }) {
  return (
    <DataTable
      rows={r.recentRequests}
      rowKey={(q) => q.id}
      empty="Aucune demande sur cette période."
      columns={[
        { label: "Reçue", cell: (q) => <Link href={`/dashboard/requests/${q.id}`} className="font-medium text-foreground hover:text-link hover:underline tabular-nums">{when.format(q.createdAt)}</Link>, className: "whitespace-nowrap" },
        { label: "Trajet", cell: (q) => <Route from={q.originCity} to={q.destinationCity} /> },
        { label: "Compagnie", cell: (q) => (q.airlineName ? shortAirlineName(q.airlineName) : "—") },
        { label: "Vol le", cell: (q) => formatDayMonth(q.travelDate), className: "whitespace-nowrap tabular-nums" },
        { label: "Source", cell: (q) => <span className="inline-flex items-center gap-1.5 text-muted-foreground">{channelIcon(q.lastChannel)}<span className="text-foreground">{channelName(q.lastChannel)}</span></span> },
        { label: "Appareil", cell: (q) => (q.device ? DEVICE_LABEL[q.device] ?? q.device : "—") },
        { label: "Statut", cell: (q) => <Badge variant={REQUEST_STATUS_VARIANT[q.status as RequestStatus]}>{REQUEST_STATUS_LABEL[q.status as RequestStatus]}</Badge> },
      ]}
    />
  );
}

function Overview({ report: r, labels, tab, filter }: { report: AnalyticsReport; labels: { now: string; before: string }; tab: (v: ViewKey) => string; filter: FilterHref }) {
  const c = r.current;
  return (
    <>
      <TrendCard series={r.series} current={r.current} previous={r.previous} hourly={r.hourly} labels={labels} />

      <div className="grid grid-cols-2 divide-x divide-y rounded-xl border bg-card shadow-card lg:grid-cols-4 lg:divide-y-0">
        {[
          { label: "Taux de demande", value: c.conversion === null ? "—" : pct.format(c.conversion), note: "des visiteurs", delta: <Delta now={c.conversion} before={r.previous.conversion} /> },
          { label: "Réservées", value: num.format(c.booked), note: c.bookingRate === null ? "aucune demande" : `${pct.format(c.bookingRate)} des demandes`, delta: <Delta now={c.booked} before={r.previous.booked} /> },
          { label: "Clics WhatsApp", value: num.format(c.whatsapp), note: `par ${num.format(c.whatsappVisitors)} visiteur${c.whatsappVisitors > 1 ? "s" : ""}`, delta: <Delta now={c.whatsapp} before={r.previous.whatsapp} /> },
          { label: "Pages par visite", value: c.pagesPerVisit === null ? "—" : c.pagesPerVisit.toLocaleString("fr-FR", { maximumFractionDigits: 1 }), note: `${num.format(c.searches)} recherches`, delta: <Delta now={c.pagesPerVisit} before={r.previous.pagesPerVisit} /> },
        ].map((x) => (
          <div key={x.label} className="px-5 py-3">
            <p className="text-xs font-medium text-muted-foreground">{x.label}</p>
            <p className="mt-0.5 flex items-baseline justify-between gap-3">
              <span className="text-lg font-semibold text-foreground tabular-nums">{x.value}</span>
              {x.delta}
            </p>
            <p className="text-xs text-muted-foreground">{x.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Sources" caption="Visiteurs, et demandes créditées à chaque source" action={<SeeAll href={tab("acquisition")} />}>
          <BarList rows={sourceRows(r, filter)} valueLabel="Visiteurs" detailLabel="Demandes" limit={6} />
        </Panel>
        <Panel title="Trajets les plus consultés" caption="Visiteurs du trajet ou de ses compagnies" action={<SeeAll href={tab("contenu")} />}>
          <BarList rows={routeRows(r, filter)} valueLabel="Visiteurs" detailLabel="Demandes" limit={6} />
        </Panel>
        <Panel title="Parcours" caption="Visiteurs ayant atteint chaque étape, pas forcément dans cet ordre" action={<SeeAll href={tab("demandes")} />}>
          <Funnel steps={funnelSteps(r)} />
        </Panel>
        <div className="grid gap-5 sm:grid-cols-2">
          <Panel title="Appareils" action={<SeeAll href={tab("audience")} />}>
            <BarList rows={deviceRows(r, filter)} valueLabel="Visiteurs" />
          </Panel>
          <Panel title="Pays" action={<SeeAll href={tab("audience")} />}>
            <BarList rows={countryRows(r)} valueLabel="Visiteurs" limit={5} />
          </Panel>
        </div>
      </div>

      <Panel title="Dernières demandes" caption="Avec la source du voyageur ; le statut se change sur la demande" action={<SeeAll href="/dashboard/requests" label="Toutes les demandes" />} flush>
        <RecentRequests r={r} />
      </Panel>
    </>
  );
}

function Acquisition({ report: r, filter }: { report: AnalyticsReport; filter: FilterHref }) {
  const keys = [...new Set([...r.channels.map((c) => c.key as string | null), ...r.requestsByLastChannel.keys(), ...r.requestsByFirstChannel.keys()])];
  const rows = keys.map((k) => {
    const c = r.channels.find((x) => x.key === k);
    return { key: k, visitors: c?.visitors ?? 0, sessions: c?.sessions ?? 0, bounced: c?.bounced ?? 0, last: r.requestsByLastChannel.get(k) ?? 0, first: r.requestsByFirstChannel.get(k) ?? 0, booked: r.bookedByLastChannel.get(k) ?? 0 };
  }).sort((a, b) => b.visitors - a.visitors || b.last - a.last);
  return (
    <>
      <Panel title="Sources" caption="Une visite a une source. Une demande est créditée à la dernière source connue (une visite directe ne la remplace pas) et à la première." flush>
        <DataTable
          rows={rows}
          rowKey={(x) => x.key ?? "none"}
          rowHref={(x) => (x.key ? filter("source", x.key) : undefined)}
          columns={[
            { label: "Source", cell: (x) => <span className="inline-flex items-center gap-2"><span className="text-muted-foreground">{channelIcon(x.key)}</span>{channelName(x.key)}</span> },
            { label: "Visiteurs", cell: (x) => num.format(x.visitors), align: "right" },
            { label: "Visites", cell: (x) => num.format(x.sessions), align: "right" },
            { label: "Rebond", cell: (x) => rate(x.bounced, x.sessions), align: "right" },
            { label: "Demandes (dernière)", cell: (x) => num.format(x.last), align: "right" },
            { label: "Demandes (première)", cell: (x) => num.format(x.first), align: "right" },
            { label: "Réservées", cell: (x) => num.format(x.booked), align: "right" },
            { label: "Demandes / visiteurs", cell: (x) => rate(x.last, x.visitors), align: "right" },
          ]}
        />
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Sites référents" caption="Adresse seulement : la page et les mots cherchés ne sont pas gardés">
          <BarList rows={r.referrers.map((x) => ({ key: x.key, label: x.key, icon: channelIcon(x.channel), value: x.visitors, detail: num.format(x.sessions), title: channelName(x.channel) }))} valueLabel="Visiteurs" detailLabel="Visites" />
        </Panel>
        <Panel title="Campagnes" caption="Liens tagués (utm_source, utm_medium, utm_campaign)" flush>
          <DataTable
            rows={r.campaigns}
            rowKey={(x) => `${x.campaign}|${x.source}|${x.medium}`}
            rowHref={(x) => (x.campaign ? filter("campagne", x.campaign) : undefined)}
            empty="Aucun lien tagué sur cette période. Voir docs/ANALYTICS.md §9 pour taguer les liens partagés."
            columns={[
              { label: "Campagne", cell: (x) => x.campaign ?? "(sans nom)" },
              { label: "Source / support", cell: (x) => <span className="text-muted-foreground">{[x.source, x.medium].filter(Boolean).join(" / ") || "—"}</span> },
              { label: "Visiteurs", cell: (x) => num.format(x.visitors), align: "right" },
              { label: "Demandes", cell: (x) => num.format(x.requests), align: "right" },
            ]}
          />
        </Panel>
        <Panel title="Nouveaux et connus" caption="Un visiteur connu est déjà venu avec ce navigateur">
          <Split a={{ label: "Nouveaux", value: r.current.newVisitors }} b={{ label: "Connus", value: r.current.returningVisitors }} />
        </Panel>
        <Panel title="Adresse du site" caption="Par où la visite est arrivée">
          <BarList rows={r.hosts.map((h) => ({ key: h.key, label: h.key, value: h.visitors, detail: rate(h.visitors, r.current.visitors) }))} valueLabel="Visiteurs" detailLabel="Part" />
        </Panel>
      </div>
    </>
  );
}

function Content({ report: r, filter, options }: { report: AnalyticsReport; filter: FilterHref; options: FilterOptions }) {
  const name = pageNamer(r, options);
  const missing = r.searches.filter((x) => !x.covered);
  const searchName = (x: AnalyticsReport["searches"][number]) =>
    x.originCity && x.destinationCity ? <Route from={x.originCity} to={x.destinationCity} /> : <span className="font-medium">{x.origin} – {x.destination}</span>;
  return (
    <>
      <Panel title="Trajets" caption="Visiteurs : ont vu le trajet ou une de ses compagnies. Demandes : toutes celles du trajet, mesurées ou non." flush>
        <DataTable
          rows={r.routes}
          rowKey={(x) => x.slug}
          rowHref={(x) => filter("trajet", x.slug)}
          columns={[
            { label: "Trajet", cell: (x) => (x.origin && x.destination ? <Route from={x.origin} to={x.destination} /> : x.slug) },
            { label: "Visiteurs", cell: (x) => num.format(x.viewers), align: "right" },
            { label: "Pages vues", cell: (x) => num.format(x.views), align: "right" },
            { label: "Recherches", cell: (x) => num.format(x.searches), align: "right" },
            { label: "Commencées", cell: (x) => num.format(x.starts), align: "right" },
            { label: "Demandes", cell: (x) => num.format(x.requests), align: "right" },
            { label: "Réservées", cell: (x) => num.format(x.booked), align: "right" },
            { label: "Demandes / visiteurs", cell: (x) => rate(x.requests, x.viewers), align: "right" },
          ]}
        />
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Compagnies" caption="Pages d'une compagnie sur un trajet, et demandes pour ses vols" flush>
          <DataTable
            rows={r.airlines}
            rowKey={(x) => x.slug}
            columns={[
              { label: "Compagnie", cell: (x) => <span className="font-medium">{x.name ? shortAirlineName(x.name) : x.slug}</span>, className: "whitespace-nowrap" },
              { label: "Visiteurs", cell: (x) => num.format(x.viewers), align: "right" },
              { label: "Commencées", cell: (x) => num.format(x.starts), align: "right" },
              { label: "Demandes", cell: (x) => num.format(x.requests), align: "right" },
              { label: "Réservées", cell: (x) => num.format(x.booked), align: "right" },
              { label: "Demandes / visiteurs", cell: (x) => rate(x.requests, x.viewers), align: "right" },
            ]}
          />
        </Panel>
        <Panel title="Demande non couverte" caption="Trajets cherchés où aucune compagnie n'est publiée : des pages à créer ou des compagnies à ajouter" flush>
          <DataTable
            rows={missing}
            rowKey={(x) => `${x.origin}-${x.destination}`}
            empty="Toutes les recherches tombent sur un trajet couvert."
            columns={[
              { label: "Trajet cherché", cell: searchName },
              { label: "Recherches", cell: (x) => num.format(x.searches), align: "right" },
              { label: "Visiteurs", cell: (x) => num.format(x.visitors), align: "right" },
            ]}
          />
        </Panel>
        <Panel title="Recherches les plus fréquentes" caption="Formulaire de recherche, tous trajets">
          <BarList
            rows={r.searches.map((x) => ({
              key: `${x.origin}-${x.destination}`,
              label: <span className="flex items-center gap-2">{searchName(x)}{!x.covered && <Badge variant="warning">Non couvert</Badge>}</span>,
              value: x.searches, detail: num.format(x.visitors), href: x.slug && x.covered ? filter("trajet", x.slug) : undefined,
            }))}
            valueLabel="Recherches"
            detailLabel="Visiteurs"
            limit={12}
            empty="Aucune recherche sur cette période."
          />
        </Panel>
        <Panel title="Pages d'entrée" caption="La première page d'une visite : souvent un trajet trouvé sur Google" flush>
          <DataTable
            rows={r.entries.slice(0, 12)}
            rowKey={(x) => x.key}
            columns={[
              { label: "Page", cell: (x) => <span className="block max-w-72"><PageName path={x.key} label={name(x.key)} withPath={false} /></span> },
              { label: "Visites", cell: (x) => num.format(x.sessions), align: "right" },
              { label: "Rebond", cell: (x) => rate(x.bounced, x.sessions), align: "right" },
              { label: "Demandes", cell: (x) => num.format(x.converted), align: "right" },
            ]}
          />
        </Panel>
      </div>
      <Panel title="Pages les plus vues">
        <BarList rows={pageRows(r, name)} valueLabel="Visiteurs" detailLabel="Vues" limit={15} />
      </Panel>
    </>
  );
}

function Requests({ report: r, filter }: { report: AnalyticsReport; filter: FilterHref }) {
  const c = r.current;
  const p = r.previous;
  const statuses = (["NEW", "CONTACTED", "BOOKED", "CLOSED", "CLAIMED"] as RequestStatus[]).filter((s) => s !== "CLAIMED" || r.requestsByStatus.get(s));
  const contacts = r.contacts.map((x) => ({
    key: `${x.name}|${x.kind}`,
    label: x.name === "whatsapp_click" ? `WhatsApp${x.kind ? ` · ${{ header: "en-tête", footer: "pied de page", main: "contenu" }[x.kind] ?? x.kind}` : ""}` : { email: "E-mail", phone: "Téléphone", form: "Formulaire de contact" }[x.kind ?? ""] ?? "Contact",
    icon: x.name === "whatsapp_click" ? channelIcon("whatsapp") : channelIcon("email"),
    value: x.clicks,
    detail: num.format(x.visitors),
  }));
  return (
    <>
      <StatStrip
        items={[
          { label: "Demandes", value: num.format(c.requests), delta: <Delta now={c.requests} before={p.requests} /> },
          { label: "Réservées", value: num.format(c.booked), delta: <Delta now={c.booked} before={p.booked} /> },
          { label: "Taux de réservation", value: c.bookingRate === null ? "—" : pct.format(c.bookingRate), delta: <Delta now={c.bookingRate} before={p.bookingRate} /> },
          { label: "Taux de demande", value: c.conversion === null ? "—" : pct.format(c.conversion), delta: <Delta now={c.conversion} before={p.conversion} />, hint: "Demandes ÷ visiteurs" },
          { label: "Commencées", value: num.format(c.starts), delta: <Delta now={c.starts} before={p.starts} />, hint: "Visites où le formulaire de réservation a été touché" },
          { label: "Échecs d'envoi", value: num.format(c.failures), delta: <Delta now={c.failures} before={p.failures} inverse /> },
          { label: "Non mesurées", value: num.format(c.requestsUnmeasured), hint: "Demandes sans source : avant le suivi, ou navigateur qui ne garde rien" },
        ]}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Parcours" caption="Visiteurs ayant atteint chaque étape ; l'écart avec l'étape précédente est à gauche">
          <Funnel steps={funnelSteps(r)} />
        </Panel>
        <Panel title="Statut des demandes" caption="« Réservée » une fois le billet émis par l'agence">
          <BarList
            rows={statuses.map((s) => ({ key: s, label: REQUEST_STATUS_LABEL[s], value: r.requestsByStatus.get(s) ?? 0, detail: rate(r.requestsByStatus.get(s) ?? 0, c.requests) }))}
            valueLabel="Demandes"
            detailLabel="Part"
          />
        </Panel>
        <Panel title="Demandes par source" caption="Dernière source connue du voyageur">
          <BarList
            rows={[...r.requestsByLastChannel.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k ?? "none", label: channelName(k), icon: channelIcon(k), value: v, detail: num.format(r.bookedByLastChannel.get(k) ?? 0), href: k ? filter("source", k) : undefined }))}
            valueLabel="Demandes"
            detailLabel="Réservées"
            empty="Aucune demande sur cette période."
          />
        </Panel>
        <Panel title="Clics de contact" caption="Liens WhatsApp, e-mail, téléphone, et formulaire de contact envoyé">
          <BarList rows={contacts} valueLabel="Clics" detailLabel="Visiteurs" empty="Aucun clic sur cette période." />
        </Panel>
      </div>
      <Panel title="Dernières demandes" action={<SeeAll href="/dashboard/requests" label="Toutes les demandes" />} flush>
        <RecentRequests r={r} />
      </Panel>
    </>
  );
}

function Audience({ report: r, filter }: { report: AnalyticsReport; filter: FilterHref }) {
  const share = (v: number) => rate(v, r.current.visitors);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Appareils">
        <BarList rows={deviceRows(r, filter).map((d) => ({ ...d, detail: num.format(r.requestsByDevice.get(d.key) ?? 0) }))} valueLabel="Visiteurs" detailLabel="Demandes" />
      </Panel>
      <Panel title="Nouveaux et connus">
        <Split a={{ label: "Nouveaux", value: r.current.newVisitors }} b={{ label: "Connus", value: r.current.returningVisitors }} />
      </Panel>
      <Panel title="Pays" caption="D'après l'adresse IP, lue par l'hébergeur et non gardée ; approximatif (VPN, Opera Mini)">
        <BarList rows={countryRows(r)} valueLabel="Visiteurs" detailLabel="Part" />
      </Panel>
      <Panel title="Navigateurs">
        <BarList rows={r.browsers.map((b) => ({ key: b.key ?? "?", label: b.key ?? "Inconnu", value: b.visitors, detail: share(b.visitors) }))} valueLabel="Visiteurs" detailLabel="Part" />
      </Panel>
      <Panel title="Systèmes">
        <BarList rows={r.systems.map((s) => ({ key: s.key ?? "?", label: s.key ?? "Inconnu", value: s.visitors, detail: share(s.visitors) }))} valueLabel="Visiteurs" detailLabel="Part" />
      </Panel>
      <Panel title="Adresse du site">
        <BarList rows={r.hosts.map((h) => ({ key: h.key, label: h.key, value: h.visitors, detail: share(h.visitors) }))} valueLabel="Visiteurs" detailLabel="Part" />
      </Panel>
    </div>
  );
}

