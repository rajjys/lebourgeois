import { cn } from "@/lib/utils/cn-utils";

/** Airline identity without logos (no rights to use them yet): IATA code + name. */
export function AirlineMark({ code, name, className }: { code: string; name?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="inline-flex h-6 min-w-8 items-center justify-center rounded-sm border bg-muted px-1 text-xs font-bold tracking-wide text-foreground">
        {code}
      </span>
      {name && <span className="text-sm font-medium text-foreground">{name}</span>}
    </span>
  );
}
