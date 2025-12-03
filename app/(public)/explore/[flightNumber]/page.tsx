'use client'
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowLeft, Plane, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils/cn-utils";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import Footer from "@/components/Footer";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useFlightPattern } from "@/hooks/useFlightPatterns";
import Image from "next/image";
import { formatDuration } from "@/lib/utils/datetime-utils";
import { formatMoney } from "@/lib/utils/money-utils";

const FlightDetail = () => {
  const { flightNumber } = useParams<{ flightNumber: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const [departureDate, setDepartureDate] = useState<Date>();
  const [formData, setFormData] = useState({
    travelers: "1",
    travelClass: "economy",
    contactMethod: "phone" as "phone" | "email",
    email: "",
    phone: "",
    isWhatsapp: true,
  });

  // Find the flight by flightNumber
  const { pattern: flightDetail} = useFlightPattern(flightNumber)

  if (!flightDetail) {
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

    // Basic validation similar to /request page
    const missingContact =
      formData.contactMethod === "email" ? !formData.email.trim() : !formData.phone.trim();

    if (!departureDate || !formData.travelClass || missingContact) {
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

    // Reset form (keep departureDate cleared)
    setFormData({
      travelers: "1",
      travelClass: "economy",
      contactMethod: "phone",
      email: "",
      phone: "",
      isWhatsapp: true,
    });
    setDepartureDate(undefined);
  };

  const routeTitle = `${flightDetail.origin.city} (${flightDetail.origin.code}) → ${flightDetail.destination.city} (${flightDetail.destination.code})`;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 bg-gradient-to-b from-sky-light/20 to-background py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('explore.detail.back')}
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Flight Details Card */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-card">
                <CardHeader>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
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
                        <MapPin className="h-4 w-4" />
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

                  {/* Schedule */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Plane className="h-4 w-4" />
                        <span>{t('explore.detail.departure')}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{flightDetail.departureTime}</p>
                        <p className="text-sm text-muted-foreground">
                          {/*format(new Date(flight.departureDate), "PPP")*/}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Plane className="h-4 w-4" />
                        <span>{t('explore.detail.arrival')}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{flightDetail.arrivalTime}</p>
                        <p className="text-sm text-muted-foreground">
                          {/*format(new Date(flightDetail.arrivalDate), "PPP")*/}
                        </p>
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

            {/* Booking Card */}
            <div className="lg:col-span-1">
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

                    {/* Departure Date */}
                    <div className="space-y-2">
                      <Label>{t('explore.detail.selectDate')} *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !departureDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {departureDate ? format(departureDate, "PPP") : <span>{t('explore.detail.pickDate')}</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={departureDate}
                            onSelect={setDepartureDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                      <Label htmlFor="travelClass">{t('explore.detail.class')} *</Label>
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

                    {/* Contact Info (added from /request) */}
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
                      {t('explore.detail.continueBooking')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightDetail;
