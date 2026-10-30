import type { Prisma } from "@/lib/generated/prisma/client";

/** What the public may see: active, human-approved, from a published airline. */
export const PUBLIC_PATTERN_FILTER: Prisma.FlightPatternWhereInput = {
  active: true,
  reviewStatus: "APPROVED",
  airline: { isPublished: true },
};
