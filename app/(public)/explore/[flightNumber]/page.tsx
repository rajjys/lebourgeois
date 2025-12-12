'use client'
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarIcon, ArrowLeft, Clock, MapPin, PlaneLanding, PlaneTakeoff, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils/cn-utils";
import { toast } from "sonner";
import { enUS, fr } from "date-fns/locale";
import { useTranslation } from 'react-i18next';
import Footer from "@/components/Footer";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useFlightPattern } from "@/hooks/useFlightPatterns";
import Image from "next/image";
import { formatDuration, getWeekdayFromDate } from "@/lib/utils/datetime-utils";
import { formatMoney } from "@/lib/utils/money-utils";
import { WEEKDAY_ORDER } from "@/lib/types";

const FlightDetail = () => {
  const { flightNumber } = useParams<{ flightNumber: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  // Find the flight by flightNumber
  const { pattern: flightDetail, isLoading } = useFlightPattern(flightNumber);

  

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    travelers: "1",
    travelClass: "economy",
    contactMethod: "phone" as "phone" | "email",
    email: "",
    phone: "",
    isWhatsapp: true,
  });

  // Update selectedDate whenever flightDetail or dateParam changes
useEffect(() => {
  // Initialize selected date from params or nextDepartureDate
  const setInitialDate = () => {
    if (dateParam) {
      const parsed = new Date(dateParam + "T00:00:00Z");
      if (!isNaN(parsed.getTime())) setSelectedDate(parsed);
    }
    if (flightDetail?.nextDepartureDate) {
      const nextDepartureDate = new Date(flightDetail.nextDepartureDate)
      setSelectedDate(nextDepartureDate);
    }
  };

  setInitialDate();
}, [dateParam, flightDetail]);

  if(isLoading) {
    return (
  <div className="mt-6 space-y-4 animate-pulse min-h-screen pb-20 md:pb-0 container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
    {/* Name */}
    <div className="h-10 bg-gray-200 rounded-xl w-full" />

    {/* Date of Birth */}
    <div className="h-10 bg-gray-200 rounded-xl w-full" />

    {/* Gender */}
    <div className="h-10 bg-gray-200 rounded-xl w-1/2" />

    {/* Contact Section Title */}
    <div className="h-4 bg-gray-200 rounded-lg w-32 mt-4" />

    {/* Phone */}
    <div className="h-10 bg-gray-200 rounded-xl w-full" />

    {/* Email */}
    <div className="h-10 bg-gray-200 rounded-xl w-full" />

    {/* Address Section Title */}
    <div className="h-4 bg-gray-200 rounded-lg w-32 mt-4" />

    {/* Country */}
    <div className="h-10 bg-gray-200 rounded-xl w-full" />

    {/* State + City */}
    <div className="flex gap-4">
      <div className="h-10 bg-gray-200 rounded-xl flex-1" />
      <div className="h-10 bg-gray-2 00 rounded-xl flex-1" />
    </div>

    {/* Street */}
    <div className="h-10 bg-gray-200 rounded-xl w-full" />

    {/* Submit Button */}
    <div className="h-12 bg-gray-300 rounded-xl w-40 mt-4" />
  </div>
)};


  if (!flightDetail && !isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 flex items-center justify-center py-12">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <p className="text-lg text-muted-foreground mb-4">
                {t('explore.detail.notFound')}
              </p>
              <Button asChild variant="outline">
                <Link href="/explore">{t('explore.detail.backToSearch')}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Use selected date or fallback to nextDepartureDate
    const submitDate = selectedDate || (flightDetail?.nextDepartureDate ? new Date(flightDetail.nextDepartureDate) : null);

    // Basic validation similar to /request page
    const missingContact =
      formData.contactMethod === "email" ? !formData.email.trim() : !formData.phone.trim();

    if (!submitDate || !formData.travelClass || missingContact) {
      toast.error(t('explore.detail.missingFields'));
      return;
    }
    // Optionally additional validation could be added (email pattern, phone format)
    toast.success(t('explore.detail.requestSuccessTitle', { defaultValue: 'Request submitted' }), {
      description:
        t('explore.detail.requestSuccessMessage', {
          defaultValue:
            'We received your booking request. Our team will contact you shortly with availability and pricing.'
        })
    });

    // Close dialog and reset form
    setIsBookingDialogOpen(false);
    setFormData({
      name: "",
      travelers: "1",
      travelClass: "economy",
      contactMethod: "phone",
      email: "",
      phone: "",
      isWhatsapp: true,
    });
  };

  const routeTitle = `${flightDetail.origin.city} (${flightDetail.origin.code}) → ${flightDetail.destination.city} (${flightDetail.destination.code})`;
  const selectedWeekday = selectedDate ? getWeekdayFromDate(selectedDate) : null;
  const daysOfWeek = flightDetail.daysOfWeek || [];
  const isFlightAvailableOnSelectedDate = selectedWeekday ? daysOfWeek.includes(selectedWeekday as never) : false;

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-0">
      <div className="flex-1 bg-gradient-to-b from-sky-light/20 to-background pb-12 pt-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Flight Details Card */}
            <div className="md:col-span-3 space-y-6">
              <Card className="shadow-card p-0">
                 {/* Back Button */}
                  <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mt-2 ml-4 pl-2"
                    size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('explore.detail.back')}
                  </Button>
                <CardHeader className="pt-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl md:text-2xl mb-2">{routeTitle}</CardTitle>
                      <CardDescription>
                        {t('explore.detail.flightNumber')}: {flightDetail.flightNumber}
                      </CardDescription>
                    </div>
                    {
                      flightDetail.airline.logo ?
                      <Image 
												src={flightDetail.airline.logo}
												height={80}
												width={80}
												alt={flightDetail.airline.code}
												className="flex h-12 w-12 items-center justify-center rounded-full"
											/>
                        :
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: flightDetail.airline.color|| "#33cc33" }}
                        aria-label={flightDetail.airline.name}
                        title={flightDetail.airline.name}
                      >
                        {flightDetail.airline.code}
                      </div>
                    }
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Flight Info */}
                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 text-orange-700/60" />
                        <span>{t('explore.detail.origin')}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {flightDetail.origin.city}, {flightDetail.origin.country}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {flightDetail.origin.code}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 text-orange-700/60" />
                        <span>{t('explore.detail.destination')}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {flightDetail.destination.city}, {flightDetail.destination.country}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {flightDetail.destination.code}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Date Selector Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <Label>{t('explore.detail.selectDate')} *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP") : <span>{t('explore.detail.pickDate')}</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            locale={i18n.language === "fr" ? fr : { ...enUS, options: { ...enUS.options, weekStartsOn: 1 }}}
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Weekday Availability */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        {t('explore.results.departureDate')}
                      </Label>
                      <div className="flex gap-1 items-center">
                        {WEEKDAY_ORDER.map((day) => {
                          const isActive = daysOfWeek.includes(day);
                          const isSelected = selectedWeekday === day;

                          return (
                            <div
                              key={day}
                              className={cn(
                                "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-medium transition-colors",
                                isActive && !isSelected && "border border-green-300 bg-green-50 text-green-700",
                                isSelected && "border-2 border-orange-500 bg-orange-50 text-orange-700",
                                !isActive && "border border-muted-foreground/30 text-muted-foreground/50"
                              )}
                              title={day}
                            >
                              {t(`explore.results.daysOfWeek.${day.toLowerCase()}`)}
                            </div>
                          );
                        })}
                      </div>
                      {!isFlightAvailableOnSelectedDate && selectedDate && (
                        <p className="text-xs text-orange-600 mt-1">
                          {t('explore.detail.noFlightOnDate')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <PlaneTakeoff className="h-4 w-4" />
                        <span>{t('explore.detail.departure')}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{flightDetail.departureTime}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <PlaneLanding className="h-4 w-4" />
                        <span>{t('explore.detail.arrival')}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{flightDetail.arrivalTime}</p>
                      </div>
                    </div>
                  </div>

                  {/* Flight Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t('explore.detail.duration')}</p>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold text-foreground">
                          {formatDuration(flightDetail.durationInMin)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t('explore.detail.aircraft')}</p>
                      <p className="font-semibold text-foreground">{flightDetail.aircraft}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t('explore.detail.stops')}</p>
                      <p className="font-semibold text-foreground">
                        {flightDetail.stops === 0 ? t('explore.detail.nonStop') : `${flightDetail.stops} ${t('explore.detail.stop')}`}
                      </p>
                    </div>
                  </div>

                  {/* Airline Info */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-1">
                      {t('explore.detail.airline')}
                    </p>
                    <div className="flex items-center gap-2">
                    <Image 
												src={flightDetail.airline.logo}
												height={50}
												width={50}
												alt={flightDetail.airline.code}
												className="flex h-8 w-8 items-center justify-center rounded-full"
											/> 
                    <p className="font-semibold text-foreground">{flightDetail.airline.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Booking Card - Hidden on Mobile */}
            <div className="hidden md:block md:col-span-2">
              <Card className="shadow-card sticky top-24">
                <CardHeader>
                  <CardTitle>{t('explore.detail.bookFlight')}</CardTitle>
                  <CardDescription>
                    {t('explore.detail.selectOptions')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Price Display */}
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">
                        {t('explore.detail.pricePerPerson')}
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {formatMoney(flightDetail.price)}
                      </p>
                    </div>

                    
                    
                    <div className="grid grid-cols-2 gap-2 items-stretch">
                      {/* Travelers */}
                      <div className="space-y-2">
                        <Label htmlFor="travelers">{t('explore.detail.travelers')}</Label>
                        <Select
                          value={formData.travelers}
                          onValueChange={(value) => setFormData({ ...formData, travelers: value })}
                        >
                          <SelectTrigger id="travelers">
                            <SelectValue />
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

                      {/* Travel Class */}
                      <div className="space-y-2">
                        <Label htmlFor="travelClass">{t('explore.detail.class')}</Label>
                        <Select
                          value={formData.travelClass}
                          onValueChange={(value) => setFormData({ ...formData, travelClass: value })}
                          required
                        >
                          <SelectTrigger id="travelClass" className="font-medium">
                            <SelectValue placeholder={t('explore.detail.selectClass')} />
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
                    <div className="space-y-4 pt-2 border-t border-border">

                      <div className="space-y-2">
                        <Label className="text-muted-foreground" htmlFor="email">{t("request.form.name")} *</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder={t("request.form.namePlaceholder")}
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-muted-foreground">{t("request.form.preferredContact")}</Label>
                        <RadioGroup
                          value={formData.contactMethod}
                          onValueChange={(value) =>
                            setFormData({ ...formData, contactMethod: value as "email" | "phone" })
                          }
                          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
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
                      {t('explore.detail.continueBooking')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile CTA */}
      <div className="fixed md:hidden bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg">
        <Button
          onClick={() => setIsBookingDialogOpen(true)}
          variant="hero"
          size="lg"
          className="w-full flex items-center justify-between px-4"
        >
          <div className="flex items-center justify-between font-medium  w-full">
            <span className="">{t('explore.detail.bookFlight')}</span>
            <span className="text-xl">{formatMoney(flightDetail.price)}</span>
          </div>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Booking Dialog - Mobile Only */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto md:hidden">
          <DialogHeader>
            <DialogTitle>{t('explore.detail.bookFlight')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Price Display */}
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                {t('explore.detail.pricePerPerson')}
              </p>
              <p className="text-3xl font-bold text-foreground">
                {formatMoney(flightDetail.price)}
              </p>
            </div>

            {/* Travelers */}
            <div className="space-y-2">
              <Label htmlFor="travelers">{t('explore.detail.travelers')}</Label>
              <Select
                value={formData.travelers}
                onValueChange={(value) => setFormData({ ...formData, travelers: value })}
              >
                <SelectTrigger id="travelers">
                  <SelectValue />
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

            {/* Travel Class */}
            <div className="space-y-2">
              <Label htmlFor="travelClass">{t('explore.detail.class')}</Label>
              <Select
                value={formData.travelClass}
                onValueChange={(value) => setFormData({ ...formData, travelClass: value })}
                required
              >
                <SelectTrigger id="travelClass" className="font-medium">
                  <SelectValue placeholder={t('explore.detail.selectClass')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">{t('request.form.economy')}</SelectItem>
                  <SelectItem value="business">{t('request.form.business')}</SelectItem>
                  <SelectItem value="first">{t('request.form.first')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contact Info */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="space-y-2">
                <Label className="text-muted-foreground" htmlFor="name">{t("request.form.name")} *</Label>
                <Input
                  id="name"
                  type="name"
                  placeholder={t("request.form.namePlaceholder")}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
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
              {t('explore.detail.continueBooking')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlightDetail;
