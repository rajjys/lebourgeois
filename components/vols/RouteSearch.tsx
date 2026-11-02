'use client';

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, ArrowRight, Search } from "lucide-react";
import { AirportCombobox, airportCode } from "@/components/AirportCombobox";
import { AirportStatusNotice } from "@/components/search/AirportStatusNotice";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/vols/DateField";
import { useAirports } from "@/hooks/useAirports";
import { SEARCH_ANCHOR } from "@/lib/links";
import { formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils/cn-utils";

/**
 * Where a search goes: the route page itself, /vols/{origin}-{destination}[?date=], rendered on
 * the server (docs/ROUTE-MODEL.md §7). Until the airport list has loaded, /vols?de=&a= redirects
 * to the same page.
 */
export function useRouteSearch() {
  const router = useRouter();
  const { airports } = useAirports();
  return (fromCode: string, toCode: string, date?: string | null) => {
    const slug = (code: string) => airports?.find((a) => a.code === code)?.slug;
    const from = slug(fromCode);
    const to = slug(toCode);
    const query = date ? `?date=${date}` : "";
    router.push(from && to ? `/vols/${from}-${to}${query}` : `/vols?de=${fromCode}&a=${toCode}${date ? `&date=${date}` : ""}`);
  };
}

/**
 * Origin, destination, optional date. Used on /vols and on every route page.
 * `summary` (route pages): on phones the search already made shows as one line that opens the form,
 * so the airlines stay on the first screen (the full form is about 430px tall there). Wider screens
 * always show the form, on one row.
 */
export function RouteSearch({
  initialFrom = "",
  initialTo = "",
  initialDate = null,
  today,
  flightDates,
  summary,
  className,
}: {
  initialFrom?: string;
  initialTo?: string;
  initialDate?: string | null;
  today: string;
  /** The page's route's days with a departure: shown in the calendar while the airports are unchanged. */
  flightDates?: string[];
  /** The cities of the search shown on the page, for the one-line summary on phones. */
  summary?: { from: string; to: string };
  className?: string;
}) {
  const { t } = useTranslation();
  const go = useRouteSearch();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [date, setDate] = useState(initialDate ?? "");
  const [tried, setTried] = useState(false);
  const [opened, setOpened] = useState(false);
  const collapsed = !!summary && !opened;
  const fromCode = airportCode(from);
  const toCode = airportCode(to);
  const sameAirport = !!fromCode && fromCode === toCode;
  const sameRoute = fromCode === airportCode(initialFrom) && toCode === airportCode(initialTo);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (!fromCode || !toCode || sameAirport) return;
    go(fromCode, toCode, date || null);
  };

  return (
    <div id={SEARCH_ANCHOR} className={className}>
      {collapsed && (
        <button
          type="button"
          // The navbar's search button opens it too (components/Navbar.tsx).
          data-search-expand
          aria-expanded={false}
          aria-controls="route-search-form"
          onClick={() => {
            setOpened(true);
            requestAnimationFrame(() => document.getElementById("route-from")?.focus());
          }}
          className="flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left shadow-card transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
            <Search className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="truncate">{summary.from}</span>
              <ArrowRight className="size-4 shrink-0 text-brand" aria-hidden="true" />
              <span className="sr-only">–</span>
              <span className="truncate">{summary.to}</span>
            </span>
            <span className="block truncate text-sm text-muted-foreground first-letter:uppercase">
              {initialDate ? formatDateShort(new Date(`${initialDate}T00:00:00Z`)) : t("vols.search.anyDate")}
            </span>
          </span>
          <span className="shrink-0 px-1 text-sm font-medium text-link">{t("vols.search.edit")}</span>
        </button>
      )}
      <form
        id="route-search-form"
        onSubmit={submit}
        role="search"
        aria-label={t("home.search.label")}
        className={cn("rounded-2xl border bg-card p-3 shadow-card sm:p-4", collapsed && "max-md:hidden")}
      >
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_12.5rem_auto] md:items-end md:gap-3">
          <AirportCombobox id="route-from" label={t("home.search.from")} placeholder={t("home.search.fromPlaceholder")} value={from} onChange={setFrom} triggerClassName="h-14 py-2" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="justify-self-center rounded-full md:mb-2"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            disabled={!from && !to}
            aria-label={t("home.search.swap")}
          >
            <ArrowLeftRight className="size-4 rotate-90 md:rotate-0" aria-hidden="true" />
          </Button>
          <AirportCombobox id="route-to" label={t("home.search.to")} placeholder={t("home.search.toPlaceholder")} value={to} onChange={setTo} triggerClassName="h-14 py-2" />
          <DateField id="route-date" value={date} onChange={setDate} min={today} flightDates={sameRoute ? flightDates : undefined} describedBy="route-date-hint" />
          <Button type="submit" size="lg" className="mt-2 h-14 md:mt-0">
            <Search className="size-4" aria-hidden="true" />
            {t("vols.search.submit")}
          </Button>
        </div>
        <p id="route-date-hint" className="mt-2 text-xs text-muted-foreground">
          {t("vols.search.dateHint")}
        </p>
        {tried && (!fromCode || !toCode) && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {t("home.search.missing")}
          </p>
        )}
        {tried && sameAirport && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {t("home.search.sameAirport")}
          </p>
        )}
        <AirportStatusNotice codes={[fromCode, toCode]} className="mt-3 space-y-2" />
      </form>
    </div>
  );
}
