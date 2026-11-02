'use client';

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowUpDown, PlaneLanding, PlaneTakeoff, Search } from "lucide-react";
import { AirportCombobox, airportCode } from "@/components/AirportCombobox";
import { AirportStatusNotice } from "@/components/search/AirportStatusNotice";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/vols/DateField";
import { useAirports } from "@/hooks/useAirports";
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
 * The flight search card (docs/DESIGN-SYSTEM.md, search card; P-17, owner 2026-11-02, after
 * Skyscanner's compact form). One card: each field is a row with an icon and its label inside, the
 * swap button sits on the line between departure and arrival, the button closes the card. Phones
 * stack the rows (about 180px without the date, 235px with it), and so do tablets; from 1024px it
 * is one row (at 768px the cities did not fit beside the date).
 * Choosing the departure opens the arrival list straight away, on the arrival already chosen if any.
 * No date on the home (results show the next days with flights); route searches add an optional one.
 */
export function SearchForm({
  id,
  fieldPrefix,
  initialFrom = "",
  initialTo = "",
  initialDate = null,
  date,
  surface = "page",
  className,
}: {
  id?: string;
  /** Prefix of the fields' ids: "home" gives home-from, home-to. */
  fieldPrefix: string;
  initialFrom?: string;
  initialTo?: string;
  initialDate?: string | null;
  /** Shows the date row. `flightDates`: the page's route's days with a departure, dotted in the calendar while the airports are unchanged. */
  date?: { today: string; flightDates?: string[] };
  /** "hero": on the pink home surface, lifted by a shadow; "page": on white, with a border. */
  surface?: "hero" | "page";
  className?: string;
}) {
  const { t } = useTranslation();
  const go = useRouteSearch();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [day, setDay] = useState(initialDate ?? "");
  const [toOpen, setToOpen] = useState(false);
  const [tried, setTried] = useState(false);

  const fromCode = airportCode(from);
  const toCode = airportCode(to);
  const sameAirport = !!fromCode && fromCode === toCode;
  const sameRoute = fromCode === airportCode(initialFrom) && toCode === airportCode(initialTo);
  const hintId = `${fieldPrefix}-date-hint`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (!fromCode || !toCode || sameAirport) return;
    go(fromCode, toCode, day || null);
  };

  return (
    <form
      id={id}
      onSubmit={submit}
      role="search"
      aria-label={t("home.search.label")}
      className={cn(
        "overflow-hidden rounded-2xl bg-card text-left",
        surface === "hero" ? "shadow-popover" : "border shadow-card",
        className,
      )}
    >
      <div className="lg:flex lg:items-stretch">
        <div className="divide-y lg:flex lg:min-w-0 lg:flex-1 lg:divide-x lg:divide-y-0">
          <div className="relative lg:min-w-0 lg:flex-1">
            <AirportCombobox
              variant="segment"
              icon={PlaneTakeoff}
              id={`${fieldPrefix}-from`}
              label={t("home.search.from")}
              placeholder={t("home.search.fromPlaceholder")}
              value={from}
              onChange={setFrom}
              // Next step: the arrival list. Picking the arrival city as departure clears the arrival.
              onPick={(code) => {
                if (code === toCode) setTo("");
                setToOpen(true);
              }}
              triggerClassName="pr-14 lg:pr-8"
            />
            <button
              type="button"
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
              disabled={!from && !to}
              aria-label={t("home.search.swap")}
              className="absolute bottom-0 right-4 z-10 inline-flex size-9 translate-y-1/2 items-center justify-center rounded-full border bg-card text-foreground shadow-card transition-colors hover:border-primary hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-neutral-400 disabled:hover:border-border disabled:hover:text-neutral-400 lg:bottom-auto lg:right-0 lg:top-1/2 lg:translate-x-1/2 lg:-translate-y-1/2"
            >
              <ArrowUpDown className="size-4 lg:rotate-90" aria-hidden="true" />
            </button>
          </div>
          {/* lg:pl-5 keeps the arrival's icon clear of the swap button sitting on the line. */}
          <div className="lg:min-w-0 lg:flex-1 lg:pl-5">
            <AirportCombobox
              variant="segment"
              icon={PlaneLanding}
              id={`${fieldPrefix}-to`}
              label={t("home.search.to")}
              placeholder={t("home.search.toPlaceholder")}
              value={to}
              onChange={setTo}
              open={toOpen}
              onOpenChange={setToOpen}
              exclude={fromCode}
              triggerClassName="pr-14 lg:pr-4"
            />
          </div>
          {date && (
            <div className="lg:w-52 lg:shrink-0">
              <DateField
                id={`${fieldPrefix}-date`}
                value={day}
                onChange={setDay}
                min={date.today}
                flightDates={sameRoute ? date.flightDates : undefined}
                describedBy={hintId}
              />
            </div>
          )}
        </div>
        <div className="border-t p-2 lg:border-t-0">
          <Button type="submit" size="lg" className="h-12 w-full lg:px-6">
            <Search className="size-4" aria-hidden="true" />
            {t(date ? "vols.search.submit" : "home.search.submit")}
          </Button>
        </div>
      </div>

      {date && (
        // "Toutes les dates" says it on phones; the sentence stays for screen readers.
        <p id={hintId} className="px-4 pb-3 text-xs text-muted-foreground max-md:sr-only">
          {t("vols.search.dateHint")}
        </p>
      )}
      {tried && (!fromCode || !toCode) && (
        <p role="alert" className="px-4 pb-3 text-sm font-medium text-danger">
          {t("home.search.missing")}
        </p>
      )}
      {sameAirport && (
        <p role="alert" className="px-4 pb-3 text-sm font-medium text-danger">
          {t("home.search.sameAirport")}
        </p>
      )}
      <AirportStatusNotice codes={[fromCode, toCode]} className="space-y-2 px-2 pb-2" />
    </form>
  );
}
