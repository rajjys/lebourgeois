import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CircleAlert, Clock, Inbox, MessageSquare, PlaneTakeoff, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RouteTitle } from "@/components/ds/RouteTitle";
import { AirlineCodes, RouteFreshnessBadge, TierBadge } from "@/components/backoffice/RouteParts";
import { P1_TARGET } from "@/lib/routeStatus";
import { formatDateLong, formatDateShort, formatDayMonth, formatDayMonthYear } from "@/lib/format";
import type { DashboardData } from "@/lib/dashboard";
import { cn } from "@/lib/utils/cn-utils";

// The back-office home (B-1): what needs work today first, then what happened. Server-rendered.

const day = (d: string) => new Date(`${d}T00:00:00Z`);
const relative = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
function ago(iso: string, now: Date) {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return relative.format(-Math.max(minutes, 1), "minute");
  if (minutes < 60 * 24) return relative.format(-Math.round(minutes / 60), "hour");
  return relative.format(-Math.round(minutes / (60 * 24)), "day");
}
const time = new Intl.DateTimeFormat("fr-CD", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kinshasa" });

const TOPIC = { QUESTION: "Question", CORRECTION: "Erreur signalée", AIRLINE: "Compagnie", OTHER: "Autre" } as const;

/** One headline number: label, value, one line of context. The value uses proportional figures. */
function KpiTile({ label, value, detail, href, children }: { label: string; value: ReactNode; detail: ReactNode; href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="group flex flex-col rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-primary/50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="mt-1 text-3xl font-semibold text-foreground">{value}</span>
      {children}
      <span className="mt-auto pt-2 text-xs text-muted-foreground group-hover:text-foreground">{detail}</span>
    </Link>
  );
}

/**
 * Progress towards the milestone: filled share in the brand colour on a lighter step of the
 * same colour, with a tick at the target.
 */
function TargetMeter({ value, total, target }: { value: number; total: number; target: number }) {
  const pct = (n: number) => `${total ? Math.min(100, (n / total) * 100) : 0}%`;
  return (
    <div className="mt-3">
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
        aria-label={`${value} routes P1 à jour sur ${total}, objectif ${target}`}
        className="relative h-2 rounded-full bg-brand-subtle"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: pct(value) }} />
        <span className="absolute -top-1 h-4 w-0.5 rounded bg-foreground/60" style={{ left: pct(target) }} aria-hidden="true" />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">Objectif du jalon : {target}</p>
    </div>
  );
}

