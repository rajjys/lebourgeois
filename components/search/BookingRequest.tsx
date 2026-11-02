'use client';

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleAlert, CircleCheck, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { PriceTag } from "@/components/ds/PriceTag";
import { Stepper } from "@/components/ds/Stepper";
import { createRequest } from "@/services/requests";
import { formatDateShort, formatFlightNumber, shortAirlineName } from "@/lib/format";
import type { FlightPage } from "@/lib/search";
import { isPhoneNumber } from "@/lib/validations/request";
import { cn } from "@/lib/utils/cn-utils";

type TravelClass = "economy" | "business" | "first";
const empty = { name: "", phone: "", travelers: 1, travelClass: "economy" as TravelClass };
type Errors = Partial<Record<"name" | "phone", string>>;

/** "CAA · lun. 9 nov. · 08:00 – 12:30 · BU 1633": which departure the request is for. */
function useSummary(flight: FlightPage) {
  return [
    shortAirlineName(flight.airline.name),
    formatDateShort(new Date(`${flight.date}T00:00:00Z`)),
    `${flight.departureTime} – ${flight.arrivalTime}`,
    flight.flightNumber && formatFlightNumber(flight.flightNumber),
  ]
    .filter(Boolean)
    .join(" · ");
}

function PriceLine({ flight }: { flight: FlightPage }) {
  const { t } = useTranslation();
  if (!flight.price) return <p className="text-sm text-muted-foreground">{t("vols.book.noPrice")}</p>;
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-brand-50 px-4 py-3">
      <span className="text-sm font-medium text-neutral-700">{t("vols.book.price")}</span>
      <PriceTag
        amount={flight.price.amount}
        observedAt={new Date(flight.price.observedAt)}
        kind={flight.price.kind === "FROM_PRICE" ? "from" : "quote"}
        labels={{ from: t("explore.results.from"), observed: t("explore.results.seenOn") }}
        className="items-end text-right"
      />
    </div>
  );
}

/**
 * "Réserver ce vol": a booking request to Clerikaa. We do not send visitors to the airline; our
 * team calls back to confirm the price and book (docs/PLAN.md decision log). A phone number is
 * enough to call back (owner, 2026-11-02): no email, no WhatsApp question.
 *
 * `sheet`: the phone layout, where the fields scroll and the button stays at the bottom.
 */
