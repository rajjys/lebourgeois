'use client';

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils/cn-utils";
import { formatDuration, formatTime, getWeekdayFromDate } from "@/lib/utils/datetime-utils";
import { PriceTag } from "@/components/ds/PriceTag";
import { formatDate } from "@/lib/utils/format-date-utils";
import { AirlineMark } from "@/components/ds/AirlineMark";
import { FlightPatternResponse } from "@/lib/validations/flightPattern";
import { format } from "date-fns";
import { WEEKDAY_ORDER } from "@/lib/types";

type FlightPatternResultCardProps = {
  pattern: FlightPatternResponse;
  selectedDate?: Date | null;
};

export default function FlightPatternResultCard({ pattern, selectedDate }: FlightPatternResultCardProps) {
  const { t } = useTranslation();
  const routeTitle = `${pattern.origin.city} (${pattern.origin.code}) → ${pattern.destination.city} (${pattern.destination.code})`;
  
  const selectedWeekday = selectedDate ? getWeekdayFromDate(selectedDate) : 
                          pattern.nextDepartureDate ? getWeekdayFromDate(new Date(pattern.nextDepartureDate)) : null;
  const daysOfWeek = pattern.daysOfWeek || [];

const link = `/explore/${encodeURIComponent(pattern.id)}${selectedDate ? `?date=${format(selectedDate, "yyyy-MM-dd")}` : ""}`;

  return (
    <Link href={link} className="block">
      <Card className="hover:shadow-hover transition-all duration-300 border-border bg-card">
        <CardHeader className="py-0">
          <h3 className="text-base md:text-lg font-semibold text-foreground truncate pt-1 text-center">{routeTitle}</h3>
        </CardHeader>
        <CardContent className="pb-2 px-2 sm:px-6 md:px-8">
            <div className="flex gap-2 justify-between py-1">
              {/* Main Flight Info */}
              <div className="flex flex-row items-center justify-start gap-4 flex-nowrap">
                {/* Route Details */}
                <div className="min-w-0 flex-1">
                  {/* No logos until airlines agree (docs/DESIGN-SYSTEM.md); the code and name identify them. */}
                  <div className="mb-1 flex flex-wrap items-center gap-x-2">
                    <AirlineMark code={pattern.airline.code} name={pattern.airline.name} />
                    {pattern.flightNumber && <span className="text-xs text-muted-foreground">{pattern.flightNumber}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(pattern.durationInMin || 0)}</span>
                    </div>
                    <span className="hidden sm:inline">•</span>
                    <span>{formatTime(pattern.departureTime)} — {formatTime(pattern.arrivalTime)}</span>
                    {pattern.aircraft && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{pattern.aircraft}</span>
                      </>
                    )}
                    {pattern.stops != null && pattern.stops > 0 && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{pattern.stops} stop{pattern.stops > 1 ? "s" : ""}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Next Departure Date */}
                  {selectedDate ? 
                    <div className="mt-2 text-xs text-muted-foreground">
                      {t('explore.results.selectedDate')}: <span className="font-medium">{formatDate(selectedDate.toISOString())}</span>
                    </div>
                      :
                    pattern.nextDepartureDate && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {t('explore.results.nextDeparture')}: <span className="font-medium">{formatDate(pattern.nextDepartureDate)}</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Price & CTA */}
              <div className="flex items-end justify-end sm:flex-col sm:gap-2 grow">
                {/* A price always carries the date it was seen; the last edit stands in until RW-1 dates each fare. */}
                {pattern.price != null && (pattern.verifiedAt ?? pattern.updatedAt) && (
                  <PriceTag
                    amount={pattern.price}
                    observedAt={new Date((pattern.verifiedAt ?? pattern.updatedAt)!)}
                    className="text-right"
                  />
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-sm font-medium hidden sm:inline">{t('explore.results.details')}</span>
                  <ArrowRight className="h-4 w-4 hidden sm:inline" />
                </div>
              </div>
            </div>
            {/* Days of Week Indicator */}
            {daysOfWeek.length > 0 && (
              <div className="flex flex-col pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground mb-1 hidden">
                  {t('explore.results.departureDate')}:
                </div>
                <div className="flex gap-2 items-center">
                  {WEEKDAY_ORDER.map((day) => {
                    const isActive = daysOfWeek.includes(day);
                    const isSelected = selectedWeekday === day;
                    
                    return (
                      <div
                        key={day}
                        className={cn(
                          "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                          isActive && !isSelected && "border border-green-300 bg-green-50 text-muted-foreground/80",
                          isSelected && "border-2 border-amber-500 bg-amber-50 text-amber-700",
                          !isActive && "border border-muted-foreground/30 text-muted-foreground/50"
                        )}
                        title={day}
                      >
                        {t(`explore.results.daysOfWeek.${day.toLowerCase()}`)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    </Link>
  );
}

