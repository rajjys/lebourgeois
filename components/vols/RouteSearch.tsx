'use client';

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, Search, X } from "lucide-react";
import { AirportCombobox, airportCode } from "@/components/AirportCombobox";
import { AirportStatusNotice } from "@/components/search/AirportStatusNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAirports } from "@/hooks/useAirports";
import { SEARCH_ANCHOR } from "@/lib/links";
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

/** Origin, destination, optional date. Used on /vols and on every route page. */
export function RouteSearch({
  initialFrom = "",
  initialTo = "",
  initialDate = null,
  today,
  className,
}: {
  initialFrom?: string;
  initialTo?: string;
  initialDate?: string | null;
  today: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const go = useRouteSearch();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [date, setDate] = useState(initialDate ?? "");
  const [tried, setTried] = useState(false);
  const fromCode = airportCode(from);
  const toCode = airportCode(to);
  const sameAirport = !!fromCode && fromCode === toCode;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (!fromCode || !toCode || sameAirport) return;
    go(fromCode, toCode, date || null);
  };

  return (
    <form
      id={SEARCH_ANCHOR}
      onSubmit={submit}
      role="search"
      aria-label={t("home.search.label")}
      className={cn("rounded-2xl border bg-card p-3 shadow-card sm:p-4", className)}
    >
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_11rem_auto] md:items-end md:gap-3">
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
        <div className="space-y-2">
          <Label htmlFor="route-date" className="text-sm font-medium text-muted-foreground">
            {t("vols.search.date")}
          </Label>
          <div className="relative">
            <Input id="route-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="h-14 pr-9" aria-describedby="route-date-hint" />
            {date && (
              <button type="button" onClick={() => setDate("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label={t("vols.search.clearDate")}>
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
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
  );
}
