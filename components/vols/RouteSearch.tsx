'use client';

import { SearchForm } from "@/components/search/SearchForm";
import { SEARCH_ANCHOR } from "@/lib/links";

/**
 * Origin, destination, optional date, on /vols and on every route page: the same search card as the
 * home (components/search/SearchForm.tsx), plus the date. Owner, 2026-11-02 (P-17): route pages show
 * the card the home shows. It replaces the one-line summary route pages had on phones (P-16), which
 * only existed because the old form was 430px tall; the card is 237px and leaves the first airline
 * on the first screen.
 */
export function RouteSearch({
  initialFrom = "",
  initialTo = "",
  initialDate = null,
  today,
  flightDates,
  className,
}: {
  initialFrom?: string;
  initialTo?: string;
  initialDate?: string | null;
  today: string;
  /** The page's route's days with a departure: shown in the calendar while the airports are unchanged. */
  flightDates?: string[];
  className?: string;
}) {
  return (
    <SearchForm
      id={SEARCH_ANCHOR}
      fieldPrefix="route"
      initialFrom={initialFrom}
      initialTo={initialTo}
      initialDate={initialDate}
      date={{ today, flightDates }}
      className={className}
    />
  );
}
