import { cn } from "@/lib/utils/cn-utils";
import { SITE } from "@/lib/site";

// The mark: a "c" drawn as a flight path that ends on its destination.
// Geometry is shared with app/icon.svg and app/apple-icon.tsx; change all three together.
export const MARK_PATH = "M21.16 21.66 A8 8 0 1 1 17.57 8.27";
export const MARK_DOT = { cx: 23.63, cy: 12, r: 2.3 };

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d={MARK_PATH} fill="none" stroke="white" strokeWidth="3.4" strokeLinecap="round" />
      <circle {...MARK_DOT} fill="white" />
    </svg>
  );
}

/** Mark + wordmark. The wordmark is live text in the brand font, so it stays sharp and costs no bytes. */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className="text-xl font-extrabold tracking-tight text-foreground lowercase">{SITE.name}</span>
    </span>
  );
}
