/**
 * Publishes an airline on the routes where it has flights from a given source, in one go
 * (owner, 2026-11-01: "publish Air Congo, the ones from the schedule"). The same switch as
 * "Publiée" in the route workspace, logged in each route's history.
 *
 *   npx tsx scripts/publish-route-airlines.ts --airline=4H                          local, preview
 *   npx tsx scripts/publish-route-airlines.ts --production --airline=4H --apply     production
 * --source=<url> narrows to flights from that source (default: any flight).
 */
import { readFileSync } from "node:fs";
import { config, parse } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const production = process.argv.includes("--production");
const apply = process.argv.includes("--apply");
const airline = arg("airline");
const source = arg("source");
if (!airline) throw new Error("--airline=CODE is required");

let url: string | undefined;
if (production) url = parse(readFileSync(".env")).DATABASE_URL;
else {
  config({ path: [".env.local"], quiet: true });
  url = process.env.DATABASE_URL;
  if (url && !["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname)) throw new Error("Not a local database; pass --production");
}
if (!url) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  const targets = await prisma.routeAirline.findMany({
    where: {
      isPublished: false,
      airline: { code: airline },
      flights: { some: source ? { sourceUrl: source } : {} },
    },
    include: { route: { select: { id: true, slug: true } }, _count: { select: { flights: true } } },
    orderBy: { route: { slug: "asc" } },
  });
  console.log(`${new URL(url!).hostname} · ${apply ? "APPLY" : "preview"} · ${airline}${source ? ` · source ${source}` : ""}`);
  for (const t of targets) console.log(`  ${t.route.slug}: ${t._count.flights} flights`);
  console.log(`${targets.length} airline-on-route records to publish.`);
  if (!apply || targets.length === 0) return;
  await prisma.$transaction(
    async (tx) => {
      await tx.routeAirline.updateMany({ where: { id: { in: targets.map((t) => t.id) } }, data: { isPublished: true } });
      await tx.changeLog.createMany({
        data: targets.map((t) => ({
          actor: "script:publish-route-airlines",
          entity: "RouteAirline",
          entityId: t.id,
          action: "UPDATE" as const,
          routeId: t.route.id,
          summary: `${airline} publiée sur ${t.route.slug}`,
          changes: { isPublished: [false, true] },
        })),
      });
    },
    { timeout: 60_000, maxWait: 15_000 },
  );
  console.log("Published.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
