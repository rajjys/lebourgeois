'use client'
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AirportCombobox } from "@/components/AirportCombobox";
import FlightPatternResultCard from "@/components/FlightPatternResultCard";
import DestinationCard from "@/components/DestinationCard";
import { useTranslation } from 'react-i18next';
import { Plane, ArrowLeftRight, X, CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { cn } from "@/lib/utils/cn-utils";
import { FlightPatternResponse } from "@/lib/validations/flightPattern";

const ExploreFlights = () => {
  const { t, i18n } = useTranslation();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [searchResults, setSearchResults] = useState<FlightPatternResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Extract IATA code from AirportCombobox value
  const extractIata = (value: string): string | null => {
    if (!value) return null;
    const match = value.match(/\(([A-Z]{3})\)/);
    return match ? match[1] : null;
  };

  const fromIata = useMemo(() => extractIata(from), [from]);
  const toIata = useMemo(() => extractIata(to), [to]);
  const canSearch = fromIata && toIata && fromIata !== toIata;

  // Auto-search when both airports are selected and different
  useEffect(() => {
    if (canSearch && fromIata && toIata) {
      performSearch(fromIata, toIata, selectedDate);
    } else {
      setSearchResults([]);
      setHasSearched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromIata, toIata, selectedDate]);

  const performSearch = async (origin: string, destination: string, date?: Date) => {
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const params = new URLSearchParams({
        from: origin,
        to: destination,
      });
      
      if (date) {
        params.append('date', format(date, 'yyyy-MM-dd'));
      }

      const response = await fetch(`/api/flights/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to search flights');
      }
      
      const data = await response.json();
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching flights:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Swap origins/destinations
  const handleSwap = () => {
    const prevFrom = from;
    setFrom(to);
    setTo(prevFrom);
  };

  // Reset search
  const handleReset = () => {
    setFrom("");
    setTo("");
    setSelectedDate(undefined);
    setSearchResults([]);
    setHasSearched(false);
  };

  const destinations = [
    {
      title: t('explore.destinations.paris.title'),
      description: t('explore.destinations.paris.description'),
      image: "/assets/destination-paris.jpg",
      price: t('explore.destinations.paris.price'),
    },
    {
      title: t('explore.destinations.dubai.title'),
      description: t('explore.destinations.dubai.description'),
      image: "/assets/destination-dubai.jpg",
      price: t('explore.destinations.dubai.price'),
    },
    {
      title: t('explore.destinations.newyork.title'),
      description: t('explore.destinations.newyork.description'),
      image: "/assets/destination-newyork.jpg",
      price: t('explore.destinations.newyork.price'),
    },
    {
      title: t('explore.destinations.tokyo.title'),
      description: t('explore.destinations.tokyo.description'),
      image: "/assets/destination-tokyo.jpg",
      price: t('explore.destinations.tokyo.price'),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen mb-4">
      {/* Hero Search Section */}
      <section className={cn(
        "bg-gradient-to-b from-primary/10 via-sky-light/20 to-background transition-all duration-500 ease-in-out",
        hasSearched ? "py-2 md:py-4" : "py-4 md:py-8"
      )}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className={cn(
              "text-center mb-4 transition-all duration-500 ease-in-out",
              hasSearched ? "mb-2 space-y-1" : "mb-4 md:mb-8 space-y-3"
            )}>
              <div className={cn(
                "inline-flex items-center justify-center rounded-full bg-primary/10 mb-4 transition-all duration-500",
                hasSearched ? "w-8 h-8 md:w-10 md:h-10 mb-2" : "w-12 h-12 md:w-16 md:h-16 mb-4"
              )}>
                <Plane className={cn(
                  "text-primary transition-all duration-500",
                  hasSearched ? "h-4 w-4 md:h-5 md:w-5" : "h-6 w-6 md:h-8 md:w-8"
                )} />
              </div>
              <h1 className={cn(
                "font-bold text-foreground transition-all duration-500",
                hasSearched ? "text-lg sm:text-xl md:text-2xl" : "text-2xl sm:text-3xl md:text-4xl"
              )}>
                {t('explore.title')}
              </h1>
              {!hasSearched && (
                <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto transition-all duration-500">
                  {t('explore.subtitle')}
                </p>
              )}
            </div>

            {/* Search Box */}
            <Card className="shadow-card border-border">
              <CardContent className="p-4 md:p-6">
                <div className="space-y-4">
                  {/* This grid handles responsive layout + swap button placement */}
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
                  {/* FROM */}
                  <div className="min-w-0">
                    <AirportCombobox
                      label={t("explore.search.from")}
                      value={from}
                      onChange={setFrom}
                      placeholder={t("explore.search.fromPlaceholder")}
                      id="search-from"
                      required
                    />
                  </div>

                  {/* Swap Button */}
                  <div className="flex justify-center items-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="px-3 rounded-full border-border"
                      onClick={handleSwap}
                      disabled={!from || !to}
                    >
                      <ArrowLeftRight className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* TO */}
                  <div className="min-w-0">
                    <AirportCombobox
                      label={t("explore.search.to")}
                      value={to}
                      onChange={setTo}
                      placeholder={t("explore.search.toPlaceholder")}
                      id="search-to"
                      required
                    />
                  </div>
                </div>


                  {/* Calendar - appears when both airports are set and there are results */}
                  {canSearch && (
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] pt-2 border-t border-border">
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
                            {selectedDate ? (
                              format(selectedDate, "PPP")
                            ) : (
                              <span>{t('explore.results.selectDate')}</span>
                            )}
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
                  )}

                  {/* Reset Button */}
                  {hasSearched && (
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr]">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="flex justify-start">
                          <X className="mr-2 h-4 w-4" />
                          {t('explore.results.reset')}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Results */}
      {hasSearched && (
        <section className="py-4 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">{t('explore.results.loading')}</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                    {searchResults.length === 1
                      ? t('explore.results.title', { count: 1 })
                      : t('explore.results.title_plural', { count: searchResults.length })}
                  </h2>
                </div>
                <div className="space-y-4">
                  {searchResults.map((pattern) => (
                    <FlightPatternResultCard
                      key={pattern.id}
                      pattern={pattern}
                      selectedDate={selectedDate || undefined}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <Card className="border-border bg-card">
                <CardContent className="p-8 text-center">
                  <p className="text-lg text-muted-foreground mb-4">
                    {t('explore.results.noResults')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('explore.results.tryDifferent')}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Popular Destinations */}
      {!hasSearched && (
        <section className="py-12 bg-gradient-to-b from-background to-secondary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {destinations.map((dest, i) => (
                <DestinationCard key={i} {...dest} />
              ))}
            </div>

            <div className="bg-card rounded-xl border border-border p-8 text-center shadow-card max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-3">
                {t('explore.custom.title')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t('explore.custom.description')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/request"
                  className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-card hover:shadow-hover"
                >
                  {t('explore.custom.quote')}
                </a>

                <a
                  href="/contact"
                  className="inline-flex items-center justify-center px-6 py-3 border border-border rounded-lg font-semibold hover:bg-secondary transition-colors"
                >
                  {t('explore.custom.contact')}
                </a>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ExploreFlights;
