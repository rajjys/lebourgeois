'use client';

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, Search } from "lucide-react";
import { AirportCombobox, airportCode } from "@/components/AirportCombobox";
import { AirportStatusNotice } from "@/components/search/AirportStatusNotice";
import { Button } from "@/components/ui/button";

/**
 * Origin and destination only. No date: the results show the next days with flights,
 * instead of asking for a date and then saying there is nothing that day.
 * One way only; the swap button is the return trip.
 */
export function HomeSearch() {
  const { t } = useTranslation();
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tried, setTried] = useState(false);

  const fromCode = airportCode(from);
  const toCode = airportCode(to);
  const sameAirport = !!fromCode && fromCode === toCode;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (!fromCode || !toCode || sameAirport) return;
    router.push(`/explore?from=${fromCode}&to=${toCode}`);
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label={t("home.search.label")}
      className="rounded-2xl border bg-card p-3 text-left shadow-popover sm:p-4"
    >
      <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto] md:items-end md:gap-3">
        <AirportCombobox
          id="home-from"
          label={t("home.search.from")}
          placeholder={t("home.search.fromPlaceholder")}
          value={from}
          onChange={setFrom}
          triggerClassName="h-14 py-2"
        />
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
        <AirportCombobox
          id="home-to"
          label={t("home.search.to")}
          placeholder={t("home.search.toPlaceholder")}
          value={to}
          onChange={setTo}
          triggerClassName="h-14 py-2"
        />
        <Button type="submit" size="lg" className="mt-2 h-14 md:mt-0">
          <Search className="size-4" aria-hidden="true" />
          {t("home.search.submit")}
        </Button>
      </div>

      {tried && (!fromCode || !toCode) && (
        <p className="mt-3 text-sm font-medium text-danger" role="status">
          {t("home.search.missing")}
        </p>
      )}
      {sameAirport && (
        <p className="mt-3 text-sm font-medium text-danger" role="status">
          {t("home.search.sameAirport")}
        </p>
      )}
      <AirportStatusNotice codes={[fromCode, toCode]} className="mt-3 space-y-2" />
    </form>
  );
}
