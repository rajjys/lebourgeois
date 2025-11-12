'use client'
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowLeft, Plane, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { popularRoutes } from "@/data/data";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";


const FlightDetail = () => {
  const { flightNumber } = useParams<{ flightNumber: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  
  const [departureDate, setDepartureDate] = useState<Date>();
  const [travelers, setTravelers] = useState("1");
  const [travelClass, setTravelClass] = useState("");

  // Find the flight by flightNumber
  const flight = popularRoutes.find(
    (route) => route.flightNumber === decodeURIComponent(flightNumber || "")
  );

  if (!flight) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
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
    
    if (!departureDate || !travelClass) {
      toast.error(t('explore.detail.missingFields'));
      return;
    }

    // Navigate to request page with pre-filled data
    const params = new URLSearchParams({
      flightNumber: flight.flightNumber,
      from: `${flight.origin.city} (${flight.origin.iataCode})`,
      to: `${flight.destination.city} (${flight.destination.iataCode})`,
      travelers,
      travelClass,
      departureDate: format(departureDate, "yyyy-MM-dd"),
    });

    router.push(`/request?${params.toString()}`);
  };

  function formatMoney(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    }
    return `${mins}m`;
  }

  const routeTitle = `${flight.origin.city} (${flight.origin.iataCode}) → ${flight.destination.city} (${flight.destination.iataCode})`;

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
                        {t('explore.detail.flightNumber')}: {flight.flightNumber}
                      </CardDescription>
                    </div>
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: flight.airline.color }}
                      aria-label={flight.airline.name}
                      title={flight.airline.name}
                    >
                      {flight.airline.code}
                    </div>
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
                          {flight.origin.city}, {flight.origin.country}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {flight.origin.iataCode}
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
                          {flight.destination.city}, {flight.destination.country}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {flight.destination.iataCode}
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
                        <p className="font-semibold text-foreground">{flight.ata}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(flight.departureDate), "PPP")}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Plane className="h-4 w-4" />
                        <span>{t('explore.detail.arrival')}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{flight.eta}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(flight.arrivalDate), "PPP")}
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
                          {formatDuration(flight.duration)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t('explore.detail.aircraft')}</p>
                      <p className="font-semibold text-foreground">{flight.airPlane}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t('explore.detail.stops')}</p>
                      <p className="font-semibold text-foreground">
                        {flight.stops === 0 ? t('explore.detail.nonStop') : `${flight.stops} ${t('explore.detail.stop')}`}
                      </p>
                    </div>
                  </div>

                  {/* Airline Info */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-1">
                      {t('explore.detail.airline')}
                    </p>
                    <p className="font-semibold text-foreground">{flight.airline.name}</p>
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
                        {formatMoney(flight.price)}
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
                        value={travelers}
                        onValueChange={setTravelers}
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
                        value={travelClass}
                        onValueChange={setTravelClass}
                        required
                      >
                        <SelectTrigger id="travelClass">
                          <SelectValue placeholder={t('explore.detail.selectClass')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="economy">{t('request.form.economy')}</SelectItem>
                          <SelectItem value="business">{t('request.form.business')}</SelectItem>
                          <SelectItem value="first">{t('request.form.first')}</SelectItem>
                        </SelectContent>
                      </Select>
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

