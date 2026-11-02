/**
 * The public type scale (docs/DESIGN-SYSTEM.md §5), written phone size first. Headings take their
 * size from here instead of retyping classes, so a title is the same size on every page.
 * Phones get the smaller step (P-17, owner 2026-11-02: text was larger than needed and pushed the
 * data below the first screen); from 640px the sizes grow back to the v1 scale.
 */
export const TYPE = {
  /** Home hero only: 30 → 48 → 60. */
  display: "text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl",
  /** The one h1 of a page: 24 → 30 → 36. */
  title: "text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl",
  /** Section headings on landing pages (home, about): 20 → 24 → 30. */
  headline: "text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl",
  /** Section headings (h2) on data pages (route, airline, hub): 18 → 20. */
  section: "text-lg font-bold tracking-tight sm:text-xl",
  /** The answer or intro line under a title: 16 → 18. */
  lead: "text-base text-neutral-700 sm:text-lg",
} as const;
