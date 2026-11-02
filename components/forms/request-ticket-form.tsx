'use client'
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TYPE } from "@/components/ds/typography";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, Plane } from "lucide-react";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils/cn-utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { AirportCombobox } from "@/components/AirportCombobox";
import { Stepper } from "@/components/ds/Stepper";
import { isPhoneNumber } from "@/lib/validations/request";
import { enUS, fr } from "date-fns/locale";
import React from 'react'
import { createRequest } from "@/services/requests";


const RequestTicket = () => {
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const [departureDate, setDepartureDate] = useState(() => {
    const departureDateParam = searchParams.get("departureDate");
    if (!departureDateParam) return undefined;

    try {
      const date = parse(departureDateParam, "yyyy-MM-dd", new Date());
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  });

  const [returnDate, setReturnDate] = useState(() => {
    const returnDateParam = searchParams.get("returnDate");
    if (!returnDateParam) return undefined;

    try {
      const date = parse(returnDateParam, "yyyy-MM-dd", new Date());
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  });
  const [formData, setFormData] = useState(() => {
  return {
    name: "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    travelers: Math.min(9, Math.max(1, Number(searchParams.get("travelers")) || 1)),
    travelClass: searchParams.get("travelClass") ?? "economy",
    phone: "",
  };
});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // A phone number is enough to call back (owner, 2026-11-02): no email, no WhatsApp question.
    if (!formData.name || !formData.from || !formData.to || !departureDate || !formData.travelClass || !isPhoneNumber(formData.phone)) {
      toast.error(t("request.form.missingFields", { defaultValue: "Please fill in all required fields" }));
      return;
    }
    if (formData.from == formData.to) {
      toast.error(t("request.form.sameEndpoints", { defaultValue: "Origin and Destination must be different"}))
      return;
    }

    setIsSubmitting(true);

    try {
      await createRequest({
        clientName: formData.name,
        clientEmail: null,
        clientPhone: formData.phone.trim(),
        // The team calls or writes on WhatsApp, whichever answers (the schema's default).
        prefersWhatsapp: true,
        flightNumber: "TBD", // To be determined - this is a general request
        originCity: formData.from,
        destinationCity: formData.to,
        travelDate: departureDate,
        travelClass: formData.travelClass as "economy" | "business" | "first",
        travelers: formData.travelers,
        source: "request-form",
      });

      toast.success(t('request.form.successTitle'), {
        description: t('request.form.successMessage')
      });

      // Reset form
      setFormData({
        name: "",
        from: "",
        to: "",
        travelers: 1,
        travelClass: "economy",
        phone: "",
      });
      setDepartureDate(undefined);
      setReturnDate(undefined);
    } catch (error) {
      toast.error(t('request.form.error', { defaultValue: 'Failed to submit request. Please try again.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 bg-gradient-to-b from-brand-50 to-background py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <div className="text-center mb-8 space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Plane className="h-8 w-8 text-primary" />
            </div>
            <h1 className={cn(TYPE.title, "text-foreground")}>
              {t('request.title')}
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              {t('request.subtitle')}
            </p>
          </div>

          <Card className="shadow-card">
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">{t("request.form.name")} *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t("request.form.namePlaceholder")}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                {/* From/To */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <AirportCombobox
                    id="from"
                    label={t("request.form.from")}
                    placeholder={t("request.form.fromPlaceholder")}
                    value={formData.from}
                    onChange={(value) => setFormData({ ...formData, from: value })}
                    required
                  />
                  <AirportCombobox
                    id="to"
                    label={t("request.form.to")}
                    placeholder={t("request.form.toPlaceholder")}
                    value={formData.to}
                    onChange={(value) => setFormData({ ...formData, to: value })}
                    required
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('request.form.departure')} *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-medium",
                            !departureDate && "text-muted-foreground font-normal"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {departureDate ? format(departureDate, "PPP") : 
                            <span>{t('explore.results.selectDate')}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          locale={i18n.language === "fr" ? fr : { ...enUS, options: { ...enUS.options, weekStartsOn: 1 }}}
                          selected={departureDate}
                          onSelect={setDepartureDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('request.form.return')} {t('request.form.returnOptional')}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-medium",
                            !returnDate && "text-muted-foreground font-normal"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {returnDate ? format(returnDate, "PPP") : 
                            <span>{t('explore.results.selectDate')}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          locale={i18n.language === "fr" ? fr : { ...enUS, options: { ...enUS.options, weekStartsOn: 1 }}}
                          selected={returnDate}
                          onSelect={setReturnDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Travelers & Class */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground" htmlFor="travelers">{t('request.form.travelers')}</Label>
                    <div className="flex h-10 items-center">
                      <Stepper
                        id="travelers"
                        value={formData.travelers}
                        onChange={(travelers) => setFormData({ ...formData, travelers })}
                        labels={{ decrease: t("vols.book.removeTraveler"), increase: t("vols.book.addTraveler") }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="travelClass" className="text-muted-foreground">{t('request.form.class')} *</Label>
                    <Select
                      value={formData.travelClass}
                      onValueChange={(value) => setFormData({ ...formData, travelClass: value })}
                      required
                    >
                      <SelectTrigger id="travelClass" className="font-medium">
                        <SelectValue placeholder={t('request.form.class')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economy">{t('request.form.economy')}</SelectItem>
                        <SelectItem value="business">{t('request.form.business')}</SelectItem>
                        <SelectItem value="first">{t('request.form.first')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Contact: a phone number is enough */}
                <div className="space-y-2 border-t border-border pt-4">
                  <Label className="text-muted-foreground" htmlFor="phone">{t("request.form.phone")} *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={t("request.form.phonePlaceholder")}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    aria-describedby="phone-hint"
                    required
                  />
                  <p id="phone-hint" className="text-xs text-muted-foreground">{t("vols.book.phoneHint")}</p>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? t("vols.book.sending") : t('request.form.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RequestTicket;
