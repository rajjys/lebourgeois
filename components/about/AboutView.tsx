'use client';

import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  CalendarCheck,
  FileSearch,
  HandHeart,
  Info,
  MessageSquareWarning,
  PhoneCall,
  Plane,
  Route,
  Share2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { VOLS_HREF } from "@/lib/links";
import { cn } from "@/lib/utils/cn-utils";

const WHATSAPP_DISPLAY = SITE.whatsapp.replace(/^\+(\d{3})(\d{3})(\d{3})(\d{3})$/, "+$1 $2 $3 $4");
const WHATSAPP_HREF = `https://wa.me/${SITE.whatsapp.replace(/^\+/, "")}`;

const PROBLEMS = ["scattered", "changes", "prices", "global"] as const;
const OFFER = [
  { key: "route", icon: Route },
  { key: "airline", icon: Plane },
  { key: "prices", icon: BadgeDollarSign },
  { key: "alerts", icon: TriangleAlert },
  { key: "booking", icon: PhoneCall },
] as const;
const METHOD = ["collect", "check", "date", "publish"] as const;
const LIMITS = ["prices", "live", "coverage", "published", "time", "team", "tickets"] as const;
const JOIN = [
  { key: "error", icon: MessageSquareWarning, href: "/contact?sujet=erreur" },
  { key: "share", icon: Share2, href: "/contact?sujet=question" },
  { key: "partners", icon: Building2, href: "/contact?sujet=compagnie" },
  { key: "help", icon: HandHeart, href: "/contact" },
] as const;

function Section({ id, title, lead, children, className }: { id: string; title: string; lead?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24", className)}>
      <div className="max-w-2xl">
        <h2 id={`${id}-title`} className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {lead && <p className="mt-3 text-lg text-neutral-700">{lead}</p>}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

/**
 * /about (owner, 2026-11-02): what we solve, how, our method, our limits, what we aim for, and how
 * anyone can help. Every claim here is something the product does today; plans are said as plans.
 */
export function AboutView({ figures }: { figures: { routes: number; airlines: number; flightsThisWeek: number } }) {
  const { t } = useTranslation();
  const stats = [
    { value: figures.routes, label: t("about.figures.routes", { count: figures.routes }) },
    { value: figures.airlines, label: t("about.figures.airlines", { count: figures.airlines }) },
    { value: figures.flightsThisWeek, label: t("about.figures.flights", { count: figures.flightsThisWeek }) },
  ];

  return (
    <div className="flex-1">
      <section className="bg-gradient-to-b from-brand-50 to-background">
        <div className="container mx-auto max-w-5xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20 lg:px-8">
          <p className="text-sm font-semibold text-link">{t("about.eyebrow")}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{t("about.title")}</h1>
          <p className="mt-5 max-w-2xl text-lg text-neutral-700 sm:text-xl">{t("about.lead")}</p>
          <dl className="mt-10 grid max-w-3xl grid-cols-3 gap-3 sm:gap-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col rounded-2xl border bg-card p-4 sm:p-5">
                <dt className="order-last mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</dt>
                <dd className="text-2xl font-bold text-foreground sm:text-3xl">{s.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">{t("about.figures.note")}</p>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl space-y-20 px-4 py-16 sm:px-6 lg:px-8">
        <Section id="probleme" title={t("about.problem.title")} lead={t("about.problem.lead")}>
          <ul className="grid gap-4 sm:grid-cols-2">
            {PROBLEMS.map((k) => (
              <li key={k} className="rounded-2xl bg-muted p-5 text-neutral-700">
                {t(`about.problem.items.${k}`)}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="ce-que-nous-faisons" title={t("about.offer.title")} lead={t("about.offer.lead")}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OFFER.map(({ key, icon: Icon }) => (
              <li key={key} className="rounded-2xl border bg-card p-5">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold text-foreground">{t(`about.offer.items.${key}.title`)}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{t(`about.offer.items.${key}.body`)}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="methode" title={t("about.method.title")} lead={t("about.method.lead")}>
          <ol className="relative space-y-8 border-l-2 border-brand-100 pl-8 sm:ml-4">
            {METHOD.map((k, i) => (
              <li key={k} className="relative">
                <span className="absolute -left-[3.05rem] top-0 inline-flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground ring-4 ring-background">
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold text-foreground">{t(`about.method.steps.${k}.title`)}</h3>
                <p className="mt-1.5 max-w-2xl text-neutral-700">{t(`about.method.steps.${k}.body`)}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="limites" title={t("about.limits.title")} lead={t("about.limits.lead")}>
          <ul className="divide-y rounded-2xl border bg-card">
            {LIMITS.map((k) => (
              <li key={k} className="flex gap-3 p-4 sm:p-5">
                <Info className="mt-0.5 size-5 shrink-0 text-info" aria-hidden="true" />
                <p className="text-neutral-700">{t(`about.limits.items.${k}`)}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="intention" title={t("about.intent.title")}>
          <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="space-y-4 text-lg text-neutral-700">
              <p>{t("about.intent.p1")}</p>
              <p>{t("about.intent.p2")}</p>
            </div>
            <ul className="space-y-3 self-start rounded-2xl bg-muted p-5">
              {(["dated", "sourced", "corrected", "neutral"] as const).map((k) => (
                <li key={k} className="flex gap-2.5 text-sm text-neutral-700">
                  {k === "dated" ? (
                    <CalendarCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                  ) : (
                    <FileSearch className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                  )}
                  {t(`about.intent.promises.${k}`)}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section id="participer" title={t("about.join.title")} lead={t("about.join.lead")}>
          <ul className="grid gap-4 sm:grid-cols-2">
            {JOIN.map(({ key, icon: Icon, href }) => (
              <li key={key}>
                <Link href={href} className="group flex h-full flex-col rounded-2xl border bg-card p-5 transition-colors hover:border-primary">
                  <span className="flex items-center gap-3">
                    <Icon className="size-5 text-brand" aria-hidden="true" />
                    <span className="font-semibold text-foreground">{t(`about.join.items.${key}.title`)}</span>
                  </span>
                  <span className="mt-2 flex-1 text-sm text-muted-foreground">{t(`about.join.items.${key}.body`)}</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-link group-hover:underline">
                    {t(`about.join.items.${key}.cta`)}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-neutral-700">
            {t("about.join.whatsapp")}{" "}
            <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className="font-medium text-link underline">
              {WHATSAPP_DISPLAY}
            </a>
          </p>
        </Section>

        <section className="rounded-3xl bg-brand-50 p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{t("about.cta.title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-neutral-700">{t("about.cta.body")}</p>
          <Button asChild size="lg" className="mt-6 h-12 px-8 text-base">
            <Link href={VOLS_HREF}>{t("about.cta.button")}</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