function BookingForm({ flight, idPrefix, sheet = false, onClose }: { flight: FlightPage; idPrefix: string; sheet?: boolean; onClose?: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [sentTo, setSentTo] = useState("");
  const set = (patch: Partial<typeof empty>) => {
    setForm((f) => ({ ...f, ...patch }));
    // A corrected field loses its message straight away.
    setErrors((e) => ({ ...e, ...("name" in patch ? { name: undefined } : {}), ...("phone" in patch ? { phone: undefined } : {}) }));
  };
  const id = (name: string) => `${idPrefix}-${name}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.trim();
    const next: Errors = {
      name: name.length < 2 ? t("vols.book.nameError") : undefined,
      phone: !isPhoneNumber(phone) ? t("vols.book.phoneError") : undefined,
    };
    if (next.name || next.phone) {
      setErrors(next);
      document.getElementById(id(next.name ? "name" : "phone"))?.focus();
      return;
    }
    setStatus("sending");
    try {
      await createRequest({
        clientName: name,
        clientEmail: null,
        clientPhone: phone,
        // The team calls or writes on WhatsApp, whichever answers (the schema's default).
        prefersWhatsapp: true,
        // Air Congo publishes no numbers: the airline and time tell the team which flight it is.
        flightNumber: flight.flightNumber ?? `${flight.airline.code} ${flight.departureTime}`,
        originCity: flight.origin.city,
        destinationCity: flight.destination.city,
        travelDate: new Date(`${flight.date}T00:00:00Z`),
        travelClass: form.travelClass,
        travelers: form.travelers,
        source: "flight-detail",
      });
      setSentTo(phone);
      setStatus("sent");
      setForm(empty);
    } catch {
      setStatus("failed");
    }
  }

  const body = sheet ? "min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5" : "space-y-5";
  const footer = sheet ? "space-y-3 border-t bg-background px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]" : "space-y-3";

  if (status === "sent") {
    return (
      <div className={cn(sheet && "flex min-h-0 flex-1 flex-col")}>
        <div className={body}>
          <Alert variant="success" role="status">
            <CircleCheck className="size-4" aria-hidden="true" />
            <AlertDescription>
              <span className="block font-semibold text-foreground">{t("vols.book.sentTitle")}</span>
              {t("vols.book.sentBody", { phone: sentTo })}
            </AlertDescription>
          </Alert>
        </div>
        <div className={cn(footer, !sheet && "mt-4")}>
          <Button type="button" variant="outline" className="w-full" onClick={() => setStatus("idle")}>
            {t("vols.book.another")}
          </Button>
          {sheet && onClose && (
            <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
              {t("vols.book.close")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const fieldError = (field: "name" | "phone") =>
    errors[field] && (
      <p id={id(`${field}-error`)} className="flex items-center gap-1.5 text-sm text-danger">
        <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
        {errors[field]}
      </p>
    );

  return (
    <form onSubmit={submit} noValidate className={cn(sheet ? "flex min-h-0 flex-1 flex-col" : "space-y-5")}>
      <div className={body}>
        <PriceLine flight={flight} />

        <div className="divide-y rounded-xl border">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <Label htmlFor={id("travelers")} className="font-medium">
              {t("vols.book.travelers")}
            </Label>
            <Stepper
              id={id("travelers")}
              value={form.travelers}
              onChange={(travelers) => set({ travelers })}
              labels={{ decrease: t("vols.book.removeTraveler"), increase: t("vols.book.addTraveler") }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <Label htmlFor={id("class")} className="font-medium">
              {t("vols.book.class")}
            </Label>
            <Select value={form.travelClass} onValueChange={(v) => set({ travelClass: v as TravelClass })}>
              <SelectTrigger id={id("class")} className="h-10 w-auto min-w-36 gap-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="economy">{t("request.form.economy")}</SelectItem>
                <SelectItem value="business">{t("request.form.business")}</SelectItem>
                <SelectItem value="first">{t("request.form.first")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={id("name")}>{t("vols.book.name")}</Label>
          <Input
            id={id("name")}
            autoComplete="name"
            placeholder={t("vols.book.namePlaceholder")}
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? id("name-error") : undefined}
            className={cn("h-11", errors.name && "border-danger")}
          />
          {fieldError("name")}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={id("phone")}>{t("vols.book.phone")}</Label>
          <Input
            id={id("phone")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t("vols.book.phonePlaceholder")}
            value={form.phone}
            onChange={(e) => set({ phone: e.target.value })}
            aria-invalid={!!errors.phone}
            aria-describedby={[errors.phone && id("phone-error"), id("phone-hint")].filter(Boolean).join(" ")}
            className={cn("h-11 tabular-nums", errors.phone && "border-danger")}
          />
          {fieldError("phone")}
          <p id={id("phone-hint")} className="text-xs text-muted-foreground">
            {t("vols.book.phoneHint")}
          </p>
        </div>

        {status === "failed" && (
          <Alert variant="danger">
            <CircleAlert className="size-4" aria-hidden="true" />
            <AlertDescription>{t("vols.book.failed")}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className={footer}>
        <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={status === "sending"}>
          {status === "sending" ? t("vols.book.sending") : t("vols.book.submit")}
        </Button>
        <p className="flex items-start justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden="true" />
          {t("vols.book.reassurance")}
        </p>
      </div>
    </form>
  );
}

/**
 * Desktop: a card beside the flight. Phones and tablets: a bar fixed at the bottom of the screen
 * that opens the same form as a sheet from the bottom, its button at the bottom edge.
 */
export function BookingRequest({ flight }: { flight: FlightPage }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const summary = useSummary(flight);

  return (
    <>
      <section aria-labelledby="book-title" className="hidden overflow-hidden rounded-2xl border bg-card shadow-card lg:block">
        <header className="border-b px-5 py-4">
          <h2 id="book-title" className="text-lg font-bold">
            {t("vols.book.title")}
          </h2>
          <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">{summary}</p>
        </header>
        <div className="p-5">
          <BookingForm flight={flight} idPrefix="book" />
        </div>
      </section>

      {/* Phones and tablets: the button stays in reach while reading the page. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
        <Button size="lg" className="h-12 w-full text-base" onClick={() => setOpen(true)} aria-haspopup="dialog">
          {t("vols.book.title")}
        </Button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="flex max-h-[92dvh] flex-col gap-0 rounded-t-3xl p-0 lg:hidden">
          <div className="border-b px-5 pb-4 pt-5 pr-12">
            <SheetTitle className="text-lg font-bold">{t("vols.book.title")}</SheetTitle>
            <SheetDescription className="mt-0.5 tabular-nums">{summary}</SheetDescription>
          </div>
          <BookingForm flight={flight} idPrefix="book-mobile" sheet onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