function Panel({ title, icon, count, href, linkLabel = "Tout voir", children, className }: { title: string; icon: ReactNode; count?: number; href?: string; linkLabel?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card p-5", className)}>
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          {icon}
          {title}
          {count !== undefined && <span className="rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">{count}</span>}
        </h2>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-link hover:underline">
            {linkLabel}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;

function RouteLink({ r, children }: { r: DashboardData["toVerify"][number]; children?: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <TierBadge tier={r.tier} />
      <Link href={`/dashboard/routes/${r.slug}`} className="min-w-0 flex-1 hover:text-link hover:underline">
        <RouteTitle as="span" origin={r.origin.city} destination={r.destination.city} className="text-sm font-medium" />
      </Link>
      {children}
    </li>
  );
}

export function DashboardHome({ data, now }: { data: DashboardData; now: Date }) {
  const { kpis } = data;
  const todo = data.p1ToSetUp.length + data.toVerify.length + data.toExtend.length + kpis.pendingPrices + kpis.newRequests + kpis.newMessages;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">
            {todo === 0 ? "Rien n'attend : tout est à jour." : "Ce qui demande votre attention aujourd'hui, le plus important d'abord."}
          </p>
        </div>
        <p className="text-sm text-muted-foreground first-letter:uppercase">{formatDateLong(day(data.today))}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Routes P1 à jour" value={<>{kpis.p1UpToDate}<span className="text-lg font-medium text-muted-foreground"> / {kpis.p1Total}</span></>} detail="Compagnie publiée, vérifiée il y a 7 jours au plus, vols connus pour la semaine" href="/dashboard/routes?p=1">
          <TargetMeter value={kpis.p1UpToDate} total={kpis.p1Total} target={P1_TARGET} />
        </KpiTile>
        <KpiTile label="Vols sur 7 jours" value={kpis.flightsNext7Days} detail={`Sur ${kpis.routesWithFlights} route${kpis.routesWithFlights > 1 ? "s" : ""}, toutes compagnies`} href="/dashboard/routes" />
        <KpiTile label="Demandes à traiter" value={kpis.newRequests} detail={kpis.newMessages ? `Et ${kpis.newMessages} message${kpis.newMessages > 1 ? "s" : ""} de contact` : "Demandes d'aide pour un vol"} href="/dashboard/requests" />
        <KpiTile label="Prix à valider" value={kpis.pendingPrices} detail={kpis.pendingPrices ? `Sur ${kpis.routesWithPendingPrices} route${kpis.routesWithPendingPrices > 1 ? "s" : ""}, pas encore publics` : "Aucun prix en attente"} href="/dashboard/routes?a=prices" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
        <div className="space-y-6">
          <Panel title="Routes P1 à mettre en place" icon={<PlaneTakeoff className="size-4 text-brand" aria-hidden="true" />} count={data.p1ToSetUp.length} href="/dashboard/routes?a=empty&p=1">
            {data.p1ToSetUp.length === 0 ? (
              <Empty>Chaque route P1 a au moins une compagnie.</Empty>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted-foreground">Aucune compagnie encore : ajoutez-la sur la route, puis appliquez son horaire.</p>
                <ul className="flex flex-wrap gap-2">
                  {data.p1ToSetUp.map((r) => (
                    <li key={r.id}>
                      <Link href={`/dashboard/routes/${r.slug}`} className="inline-flex rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary hover:text-link">
                        <RouteTitle as="span" origin={r.origin.city} destination={r.destination.city} className="font-medium" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>

          <Panel title="À revérifier" icon={<Clock className="size-4 text-brand" aria-hidden="true" />} count={data.toVerify.length} href="/dashboard/routes?a=todo">
            {data.toVerify.length === 0 ? (
              <Empty>Toutes les routes ont été vérifiées ces 7 derniers jours.</Empty>
            ) : (
              <ul className="divide-y">
                {data.toVerify.slice(0, 6).map((r) => (
                  <RouteLink key={r.id} r={r}>
                    <AirlineCodes airlines={r.airlines} />
                    <RouteFreshnessBadge freshness={r.freshness} />
                  </RouteLink>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Horaires à prolonger" icon={<CircleAlert className="size-4 text-brand" aria-hidden="true" />} count={data.toExtend.length}>
            {data.toExtend.length === 0 ? (
              <Empty>Les vols sont connus pour au moins deux semaines sur toutes les routes suivies.</Empty>
            ) : (
              <>
                <p className="mb-1 text-sm text-muted-foreground">Vols connus pour moins de deux semaines : copiez une semaine ou appliquez le prochain horaire.</p>
                <ul className="divide-y">
                  {data.toExtend.slice(0, 6).map((r) => (
                    <RouteLink key={r.id} r={r}>
                      <span className={cn("text-sm", !r.knownUntil || r.knownUntil < data.today ? "text-danger" : "text-warning")}>
                        {r.knownUntil ? (r.knownUntil < data.today ? `plus de vol depuis le ${formatDayMonth(day(r.knownUntil))}` : `jusqu'au ${formatDateShort(day(r.knownUntil))}`) : "aucun vol saisi"}
                      </span>
                    </RouteLink>
                  ))}
                </ul>
              </>
            )}
          </Panel>

          <Panel title="Prix à valider" icon={<Tag className="size-4 text-brand" aria-hidden="true" />} count={kpis.pendingPrices} href="/dashboard/routes?a=prices">
            {data.pricesToReview.length === 0 ? (
              <Empty>Aucun prix en attente.</Empty>
            ) : (
              <ul className="divide-y">
                {data.pricesToReview.slice(0, 6).map((r) => (
                  <RouteLink key={r.id} r={r}>
                    <span className="text-sm text-warning">
                      {r.prices.pending} à valider
                    </span>
                  </RouteLink>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Nouvelles demandes" icon={<Inbox className="size-4 text-brand" aria-hidden="true" />} count={kpis.newRequests} href="/dashboard/requests">
            {data.requests.length === 0 ? (
              <Empty>Aucune nouvelle demande.</Empty>
            ) : (
              <ul className="divide-y">
                {data.requests.map((q) => (
                  <li key={q.id} className="py-2">
                    <Link href={`/dashboard/requests/${q.id}`} className="block hover:text-link">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{q.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{ago(q.createdAt, now)}</span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {q.from.split(" (")[0]} → {q.to.split(" (")[0]} · {formatDateShort(day(q.travelDate))} · {q.travelers} voyageur{q.travelers > 1 ? "s" : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Messages" icon={<MessageSquare className="size-4 text-brand" aria-hidden="true" />} count={kpis.newMessages} href="/dashboard/messages">
            {data.messages.length === 0 ? (
              <Empty>Aucun message à traiter.</Empty>
            ) : (
              <ul className="divide-y">
                {data.messages.map((m) => (
                  <li key={m.id} className="py-2">
                    <Link href="/dashboard/messages" className="block hover:text-link">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{m.name}</span>
                        <Badge variant={m.topic === "CORRECTION" ? "warning" : "neutral"}>{TOPIC[m.topic]}</Badge>
                      </span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">{m.message}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Statuts publics" icon={<CircleAlert className="size-4 text-brand" aria-hidden="true" />} count={data.statuses.length}>
            {data.statuses.length === 0 ? (
              <Empty>Tous les aéroports sont ouverts et toutes les compagnies en activité.</Empty>
            ) : (
              <>
                <p className="mb-1 text-sm text-muted-foreground">Affichés sur le site. À revoir quand la situation change.</p>
                <ul className="divide-y">
                  {data.statuses.map((s) => (
                    <li key={s.id} className="flex items-baseline justify-between gap-2 py-2 text-sm">
                      <Link href={s.href} className="font-medium hover:text-link hover:underline">
                        {s.name}
                      </Link>
                      <span className="text-right text-xs text-muted-foreground">
                        <Badge variant="danger">{s.status}</Badge>
                        {s.since && <span className="ml-1">depuis le {formatDayMonthYear(new Date(s.since))}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Activité récente" icon={<Clock className="size-4 text-muted-foreground" aria-hidden="true" />}>
        {data.activity.length === 0 ? (
          <Empty>Aucune modification enregistrée.</Empty>
        ) : (
          <ol className="divide-y">
            {data.activity.map((a) => (
              <li key={a.id} className="flex flex-col gap-0.5 py-2 text-sm sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3">
                <time dateTime={a.at} className="w-28 shrink-0 text-xs text-muted-foreground">
                  {time.format(new Date(a.at))}
                </time>
                {a.route && (
                  <Link href={`/dashboard/routes/${a.route.slug}`} className="shrink-0 hover:text-link hover:underline">
                    <RouteTitle as="span" origin={a.route.origin} destination={a.route.destination} className="text-xs font-semibold" />
                  </Link>
                )}
                <span className={cn("min-w-0 break-words sm:flex-1", a.undone && "text-muted-foreground line-through")}>{a.summary}</span>
                {a.undone && <Badge variant="neutral">défait</Badge>}
                <span className="w-full text-xs text-muted-foreground sm:w-auto">{a.actor}</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
