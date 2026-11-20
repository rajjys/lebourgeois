/**
 * AN-6: hides from the statistics the automated visits recorded before only engaged visits were
 * counted. Nothing is deleted: each matching visit gets `excludedReason = "bot-pattern"`, which the
 * dashboard skips; --undo clears it again.
 *
 * The pattern (19 and 20 Nov 2026: 179 of 193 visits; 10 to 20 Nov: 231 of 349): a desktop visit
 * with no referrer, one batch only (0 s), and nothing but the events a page sends by itself
 * (page_view, route_view, flight_option_view). A person who arrived the same way and left at once
 * is hidden too: about one a day before the bots started.
 *
 *   npx tsx scripts/exclude-bot-visits.ts                                  local, preview
 *   npx tsx scripts/exclude-bot-visits.ts --apply                          local, write
 *   npx tsx scripts/exclude-bot-visits.ts --production [--apply|--undo]    production
 *   --before=2026-11-20T15:00:00Z   only visits started before this instant (default: now). Run it
 *                                   once after the engaged-visits release, with its deploy time.
 */
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { pgConfig } from "../lib/dbConnection";
import { PrismaClient } from "../lib/generated/prisma/client";

const REASON = "bot-pattern";
const AUTOMATIC = ["page_view", "route_view", "flight_option_view"];

const args = process.argv.slice(2);
const production = args.includes("--production");
const apply = args.includes("--apply");
const undo = args.includes("--undo");
const beforeArg = args.find((a) => a.startsWith("--before="))?.split("=")[1];
const before = beforeArg ? new Date(beforeArg) : new Date();
if (Number.isNaN(before.getTime())) throw new Error("--before must be an ISO date-time, e.g. 2026-11-20T15:00:00Z");
if (apply && undo) throw new Error("--apply or --undo, not both");

// Never dotenv/config: .env holds production. Local unless --production says otherwise.
const env = (file: string) => {
  try {
    return parse(readFileSync(file));
  } catch {
    return {};
  }
};
const isLocal = (url: string) => ["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname);
const url = production ? env(".env").DATABASE_URL : env(".env.local").DATABASE_URL;
if (!url) throw new Error(production ? "No DATABASE_URL in .env" : "No DATABASE_URL in .env.local");
if (!production && !isLocal(url)) throw new Error("Without --production the target must be the local database");
if (production && isLocal(url)) throw new Error("--production points at a local database: check .env");

const prisma = new PrismaClient({ adapter: new PrismaPg(pgConfig(url)) });

type Row = { day: string; total: bigint; matching: bigint; hidden: bigint };

async function main() {
  console.log(`Target: ${new URL(url!).hostname} (${production ? "PRODUCTION" : "local"}) · ${apply ? "APPLY" : undo ? "UNDO" : "preview, nothing is changed"}`);
  console.log(`Visits started before ${before.toISOString()}\n`);

  const rows = await prisma.$queryRaw<Row[]>`
    WITH s AS (
      SELECT s.*, (s.device = 'desktop' AND s."referrerHost" IS NULL AND s."lastSeenAt" = s."startedAt"
                   AND NOT EXISTS (SELECT 1 FROM "AnalyticsEvent" e WHERE e."sessionId" = s.id AND e.name <> ALL(${AUTOMATIC}))) AS bot
      FROM "AnalyticsSession" s WHERE s."startedAt" < ${before})
    SELECT to_char(("startedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Kinshasa', 'YYYY-MM-DD') AS day,
           count(*) AS total, count(*) FILTER (WHERE bot) AS matching, count(*) FILTER (WHERE "excludedReason" = ${REASON}) AS hidden
    FROM s GROUP BY 1 ORDER BY 1`;
  console.log("Kinshasa day   visits  bot pattern  hidden now");
  for (const r of rows) console.log(`${r.day}   ${String(r.total).padStart(6)}  ${String(r.matching).padStart(11)}  ${String(r.hidden).padStart(10)}`);
  const sum = (k: keyof Row) => rows.reduce((n, r) => n + Number(r[k]), 0);
  console.log(`Total          ${String(sum("total")).padStart(6)}  ${String(sum("matching")).padStart(11)}  ${String(sum("hidden")).padStart(10)}\n`);

  if (apply) {
    const n = await prisma.$executeRaw`
      UPDATE "AnalyticsSession" s SET "excludedReason" = ${REASON}
      WHERE s."startedAt" < ${before} AND s."excludedReason" IS NULL
        AND s.device = 'desktop' AND s."referrerHost" IS NULL AND s."lastSeenAt" = s."startedAt"
        AND NOT EXISTS (SELECT 1 FROM "AnalyticsEvent" e WHERE e."sessionId" = s.id AND e.name <> ALL(${AUTOMATIC}))`;
    console.log(`Hidden ${n} visits (excludedReason = "${REASON}"). Undo: the same command with --undo instead of --apply.`);
  } else if (undo) {
    const n = await prisma.$executeRaw`UPDATE "AnalyticsSession" SET "excludedReason" = NULL WHERE "excludedReason" = ${REASON} AND "startedAt" < ${before}`;
    console.log(`Restored ${n} visits.`);
  } else {
    console.log("Preview only. Run again with --apply to hide the matching visits (or --undo to restore them).");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
