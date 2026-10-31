/**
 * Change history (plan item S-5): who changed what, when. Written in the same transaction
 * as the change it describes, so a write and its log entry succeed or fail together.
 */
import type { ChangeAction, Prisma, PrismaClient } from "./generated/prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export type ChangeEntry = {
  actor: string;
  entity: string;
  entityId: string;
  action: ChangeAction;
  summary: string;
  routeId?: string | null;
  batchId?: string | null;
  changes?: Record<string, unknown> | null;
};

// JSON-safe copy: dates become ISO strings, decimals strings.
const toJson = (value: unknown) => JSON.parse(JSON.stringify(value ?? null));

const SKIPPED = new Set(["createdAt", "updatedAt"]);

/** The fields that changed, as { field: [before, after] }. Timestamps are left out. */
export function changedFields(before: object, after: object): Record<string, [unknown, unknown]> {
  const was = before as Record<string, unknown>;
  const now = after as Record<string, unknown>;
  const out: Record<string, [unknown, unknown]> = {};
  for (const key of Object.keys(now)) {
    if (SKIPPED.has(key)) continue;
    const a = toJson(was[key]);
    const b = toJson(now[key]);
    if (JSON.stringify(a) !== JSON.stringify(b)) out[key] = [a, b];
  }
  return out;
}

/** A record as stored in `changes` for a creation or a deletion. */
export const snapshot = (record: object) => toJson(record) as Prisma.InputJsonObject;

export function logChange(db: Db, entry: ChangeEntry) {
  const { changes, ...rest } = entry;
  return db.changeLog.create({ data: { ...rest, changes: changes ? toJson(changes) : undefined } });
}
