'use client'
import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AirportCombobox, airportCode } from "@/components/AirportCombobox";
import { AirportStatusNotice } from "@/components/search/AirportStatusNotice";
import { requestHref, SEARCH_ANCHOR } from "@/lib/links";
import { ResultCard } from "@/components/search/ResultCard";
import { SortTabs } from "@/components/search/SortTabs";
import { useTranslation } from 'react-i18next';
import { Plane, ArrowLeftRight, X, CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { cn } from "@/lib/utils/cn-utils";
import { sortServices, type SortKey } from "@/lib/searchResults";
import { formatDateLong } from "@/lib/format";
import type { SearchResult } from "@/lib/search";

const ExploreFlights = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?from=FIH&to=FBM comes from the home search and from route links (lib/links.ts).
  const [from, setFrom] = useState(() => searchParams.get("from") ?? "");
  const [to, setTo] = useState(() => searchParams.get("to") ?? "");
  // ?date=YYYY-MM-DD keeps a dated search shareable; without it, the next four weeks are shown.
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const d = searchParams.get("date");
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : undefined;
  });
  const [result, setResult] = useState<SearchResult | null>(null);
  const [sort, setSort] = useState<SortKey>("best");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fromIata = useMemo(() => airportCode(from), [from]);
  const toIata = useMemo(() => airportCode(to), [to]);
  const canSearch = fromIata && toIata && fromIata !== toIata;

  // Auto-search when both airports are selected and different
  useEffect(() => {
    if (canSearch && fromIata && toIata) {
      // Keep the URL shareable; the page stays one entry in the history.
      const date = selectedDate ? `&date=${format(selectedDate, "yyyy-MM-dd")}` : "";
      router.replace(`/explore?from=${fromIata}&to=${toIata}${date}`, { scroll: false });
      performSearch(fromIata, toIata, selectedDate);
    } else {
      setResult(null);
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
      
      setResult((await response.json()) as SearchResult);
    } catch (error) {
      console.error('Error searching flights:', error);
      setResult(null);
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
    router.replace("/explore", { scroll: false });
    setFrom("");
    setTo("");
    setSelectedDate(undefined);
    setResult(null);
    setHasSearched(false);
  };

  return (
    <div className="flex flex-col min-h-screen mb-4">
      {/* Hero Search Section */}
      <section className={cn(
        "bg-gradient-to-b from-primary/10 via-brand-50 to-background transition-all duration-500 ease-in-out",
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
            <Card id={SEARCH_ANCHOR} className="shadow-card border-border">
              <CardContent className="p-4 md:p-6">
                {/* One grid for every row, so the date lines up with the origin field (full width on phones). */}
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2">
                  {/* FROM */}
                  <AirportCombobox
                    label={t("explore.search.from")}
                    value={from}
                    onChange={setFrom}
                    placeholder={t("explore.search.fromPlaceholder")}
                    id="search-from"
                    required
                  />

                  {/* Swap Button */}
                  <div className="flex items-center justify-center pt-7">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-border px-3"
                      onClick={handleSwap}
                      disabled={!from || !to}
                      aria-label={t("home.search.swap")}
                    >
                      <ArrowLeftRight className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* TO */}
                  <AirportCombobox
                    label={t("explore.search.to")}
                    value={to}
                    onChange={setTo}
                    placeholder={t("explore.search.toPlaceholder")}
                    id="search-to"
                    required
                  />

                  {/* Date: appears once both airports are set */}
                  {canSearch && (
                    <div className="col-span-3 mt-2 md:col-span-1">
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
                              format(selectedDate, "PPP", { locale: i18n.language === "fr" ? fr : enUS })
                            ) : (
                              <span>{t('explore.results.selectDate')}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="flex flex-col">
                            <Calendar
                              mode="single"
                              locale={i18n.language === "fr" ? fr : { ...enUS, options: { ...enUS.options, weekStartsOn: 1 }}}
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                            {/* Reset Calendar Button */}
                            <Button
                              type="button"
                              variant="ghost"
                              className="mt-2 self-end text-xs"
                              onClick={() => setSelectedDate(undefined)}
                              disabled={!selectedDate}
                            >
                              {t('explore.search.calendar.reset')}
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {/* Reset Button */}
                  {hasSearched && (
                    <div className="col-span-3 md:col-span-1 md:col-start-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="justify-start"
                      >
                        <X className="mr-2 h-4 w-4" />
                        {t('explore.results.reset')}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <AirportStatusNotice codes={[fromIata, toIata]} className="mt-4 space-y-2" />
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
            ) : result && result.services.length > 0 ? (
              <div className="mx-auto max-w-4xl space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="text-lg font-bold text-foreground md:text-xl">
                    {result.services.length === 1
                      ? t('explore.results.title', { count: 1 })
                      : t('explore.results.title_plural', { count: result.services.length })}
                  </h2>
                  <p className="text-sm text-muted-foreground first-letter:uppercase">
                    {result.date
                      ? t('explore.results.onDate', { date: formatDateLong(new Date(`${result.date}T00:00:00Z`)) })
                      : t('explore.results.window')}
                  </p>
                </div>
                <SortTabs services={result.services} value={sort} onChange={setSort} dateChosen={!!result.date} />
                <ul className="space-y-3">
                  {sortServices(result.services, sort).map((service) => (
                    <li key={service.key}>
                      <ResultCard
                        service={service}
                        origin={result.origin.code}
                        destination={result.destination.code}
                        dateChosen={!!result.date}
                      />
                    </li>
                  ))}
                </ul>
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
                  {/* The request form lives here, after the search has failed, not in the navbar. */}
                  <Button variant="outline" className="mt-6" asChild>
                    <Link href={requestHref(fromIata, toIata)}>{t('explore.results.askForHelp')}</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

    </div>
  );
};

// useSearchParams needs a Suspense boundary so the page shell can still be prerendered.
export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreFlights />
    </Suspense>
  );
}
