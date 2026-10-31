'use client';

import { Copy } from "lucide-react";
import type { WorkspaceAirline, WorkspaceData, WorkspaceFlight } from "@/lib/routeBoard";
import { addDays } from "@/lib/schedule";
import { formatDayMonth } from "@/lib/format";
import { cn } from "@/lib/utils/cn-utils";

const HEAD = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const dm = (d: string) => formatDayMonth(new Date(`${d}T00:00:00Z`));

/** "1611" when the number carries the airline's own code, "ET60" otherwise, "—" without a number. */
export const shortNumber = (airlineCode: string, n: string | null) => (!n ? "—" : n.startsWith(airlineCode) ? n.slice(airlineCode.length) : n);

function FlightLine({ airline, f }: { airline: string; f: WorkspaceFlight }) {
  const cancelled = f.status === "CANCELLED";
  return (
    <span
      className={cn(
        "flex items-baseline justify-between gap-1 rounded px-1 text-xs leading-5",
        cancelled ? "text-muted-foreground line-through" : "bg-brand-50 text-foreground",
        f.reviewStatus === "PENDING" && "border border-dashed border-warning",
      )}
    >
      <span className="font-mono font-semibold">{shortNumber(airline, f.flightNumber)}</span>
      <span>
        {f.departureTime}
        {f.via.length > 0 && <sup className="ml-0.5 text-[0.65rem] text-muted-foreground">{f.via.length} esc.</sup>}
      </span>
    </span>
  );
}

/**
 * Eight weeks, Monday first. Each day is a button that opens the day editor; each week can be copied.
 * What is stored is what is shown: no pattern is inferred.
 */
export function ScheduleCalendar({
  airline,
  workspace,
  onDay,
  onCopyWeek,
}: {
  airline: WorkspaceAirline;
  workspace: WorkspaceData;
  onDay: (date: string) => void;
  onCopyWeek: (weekStart: string) => void;
}) {
  const weeks = Array.from({ length: workspace.weeks }, (_, i) => addDays(workspace.start, 7 * i));
  const byDate = new Map<string, WorkspaceFlight[]>();
  for (const f of airline.flights) byDate.set(f.date, [...(byDate.get(f.date) ?? []), f]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] table-fixed border-collapse text-sm">
        <caption className="sr-only">Vols de {airline.name}, semaine par semaine</caption>
        <thead>
          <tr>
            <th scope="col" className="w-24 pb-2 text-left text-xs font-medium text-muted-foreground">
              Semaine
            </th>
            {HEAD.map((d) => (
              <th key={d} scope="col" className="pb-2 text-left text-xs font-medium text-muted-foreground">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => {
            const scheduled = airline.flights.filter((f) => f.status === "SCHEDULED" && f.date >= week && f.date <= addDays(week, 6)).length;
            return (
              <tr key={week} className="border-t">
                <th scope="row" className="py-1.5 pr-2 text-left align-top text-xs font-normal text-muted-foreground">
                  <span className="block">{dm(week)}</span>
                  <span className="block">{scheduled} vol{scheduled > 1 ? "s" : ""}</span>
                  {scheduled > 0 && (
                    <button
                      type="button"
                      onClick={() => onCopyWeek(week)}
                      className="mt-1 inline-flex items-center gap-1 text-link hover:underline"
                      aria-label={`Copier la semaine du ${dm(week)}`}
                    >
                      <Copy className="size-3" aria-hidden="true" /> copier
                    </button>
                  )}
                </th>
                {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map((date) => {
                  const flights = byDate.get(date) ?? [];
                  const isToday = date === workspace.today;
                  const past = date < workspace.today;
                  const label = `${dm(date)} : ${flights.length ? flights.map((f) => `${f.flightNumber ?? "vol"} ${f.departureTime}${f.status === "CANCELLED" ? " annulé" : ""}`).join(", ") : "aucun vol"}`;
                  return (
                    <td key={date} className="p-0.5 align-top">
                      <button
                        type="button"
                        onClick={() => onDay(date)}
                        aria-label={label}
                        className={cn(
                          "flex h-full min-h-16 w-full flex-col gap-0.5 rounded-md border border-transparent p-1 text-left transition-colors hover:border-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isToday && "border-primary",
                          past && "opacity-55",
                        )}
                      >
                        <span className={cn("text-xs", isToday ? "font-bold text-primary" : "text-muted-foreground")}>
                          {Number(date.slice(8))}
                          {(date.endsWith("-01") || date === workspace.start) && ` ${dm(date).split(" ")[1]}`}
                        </span>
                        {flights.map((f) => (
                          <FlightLine key={f.id} airline={airline.code} f={f} />
                        ))}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
