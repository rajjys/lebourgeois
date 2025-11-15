'use client'
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AirportCombobox } from "@/components/AirportCombobox";
import FlightResultCard from "@/components/FlightResultCard";
import DestinationCard from "@/components/DestinationCard";
import { useTranslation } from 'react-i18next';
import { Search, Plane, ArrowUpDown, ArrowLeftRight } from "lucide-react";
import { popularRoutes } from "@/data/data";

const ExploreFlights = () => {
  const { t } = useTranslation();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Swap origins/destinations
  const handleSwap = () => {
    const prevFrom = from;
    setFrom(to);
    setTo(prevFrom);
  };

  // Extract IATA code from AirportCombobox value
  const extractIata = (value: string): string | null => {
    if (!value) return null;
    const match = value.match(/\(([A-Z]{3})\)/);
    return match ? match[1] : null;
  };

  // Search logic: match origin & destination IATA
  const searchResults = useMemo(() => {
    const fromIata = extractIata(from);
    const toIata = extractIata(to);
    if (!fromIata || !toIata) return [];
    return popularRoutes.filter(
      (route) =>
        route.origin.iataCode === fromIata &&
        route.destination.iataCode === toIata
    );
  }, [from, to]);

  // Best price flight
  const bestFlight = useMemo(() => {
    if (searchResults.length === 0) return null;
    return searchResults.reduce((best, current) =>
      current.price < best.price ? current : best
    );
  }, [searchResults]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to) return;
    setHasSearched(true);
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
      <section className="bg-gradient-to-b from-primary/10 via-sky-light/20 to-background py-4 md:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">

            <div className="text-center mb-4 md:mb-8 space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 mb-4">
                <Plane className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                {t('explore.title')}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('explore.subtitle')}
              </p>
            </div>

            {/* Search Box */}
            <Card className="shadow-card border-border">
              <CardContent className="p-4 md:p-6">
                <form onSubmit={handleSearch} className="space-y-4">

                  {/* This grid handles responsive layout + swap button placement */}
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">

                    {/* FROM */}
                    <AirportCombobox
                      label={t('explore.search.from')}
                      value={from}
                      onChange={setFrom}
                      placeholder={t('explore.search.fromPlaceholder')}
                      id="search-from"
                      required
                    />

                    {/* Swap Button → responsive icon */}
                    <div className="flex justify-center md:h-full md:items-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="px-3 rounded-full border-border"
                        onClick={handleSwap}
                      >
                        {/* Below md: vertical arrows // md+: horizontal arrows */}
                        <span className="md:hidden">
                          <ArrowUpDown className="h-5 w-5" />
                        </span>
                        <span className="hidden md:inline">
                          <ArrowLeftRight className="h-5 w-5" />
                        </span>
                      </Button>
                    </div>

                    {/* TO */}
                    <AirportCombobox
                      label={t('explore.search.to')}
                      value={to}
                      onChange={setTo}
                      placeholder={t('explore.search.toPlaceholder')}
                      id="search-to"
                      required
                    />

                  </div>

                  {/* Search Button */}
                  <Button
                    type="submit"
                    variant="hero"
                    size="lg"
                    className="w-full"
                    disabled={!from || !to}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    {t('explore.search.button')}
                  </Button>

                </form>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>

      {/* Results */}
      {hasSearched && (
        <section className="py-4 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">

            {searchResults.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                    {searchResults.length === 1
                      ? t('explore.results.title', { count: 1 })
                      : t('explore.results.title_plural', { count: searchResults.length })}
                  </h2>
                  {bestFlight && (
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {t('explore.results.bestPrice')}
                    </p>
                  )}
                </div>
                <div className="space-y-4">
                  {searchResults.map((route) => (
                    <FlightResultCard key={route.flightNumber} route={route} />
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
