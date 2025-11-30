'use client'
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Plane } from "lucide-react";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils/cn-utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { AirportCombobox } from "@/components/AirportCombobox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

import React from 'react'


const RequestTicket = () => {
  const { t } = useTranslation();
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
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    travelers: searchParams.get("travelers") ?? "",
    travelClass: searchParams.get("travelClass") ?? "",
    contactMethod: "",
    email: "",
    phone: "",
    isWhatsapp: false,
  };
});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const missingContact =
      formData.contactMethod === "email" ? !formData.email : !formData.phone;

    if (!formData.from || !formData.to || !departureDate || !formData.travelClass || missingContact) {
      toast.error(t("request.form.missingFields", { defaultValue: "Please fill in all required fields" }));
      return;
    }
    if (formData.from == formData.to) {
      toast.error(t("request.form.sameEndpoints", { defaultValue: "Origin and Destination must be different"}))
      return;
    }

    toast.success(t('request.form.successTitle'), {
      description: t('request.form.successMessage')
    }); 
    // Reset form
    setFormData({
      from: "",
      to: "",
      travelers: "1",
      travelClass: "economy",
      contactMethod: "phone",
      email: "",
      phone: "",
      isWhatsapp: true,
    });
    setDepartureDate(undefined);
    setReturnDate(undefined);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 bg-gradient-to-b from-sky-light/20 to-background py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <div className="text-center mb-8 space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Plane className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              {t('request.title')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('request.subtitle')}
            </p>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>{t('request.title')}</CardTitle>
              <CardDescription>
                {t('request.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* From/To */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          {departureDate ? format(departureDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={departureDate}
                          onSelect={setDepartureDate}
                          disabled={(date) => date < new Date()}
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
                          {returnDate ? format(returnDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={returnDate}
                          onSelect={setReturnDate}
                          disabled={(date) => date < (departureDate || new Date())}
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
                    <Select
                      value={formData.travelers}
                      onValueChange={(value) => setFormData({ ...formData, travelers: value })}
                    >
                      <SelectTrigger id="travelers" className="font-medium">
                        <SelectValue placeholder={t('request.form.travelers')} />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                {/* Contact Info */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="space-y-3">
                    <Label className="text-muted-foreground">{t("request.form.preferredContact")}</Label>
                    <RadioGroup
                      value={formData.contactMethod}
                      onValueChange={(value) =>
                        setFormData({ ...formData, contactMethod: value as "email" | "phone" })
                      }
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                      <div className="flex items-center gap-2 rounded-md border border-border p-3">
                        <RadioGroupItem value="email" id="contact-email" />
                        <Label htmlFor="contact-email" className="cursor-pointer">
                          {t("request.form.contactByEmail")}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2 rounded-md border border-border p-3">
                        <RadioGroupItem value="phone" id="contact-phone" />
                        <Label htmlFor="contact-phone" className="cursor-pointer">
                          {t("request.form.contactByPhone")}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {formData.contactMethod === "email" ? (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground" htmlFor="email">{t("request.form.email")} *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t("request.form.emailPlaceholder")}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground" htmlFor="phone">{t("request.form.phone")} *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={t("request.form.phonePlaceholder")}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="isWhatsapp"
                          checked={formData.isWhatsapp}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, isWhatsapp: Boolean(checked) })
                          }
                        />
                        <Label htmlFor="isWhatsapp">{t("request.form.isWhatsapp")}</Label>
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full">
                  {t('request.form.submit')}
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
