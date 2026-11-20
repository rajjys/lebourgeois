/**
 * What went wrong in a write, in terms the back office can show.
 * Prisma reports duplicates and missing rows itself; a delete blocked by a foreign key
 * comes back from the pg adapter as the raw Postgres code (23001 restrict, 23503 foreign key).
 */
export function dbErrorKind(err: unknown): "duplicate" | "inUse" | "notFound" | undefined {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  if (e?.code === "P2002") return "duplicate";
  if (e?.code === "P2025") return "notFound";
  if (e?.code === "P2003" || e?.cause?.code === "23001" || e?.cause?.code === "23503") return "inUse";
  return undefined;
}

/** After a back-office write: public pages read fresh data (O-14, lib/publicDb.ts). */
export { refreshPublicPages } from "@/lib/publicDb";
