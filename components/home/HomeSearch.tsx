'use client';

import { SearchForm } from "@/components/search/SearchForm";
import { SEARCH_ANCHOR } from "@/lib/links";

/**
 * The home's search: origin and destination only. No date: the results show the next days with
 * flights, instead of asking for a date and then saying there is nothing that day.
 * One way only; the swap button is the return trip.
 */
export function HomeSearch() {
  return <SearchForm id={SEARCH_ANCHOR} fieldPrefix="home" surface="hero" />;
}
