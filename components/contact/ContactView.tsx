'use client';

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { CircleAlert, CircleCheck, Mail, MessageCircle, Plane, Send, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TYPE } from "@/components/ds/typography";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CONTACT_TOPICS, ContactSchema, type ContactInput } from "@/lib/validations/contact";
import { requestHref } from "@/lib/links";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils/cn-utils";
import { track } from "@/lib/analytics/browser";

// "+243975092470" → "+243 975 092 470", the way Congolese numbers are written.
const WHATSAPP_DISPLAY = SITE.whatsapp.replace(/^\+(\d{3})(\d{3})(\d{3})(\d{3})$/, "+$1 $2 $3 $4");
const WHATSAPP_HREF = `https://wa.me/${SITE.whatsapp.replace(/^\+/, "")}`;

// ?sujet=erreur&page=/vols/...&titre=Kinshasa – Lubumbashi lets any page link to "report a mistake on
// this page": the topic is chosen, the message starts with the page's name, and the path goes with the
// message for the back office (Messages shows it as "Page : …").
const TOPIC_PARAM: Record<string, ContactInput["topic"]> = {
  question: "QUESTION",
  erreur: "CORRECTION",
  compagnie: "AIRLINE",
};

/** The page's name from the link, on one line and short: it only starts the visitor's own message. */
const pageTitle = (value: string | null) => (value ?? "").replace(/\s+/g, " ").trim().slice(0, 120);

export function ContactView() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const [sent, setSent] = useState<{ name: string; reply: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const initialTopic = TOPIC_PARAM[params.get("sujet") ?? ""] ?? "QUESTION";
  const title = pageTitle(params.get("titre"));
  // "Page : Kinshasa – Lubumbashi · CAA, mardi 10 novembre 2026\nCe qui est faux : "
  const [prefill] = useState(() =>
    title ? [t("contact.form.prefillPage", { page: title }), initialTopic === "CORRECTION" ? t("contact.form.prefillWrong") : ""].join("\n") : "",
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(ContactSchema),
    defaultValues: {
      name: "",
      reply: "",
      topic: initialTopic,
      message: prefill,
      pageUrl: params.get("page") ?? "",
      website: "",
    },
  });
  const topic = useWatch({ control, name: "topic" });
  const error = (name: keyof ContactInput) => {
    const key = errors[name]?.message;
    return key ? t(key) : undefined;
  };

  async function onSubmit(values: ContactInput) {
    // The started message alone says nothing: ask for the visitor's part.
    const own = prefill && values.message.trim().startsWith(prefill.trim()) ? values.message.trim().slice(prefill.trim().length) : values.message;
    if (own.trim().length < 3) {
      setError("message", { message: "contact.errors.describe" }, { shouldFocus: true });
      return;
    }
    setFailed(false);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      track("contact_click", { props: { kind: "form", topic: values.topic } });
      setSent({ name: values.name, reply: values.reply });
      reset();
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-16 lg:px-8">
      <header className="max-w-2xl space-y-2 sm:space-y-3">
        <h1 className={cn(TYPE.title, "text-foreground")}>{t("contact.title")}</h1>
        <p className={TYPE.lead}>{t("contact.intro")}</p>
        <p className="text-sm text-muted-foreground">{t("contact.noTickets")}</p>
      </header>

      <div className="mt-8 grid gap-8 sm:mt-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <section aria-labelledby="contact-form-title" className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
          <h2 id="contact-form-title" className="sr-only">
            {t("contact.title")}
          </h2>

          {sent ? (
            <div role="status" className="space-y-4">
              <Alert variant="success">
                <CircleCheck className="size-4" aria-hidden="true" />
                <AlertTitle>{t("contact.sent.title")}</AlertTitle>
                <AlertDescription>{t("contact.sent.body", sent)}</AlertDescription>
              </Alert>
              <Button variant="outline" onClick={() => setSent(null)}>
                {t("contact.sent.again")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">{t("contact.form.topic")}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CONTACT_TOPICS.map((value) => (
                    <label
                      key={value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                        topic === value ? "border-primary bg-brand-50 font-medium text-foreground" : "hover:bg-secondary",
                      )}
                    >
                      <input type="radio" value={value} {...register("topic")} className="accent-primary" />
                      {t(`contact.form.topics.${value}`)}
                    </label>
                  ))}
                </div>
                {error("topic") && <p className="text-sm text-danger">{error("topic")}</p>}
              </fieldset>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contact-name">{t("contact.form.name")}</Label>
                  <Input
                    id="contact-name"
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                    aria-describedby="contact-name-msg"
                    {...register("name")}
                  />
                  <p id="contact-name-msg" className="text-xs text-danger">{error("name")}</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-reply">{t("contact.form.reply")}</Label>
                  <Input
                    id="contact-reply"
                    autoComplete="email"
                    inputMode="email"
                    aria-invalid={!!errors.reply}
                    aria-describedby="contact-reply-msg"
                    {...register("reply")}
                  />
                  <p id="contact-reply-msg" className={cn("text-xs", errors.reply ? "text-danger" : "text-muted-foreground")}>
                    {error("reply") ?? t("contact.form.replyHint")}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-message">{t("contact.form.message")}</Label>
                <Textarea
                  id="contact-message"
                  rows={6}
                  aria-invalid={!!errors.message}
                  aria-describedby="contact-message-msg"
                  {...register("message")}
                  onFocus={(e) => {
                    // Started message: write after it, not before.
                    const field = e.currentTarget;
                    if (prefill && field.value === prefill) field.setSelectionRange(prefill.length, prefill.length);
                  }}
                />
                <p id="contact-message-msg" className={cn("text-xs", errors.message ? "text-danger" : "text-muted-foreground")}>
                  {error("message") ??
                    (topic === "CORRECTION" ? t(prefill ? "contact.form.messageHintPage" : "contact.form.messageHint") : "")}
                </p>
              </div>

              {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label>
                  Website
                  <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
                </label>
              </div>
              <input type="hidden" {...register("pageUrl")} />

              {failed && (
                <Alert variant="danger">
                  <CircleAlert className="size-4" aria-hidden="true" />
                  <AlertDescription>{t("contact.form.failed", { email: SITE.contactEmail, whatsapp: WHATSAPP_DISPLAY })}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? t("contact.form.sending") : t("contact.form.submit")}
              </Button>
            </form>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border p-5">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <Send className="size-4 text-brand" aria-hidden="true" />
              {t("contact.aside.emailTitle")}
            </h2>
            <ul className="mt-2 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <a href={`mailto:${SITE.contactEmail}`} className="break-all text-link underline">
                  {SITE.contactEmail}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className="text-link underline">
                  {t("contact.aside.whatsapp", { number: WHATSAPP_DISPLAY })}
                </a>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border p-5">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <Plane className="size-4 text-brand" aria-hidden="true" />
              {t("contact.aside.flightTitle")}
            </h2>
            <p className="mt-2 text-sm text-neutral-700">{t("contact.aside.flightBody")}</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={requestHref()}>{t("contact.aside.flightCta")}</Link>
            </Button>
          </div>
          <div className="rounded-2xl bg-muted p-5">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <TriangleAlert className="size-4 text-brand" aria-hidden="true" />
              {t("contact.aside.correctionTitle")}
            </h2>
            <p className="mt-2 text-sm text-neutral-700">{t("contact.aside.correctionBody")}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
