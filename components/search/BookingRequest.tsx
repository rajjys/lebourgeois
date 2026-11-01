'use client';

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, CircleAlert, CircleCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PriceTag } from "@/components/ds/PriceTag";
import { createRequest } from "@/services/requests";
import { formatDateShort, formatPrice } from "@/lib/format";
import type { FlightPage } from "@/lib/search";
import { cn } from "@/lib/utils/cn-utils";

const empty = { name: "", travelers: "1", travelClass: "economy", contactMethod: "phone" as "phone" | "email", email: "", phone: "", isWhatsapp: true };

/**
 * "Réserver ce vol": a booking request to Clerikaa, as before P-13. We do not send visitors to the
 * airline; our team calls back to confirm the price and book (docs/PLAN.md decision log).
 */
function BookingForm({ flight, idPrefix, onSent }: { flight: FlightPage; idPrefix: string; onSent?: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed" | "missing">("idle");
  const set = (patch: Partial<typeof empty>) => setForm((f) => ({ ...f, ...patch }));
  const id = (name: string) => `${idPrefix}-${name}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const contact = form.contactMethod === "email" ? form.email.trim() : form.phone.trim();
    if (!form.name.trim() || !contact) return setStatus("missing");
    setStatus("sending");
    try {
      await createRequest({
        clientName: form.name.trim(),
        clientEmail: form.contactMethod === "email" ? form.email.trim() : null,
        clientPhone: form.contactMethod === "phone" ? form.phone.trim() : null,
        prefersWhatsapp: form.contactMethod === "phone" && form.isWhatsapp,
        // Air Congo publishes no numbers: the airline and time tell the team which flight it is.
        flightNumber: flight.flightNumber ?? `${flight.airline.code} ${flight.departureTime}`,
        originCity: flight.origin.city,
        destinationCity: flight.destination.city,
        travelDate: new Date(`${flight.date}T00:00:00Z`),
        travelClass: form.travelClass as "economy" | "business" | "first",
        travelers: Number(form.travelers),
        source: "flight-detail",
      });
      setStatus("sent");
      setForm(empty);
      onSent?.();
    } catch {
      setStatus("failed");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="space-y-3">
        <Alert variant="success">
          <CircleCheck className="size-4" aria-hidden="true" />
          <AlertTitle>{t("explore.detail.requestSuccessTitle")}</AlertTitle>
          <AlertDescription>{t("explore.detail.requestSuccessMessage")}</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" size="sm" onClick={() => setStatus("idle")}>
          {t("explore.detail.newRequest")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={id("travelers")}>{t("explore.detail.travelers")}</Label>
          <Select value={form.travelers} onValueChange={(travelers) => set({ travelers })}>
            <SelectTrigger id={id("travelers")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("class")}>{t("explore.detail.class")}</Label>
          <Select value={form.travelClass} onValueChange={(travelClass) => set({ travelClass })}>
            <SelectTrigger id={id("class")}>
              <SelectValue placeholder={t("explore.detail.selectClass")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="economy">{t("request.form.economy")}</SelectItem>
              <SelectItem value="business">{t("request.form.business")}</SelectItem>
              <SelectItem value="first">{t("request.form.first")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5 border-t pt-4">
        <Label htmlFor={id("name")}>{t("request.form.name")} *</Label>
        <Input id={id("name")} autoComplete="name" placeholder={t("request.form.namePlaceholder")} value={form.name} onChange={(e) => set({ name: e.target.value })} />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("request.form.preferredContact")}</legend>
        <RadioGroup value={form.contactMethod} onValueChange={(v) => set({ contactMethod: v as "phone" | "email" })} className="grid grid-cols-2 gap-2">
          {(["phone", "email"] as const).map((method) => (
            <Label
              key={method}
              htmlFor={id(`contact-${method}`)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border p-3 font-normal",
                form.contactMethod === method && "border-primary bg-brand-50",
              )}
            >
              <RadioGroupItem value={method} id={id(`contact-${method}`)} />
              {t(method === "phone" ? "request.form.contactByPhone" : "request.form.contactByEmail")}
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

      {form.contactMethod === "phone" ? (
        <div className="space-y-2">
          <Label htmlFor={id("phone")}>{t("request.form.phone")} *</Label>
          <Input id={id("phone")} type="tel" autoComplete="tel" placeholder={t("request.form.phonePlaceholder")} value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.isWhatsapp} onCheckedChange={(v) => set({ isWhatsapp: v === true })} />
            {t("request.form.isWhatsapp")}
          </label>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor={id("email")}>{t("request.form.email")} *</Label>
          <Input id={id("email")} type="email" autoComplete="email" placeholder={t("request.form.emailPlaceholder")} value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </div>
      )}

      {(status === "missing" || status === "failed") && (
        <Alert variant="danger">
          <CircleAlert className="size-4" aria-hidden="true" />
          <AlertDescription>{t(status === "missing" ? "explore.detail.missingContact" : "explore.detail.requestFailed")}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={status === "sending"}>
        {status === "sending" ? t("explore.detail.sending") : t("explore.detail.continueBooking")}
      </Button>
    </form>
  );
}

function PriceBlock({ flight }: { flight: FlightPage }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg bg-brand-50 p-4">
      <p className="mb-1 text-sm text-muted-foreground">{t("explore.detail.price")}</p>
      {flight.price ? (
        <PriceTag
          amount={flight.price.amount}
          observedAt={new Date(flight.price.observedAt)}
          kind={flight.price.kind === "FROM_PRICE" ? "from" : "quote"}
          size="lg"
          labels={{ from: t("explore.results.from"), observed: t("explore.results.seenOn") }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t("explore.detail.noPrice")}</p>
      )}
    </div>
  );
}

/** Desktop: a card beside the flight. Phones: a bar fixed at the bottom that opens the same form. */
export function BookingRequest({ flight }: { flight: FlightPage }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const when = t("explore.detail.bookingFor", { date: formatDateShort(new Date(`${flight.date}T00:00:00Z`)) });

  return (
    <>
      <section aria-labelledby="book-title" className="hidden rounded-2xl border bg-card p-5 shadow-card lg:block">
        <h2 id="book-title" className="text-lg font-semibold">
          {t("explore.detail.bookFlight")}
        </h2>
        <p className="mt-1 text-sm font-medium text-foreground">{when}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("explore.detail.bookIntro")}</p>
        <div className="mt-4 space-y-4">
          <PriceBlock flight={flight} />
          <BookingForm flight={flight} idPrefix="book" />
        </div>
      </section>

      {/* Phones and tablets: the button stays in reach while reading the page. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 shadow-lg backdrop-blur lg:hidden">
        <Button size="lg" className="w-full justify-between" onClick={() => setOpen(true)}>
          <span>{t("explore.detail.bookFlight")}</span>
          <span className="flex items-center gap-1 tabular-nums">
            {flight.price && `${t("explore.results.from")} ${formatPrice(flight.price.amount)}`}
            <ChevronRight className="size-5" aria-hidden="true" />
          </span>
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto lg:hidden">
          <DialogHeader>
            <DialogTitle>{t("explore.detail.bookFlight")}</DialogTitle>
            <DialogDescription>
              <span className="block font-medium text-foreground">{when}</span>
              {t("explore.detail.bookIntro")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <PriceBlock flight={flight} />
            <BookingForm flight={flight} idPrefix="book-mobile" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
