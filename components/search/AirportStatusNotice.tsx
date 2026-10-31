'use client';

import { useTranslation } from "react-i18next";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAirports } from "@/hooks/useAirports";
import { formatDayMonthYear } from "@/lib/format";
import type { Airport } from "@/lib/generated/prisma/client";

type StatusFields = Pick<Airport, "code" | "city" | "status" | "statusNote" | "statusSourceUrl"> & {
  statusSince: Date | string | null;
};

/** One airport's closure or restriction, as the public sees it (also the back-office preview). */
export function AirportStatusAlert({ airport: a }: { airport: StatusFields }) {
  const { t } = useTranslation();
  if (a.status === "OPEN") return null;
  return (
    <Alert variant={a.status === "CLOSED" ? "danger" : "warning"} className="text-left">
      <CircleAlert className="size-4" aria-hidden="true" />
      <AlertTitle>
        {t(`airportPicker.notice.${a.status}`, { city: a.city, code: a.code })}
        {a.statusSince && (
          <span className="font-normal text-muted-foreground">
            {" "}
            · {t("airportPicker.notice.since", { date: formatDayMonthYear(new Date(a.statusSince)) })}
          </span>
        )}
      </AlertTitle>
      <AlertDescription>
        {a.statusNote && <p>{a.statusNote}</p>}
        {a.statusSourceUrl && (
          <a href={a.statusSourceUrl} target="_blank" rel="noopener noreferrer" className="text-link underline">
            {t("airportPicker.notice.source")}
          </a>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Warns when a chosen airport is closed or restricted. Shown on selection and again
 * when a search finds nothing, because that is when the reason matters most.
 */
export function AirportStatusNotice({ codes, className }: { codes: (string | null)[]; className?: string }) {
  const { airports } = useAirports();
  if (!Array.isArray(airports)) return null;

  const flagged = codes
    .map((code) => airports.find((a) => a.code === code))
    .filter((a): a is NonNullable<typeof a> => !!a && a.status !== "OPEN");
  if (!flagged.length) return null;

  return (
    <div className={className}>
      {flagged.map((a) => (
        <AirportStatusAlert key={a.code} airport={a} />
      ))}
    </div>
  );
}
