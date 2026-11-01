import Image from "next/image";
import { cn } from "@/lib/utils/cn-utils";

/** Airline identity: its logo when we have one (owner, 2026-10-31), otherwise its IATA code; then its name. */
export function AirlineMark({ code, name, logo, className }: { code: string; name?: string; logo?: string | null; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {logo ? (
        <span className="relative inline-flex h-6 w-12 shrink-0 overflow-hidden rounded-sm border bg-white" aria-hidden={name ? true : undefined}>
          <Image src={logo} alt={name ? "" : code} fill unoptimized sizes="48px" className="object-contain p-0.5" />
        </span>
      ) : (
        <span className="inline-flex h-6 min-w-8 items-center justify-center rounded-sm border bg-muted px-1 text-xs font-bold tracking-wide text-foreground">
          {code}
        </span>
      )}
      {name && <span className="text-sm font-medium text-foreground">{name}</span>}
    </span>
  );
}
