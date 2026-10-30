import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn-utils";

// The arrow is an icon: the brand font's latin subset has no "→" glyph.
export function RouteTitle({
  origin,
  destination,
  as: Tag = "h1",
  className,
}: {
  origin: string;
  destination: string;
  as?: "h1" | "h2" | "h3" | "span";
  className?: string;
}) {
  return (
    <Tag className={cn("inline-flex flex-wrap items-center gap-x-2 font-bold tracking-tight text-foreground", className)}>
      <span>{origin}</span>
      <ArrowRight className="size-[0.8em] shrink-0 text-primary" aria-hidden="true" />
      <span className="sr-only">à</span>
      <span>{destination}</span>
    </Tag>
  );
}
